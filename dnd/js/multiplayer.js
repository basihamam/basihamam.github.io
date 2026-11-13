/* ===================================
   MULTIPLAYER P2P ROOM MODULE (PeerJS)
   Sunucusuz, Doğrudan Eşten Eşe (P2P) Oda Sistemi
   =================================== */

const Multiplayer = {
  peer: null,
  isHost: false,
  roomCode: null,
  connections: [], // Host için: bağlanan istemciler
  hostConn: null,  // Client için: host bağlantısı
  party: [],       // Odadaki tüm oyuncular [{ id, name, race, class, hp, maxHp, portrait, isHost }]

  init() {
    this.renderLobbyUI();
  },

  // Benzersiz 5 Karakterli Oda Kodu Üret
  generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'DND-';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  },

  // 1. ODA KUR (HOST)
  createRoom() {
    const char = Adventure.character || CharacterCreate.data;
    if (!char || !char.name) {
      alert("Önce bir karakter oluşturmalı veya seçmelisin!");
      return;
    }

    const code = this.generateRoomCode();
    this.roomCode = code;
    this.isHost = true;
    this.connections = [];

    const statusEl = document.getElementById('lobby-status');
    if (statusEl) statusEl.innerHTML = `<span class="loading-spin">⏳</span> Oda açılıyor (${code})...`;

    try {
      // PeerJS başlat (özel ID: basihamam-dnd-ROOMCODE)
      const peerId = `basihamam-dnd-${code.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      this.peer = new Peer(peerId, {
        debug: 1
      });

      this.peer.on('open', (id) => {
        console.log('Host Peer hazır:', id);
        this.party = [{
          id: id,
          name: char.name,
          race: char.raceName || char.race,
          class: char.className || char.class,
          hp: char.hp,
          maxHp: char.maxHp,
          ac: char.ac,
          portrait: char.portrait,
          isHost: true
        }];

        this.showInRoomUI(true);
      });

      // İstemci bağlandığında
      this.peer.on('connection', (conn) => {
        console.log('Yeni oyuncu bağlandı:', conn.peer);
        this.connections.push(conn);

        conn.on('open', () => {
          // Yeni oyuncuya güncel grup ve hikaye durumunu gönder
          conn.send({
            type: 'SYNC_STATE',
            party: this.party,
            history: Adventure.history,
            roomCode: this.roomCode
          });
        });

        conn.on('data', (data) => {
          this.handleHostData(conn, data);
        });

        conn.on('close', () => {
          this.connections = this.connections.filter(c => c !== conn);
          this.party = this.party.filter(p => p.id !== conn.peer);
          this.broadcast({ type: 'PARTY_UPDATE', party: this.party });
          this.renderPartyList();
        });
      });

      this.peer.on('error', (err) => {
        console.error('Peer hatası:', err);
        if (err.type === 'unavailable-id') {
          // Kod çakışması, tekrar dene
          this.createRoom();
        } else {
          alert('Oda kurulamadı: ' + err.message);
        }
      });
    } catch (e) {
      alert('P2P Hatası: ' + e.message);
    }
  },

  // 2. ODAYA KATIL (CLIENT)
  joinRoom(code) {
    const char = Adventure.character || CharacterCreate.data;
    if (!char || !char.name) {
      alert("Önce bir karakter oluşturmalı veya seçmelisin!");
      return;
    }

    const cleanCode = (code || document.getElementById('join-room-code')?.value || '').trim().toUpperCase();
    if (!cleanCode) {
      alert("Lütfen bir oda kodu gir!");
      return;
    }

    this.roomCode = cleanCode;
    this.isHost = false;

    const statusEl = document.getElementById('lobby-status');
    if (statusEl) statusEl.innerHTML = `<span class="loading-spin">⏳</span> Odaya bağlanılıyor (${cleanCode})...`;

    try {
      this.peer = new Peer({ debug: 1 });

      this.peer.on('open', (myId) => {
        const targetHostId = `basihamam-dnd-${cleanCode.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
        console.log('Host aranıyor:', targetHostId);

        const conn = this.peer.connect(targetHostId, { reliable: true });
        this.hostConn = conn;

        conn.on('open', () => {
          console.log('Host ile bağlantı kuruldu!');
          // Host'a karakter bilgilerimizi ilet
          conn.send({
            type: 'JOIN_REQUEST',
            player: {
              id: myId,
              name: char.name,
              race: char.raceName || char.race,
              class: char.className || char.class,
              hp: char.hp,
              maxHp: char.maxHp,
              ac: char.ac,
              portrait: char.portrait,
              isHost: false
            }
          });

          this.showInRoomUI(false);
        });

        conn.on('data', (data) => {
          this.handleClientData(data);
        });

        conn.on('error', (err) => {
          alert('Odaya bağlanırken hata oluştu: ' + err.message);
        });
      });

      this.peer.on('error', (err) => {
        alert('Bağlantı hatası: ' + err.message);
      });
    } catch (e) {
      alert('Bağlantı başlatılamadı: ' + e.message);
    }
  },

  // Host Gelen Veri Yönetimi
  handleHostData(senderConn, data) {
    if (data.type === 'JOIN_REQUEST') {
      this.party.push(data.player);
      this.broadcast({ type: 'PARTY_UPDATE', party: this.party });
      this.renderPartyList();
      Adventure.addSystemMessage(`👋 <strong>${data.player.name}</strong> (${data.player.race} ${data.player.class}) odaya katıldı!`);
    } else if (data.type === 'CHAT_MESSAGE') {
      // Mesajı herkese yay
      this.broadcast(data);
      Adventure.renderPlayerBubble(`${data.playerName}: ${data.text}`);
    } else if (data.type === 'DICE_ROLL') {
      this.broadcast(data);
      Adventure.addSystemMessage(`🎲 <strong>${data.playerName}</strong> zar attı: ${data.label} = <strong>${data.val}</strong>`);
    } else if (data.type === 'ACTION_TRIGGER') {
      // Bir oyuncu eylem yaptı, Host AI'dan yanıt alıp herkese dağıtır
      Adventure.renderPlayerBubble(`${data.playerName}: ${data.text}`);
      this.broadcast({ type: 'CHAT_MESSAGE', playerName: data.playerName, text: data.text });
      // Host AI'yı çalıştırır
      Adventure.sendActionForParty(data.playerName, data.text);
    }
  },

  // Client Gelen Veri Yönetimi
  handleClientData(data) {
    if (data.type === 'SYNC_STATE' || data.type === 'PARTY_UPDATE') {
      this.party = data.party || [];
      this.renderPartyList();
      if (data.history && Adventure.history.length === 0) {
        Adventure.history = data.history;
        const msgBox = document.getElementById('story-messages');
        if (msgBox) {
          msgBox.innerHTML = '';
          data.history.forEach(m => {
            if (m.role === 'dm') Adventure.renderDMBubble(m.text);
            else Adventure.renderPlayerBubble(m.text);
          });
        }
      }
    } else if (data.type === 'DM_MESSAGE') {
      Adventure.addDMMessage(data.text);
    } else if (data.type === 'CHAT_MESSAGE') {
      if (data.playerName !== (Adventure.character?.name)) {
        Adventure.renderPlayerBubble(`${data.playerName}: ${data.text}`);
      }
    } else if (data.type === 'DICE_ROLL') {
      Adventure.addSystemMessage(`🎲 <strong>${data.playerName}</strong> zar attı: ${data.label} = <strong>${data.val}</strong>`);
    } else if (data.type === 'SYSTEM_MESSAGE') {
      Adventure.addSystemMessage(data.html);
    }
  },

  // Host: Tüm Odadakilere Veri Gönder
  broadcast(data) {
    this.connections.forEach(conn => {
      if (conn.open) {
        conn.send(data);
      }
    });
  },

  // Client: Host'a Veri Gönder
  sendToHost(data) {
    if (this.hostConn && this.hostConn.open) {
      this.hostConn.send(data);
    }
  },

  // UI Arayüzleri
  renderLobbyUI() {
    const container = document.getElementById('lobby-container');
    if (!container) return;

    container.innerHTML = `
      <div class="lobby-card">
        <h3>👥 Çok Oyunculu Macera Odası</h3>
        <p class="text-muted" style="font-size:13px;margin-bottom:16px">Arkadaşlarınla aynı masada toplan, herkes kendi karakteriyle aynı AI Dungeon Master'a karşı oynasın!</p>
        
        <div class="lobby-actions-grid">
          <div class="lobby-box">
            <h4>⚔️ Yeni Oda Kur</h4>
            <p>Oda kurucusu olursun. Arkadaşlarına oda kodunu ver, hemen katılsınlar.</p>
            <button class="btn btn-primary btn-block" onclick="Multiplayer.createRoom()">
              👑 Oda Oluştur
            </button>
          </div>

          <div class="lobby-box">
            <h4>🗝️ Odaya Katıl</h4>
            <p>Arkadaşının sana verdiği 4-6 haneli oda kodunu gir.</p>
            <div class="input-with-btn">
              <input type="text" id="join-room-code" placeholder="Örn: DND-7482" style="text-transform:uppercase">
              <button class="btn btn-secondary" onclick="Multiplayer.joinRoom()">Giriş</button>
            </div>
          </div>
        </div>

        <div id="lobby-status" class="lobby-status-msg"></div>
      </div>
    `;
  },

  showInRoomUI(isHost) {
    const container = document.getElementById('lobby-container');
    if (!container) return;

    container.innerHTML = `
      <div class="in-room-card">
        <div class="in-room-header">
          <div>
            <span class="badge" style="background:var(--accent);color:#000;font-weight:800">ODA KODU</span>
            <h2 class="room-code-display">${this.roomCode}</h2>
          </div>
          <button class="btn btn-sm btn-ghost" onclick="Multiplayer.copyRoomLink()">📋 Kodu Kopyala</button>
        </div>

        <p class="text-muted" style="font-size:13px">Bu kodu arkadaşlarına gönder. Katıldıklarında aşağıdaki grupta görünecekler.</p>

        <div class="party-members-list" id="party-members-list">
          <!-- JS ile dolacak -->
        </div>

        <div class="room-action-bar">
          <button class="btn btn-primary btn-lg" onclick="App.showScreen('screen-adventure'); Multiplayer.syncGameStart();">
            🗡️ Maceraya Gir / Devam Et
          </button>
          <button class="btn btn-ghost" onclick="Multiplayer.leaveRoom()">Odadan Ayrıl</button>
        </div>
      </div>
    `;

    this.renderPartyList();
  },

  renderPartyList() {
    const list = document.getElementById('party-members-list');
    const sideList = document.getElementById('adventure-party-members');

    const html = this.party.map(p => `
      <div class="party-member-chip">
        <div class="party-avatar">
          ${p.portrait ? `<img src="${p.portrait}">` : '🛡️'}
        </div>
        <div class="party-member-details">
          <span class="party-name">${p.name} ${p.isHost ? '👑' : ''}</span>
          <span class="party-sub">${p.race || ''} ${p.class || ''} &bull; ❤️ ${p.hp}/${p.maxHp} HP</span>
        </div>
      </div>
    `).join('');

    if (list) list.innerHTML = html;
    if (sideList) sideList.innerHTML = html;
  },

  copyRoomLink() {
    navigator.clipboard.writeText(this.roomCode).then(() => {
      alert(`Oda Kodu Kopyalandı: ${this.roomCode}`);
    }).catch(() => {
      alert(`Oda Kodu: ${this.roomCode}`);
    });
  },

  syncGameStart() {
    if (this.isHost) {
      this.broadcast({ type: 'SYSTEM_MESSAGE', html: '🚀 <strong>Oda Lideri macerayı başlattı!</strong>' });
    }
  },

  leaveRoom() {
    if (this.peer) this.peer.destroy();
    this.peer = null;
    this.party = [];
    this.roomCode = null;
    this.isHost = false;
    this.renderLobbyUI();
  }
};
