/* ===================================
   MULTIPLAYER P2P ROOM MODULE (V3)
   - Host Yetkisi (Macerayı Sadece Host Başlatır)
   - Hazır (Ready) Sistemi
   - Sıra Tabanlı Grup Eylem Havuzu (Action Queue)
   - Zar İsteme & Bekleme Döngüsü (Dice Roll Request Gate)
   - Hikaye Dışa Aktarma & Kaydetme
   =================================== */

const Multiplayer = {
  peer: null,
  isHost: false,
  roomCode: null,
  connections: [], // Host için: bağlanan istemciler
  hostConn: null,  // Client için: host bağlantısı
  party: [],       // Odadaki tüm oyuncular [{ id, name, race, class, hp, maxHp, portrait, isHost, isReady, currentAction }]
  
  // Tur Eylem Havuzu (Action Queue)
  pendingActions: {}, // { [playerId]: actionText }
  waitingForDice: null, // { targetPlayerName, diceType, reason, resolveCallback }

  init() {
    this.renderLobbyUI();
  },

  generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'DND-';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  },

  // ================= 1. ODA KUR (HOST) =================
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
    this.pendingActions = {};
    this.waitingForDice = null;

    const statusEl = document.getElementById('lobby-status');
    if (statusEl) statusEl.innerHTML = `<span class="loading-spin">⏳</span> Oda kuruluyor (${code})...`;

    try {
      const peerId = `basihamam-dnd-${code.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      this.peer = new Peer(peerId, { debug: 1 });

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
          isHost: true,
          isReady: true // Host her zaman hazır
        }];

        this.showInRoomUI(true);
      });

      this.peer.on('connection', (conn) => {
        this.connections.push(conn);

        conn.on('open', () => {
          conn.send({
            type: 'SYNC_STATE',
            party: this.party,
            history: Adventure.history,
            roomCode: this.roomCode,
            isGameStarted: Adventure.isGameStarted || false
          });
        });

        conn.on('data', (data) => {
          this.handleHostData(conn, data);
        });

        conn.on('close', () => {
          this.connections = this.connections.filter(c => c !== conn);
          this.party = this.party.filter(p => p.id !== conn.peer);
          delete this.pendingActions[conn.peer];
          this.broadcast({ type: 'PARTY_UPDATE', party: this.party });
          this.renderPartyList();
          this.updateTurnActionStatus();
        });
      });

      this.peer.on('error', (err) => {
        console.error('Peer hatası:', err);
        if (err.type === 'unavailable-id') {
          this.createRoom();
        } else {
          alert('Oda kurulamadı: ' + err.message);
        }
      });
    } catch (e) {
      alert('P2P Hatası: ' + e.message);
    }
  },

  // ================= 2. ODAYA KATIL (CLIENT) =================
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
        const conn = this.peer.connect(targetHostId, { reliable: true });
        this.hostConn = conn;

        conn.on('open', () => {
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
              isHost: false,
              isReady: false
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

  // ================= HOST VERİ YÖNETİMİ =================
  handleHostData(senderConn, data) {
    if (data.type === 'JOIN_REQUEST') {
      this.party.push(data.player);
      this.broadcast({ type: 'PARTY_UPDATE', party: this.party });
      this.renderPartyList();
      Adventure.addSystemMessage(`👋 <strong>${data.player.name}</strong> odaya katıldı!`);
    } else if (data.type === 'TOGGLE_READY') {
      const p = this.party.find(x => x.id === senderConn.peer);
      if (p) {
        p.isReady = data.isReady;
        this.broadcast({ type: 'PARTY_UPDATE', party: this.party });
        this.renderPartyList();
      }
    } else if (data.type === 'SUBMIT_ACTION') {
      // Bir oyuncu turdaki eylemini yazdı
      this.pendingActions[senderConn.peer] = {
        name: data.playerName,
        text: data.text
      };
      Adventure.renderPlayerBubble(`${data.playerName}: ${data.text}`);
      this.broadcast({
        type: 'ACTION_RECORDED',
        playerName: data.playerName,
        text: data.text,
        pendingCount: Object.keys(this.pendingActions).length,
        totalCount: this.party.length
      });
      this.updateTurnActionStatus();
      this.checkAllActionsSubmitted();
    } else if (data.type === 'DICE_ROLLED') {
      // Bir oyuncu zar attı
      Adventure.addSystemMessage(`🎲 <strong>${data.playerName}</strong> zar attı: ${data.label} = <strong>${data.val}</strong>`);
      this.broadcast(data);

      // Eğer bu zar bir zar isteğine yanıt ise
      if (this.waitingForDice && this.waitingForDice.targetPlayerName === data.playerName) {
        const waiting = this.waitingForDice;
        this.waitingForDice = null;
        this.broadcast({ type: 'DICE_GATE_RESOLVED' });
        Adventure.hideDiceGatePrompt();
        // DM'e zar sonucunu ilet ve hikayeyi devam ettir
        Adventure.resolveDiceGate(waiting.targetPlayerName, waiting.reason, data.val);
      }
    }
  },

  // ================= CLIENT VERİ YÖNETİMİ =================
  handleClientData(data) {
    if (data.type === 'SYNC_STATE' || data.type === 'PARTY_UPDATE') {
      this.party = data.party || [];
      this.renderPartyList();
      if (data.isGameStarted && App.currentScreen !== 'screen-adventure') {
        App.showScreen('screen-adventure');
        App.switchTab('story');
      }
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
    } else if (data.type === 'GAME_STARTED') {
      App.showScreen('screen-adventure');
      App.switchTab('story');
      Adventure.addSystemMessage(`⚔️ <strong>Oda Lideri oyunu başlattı! İyi şanslar!</strong>`);
    } else if (data.type === 'DM_MESSAGE') {
      Adventure.addDMMessage(data.text);
      Adventure.resetTurnActionInput();
    } else if (data.type === 'ACTION_RECORDED') {
      if (data.playerName !== Adventure.character?.name) {
        Adventure.renderPlayerBubble(`${data.playerName}: ${data.text}`);
      }
      Adventure.setTurnActionStatus(data.pendingCount, data.totalCount);
    } else if (data.type === 'DICE_ROLLED') {
      Adventure.addSystemMessage(`🎲 <strong>${data.playerName}</strong> zar attı: ${data.label} = <strong>${data.val}</strong>`);
    } else if (data.type === 'DICE_REQUEST_GATE') {
      // DM bir oyuncudan zar istedi!
      this.waitingForDice = data;
      Adventure.showDiceGatePrompt(data.targetPlayerName, data.reason, data.diceType);
    } else if (data.type === 'DICE_GATE_RESOLVED') {
      this.waitingForDice = null;
      Adventure.hideDiceGatePrompt();
    }
  },

  broadcast(data) {
    this.connections.forEach(conn => {
      if (conn.open) conn.send(data);
    });
  },

  sendToHost(data) {
    if (this.hostConn && this.hostConn.open) {
      this.hostConn.send(data);
    }
  },

  // ================= HAZIR & BAŞLATMA MEKANİĞİ =================
  toggleMyReady() {
    const myId = this.peer?.id;
    const me = this.party.find(p => p.id === myId || (!p.isHost && !this.isHost));
    const nextState = me ? !me.isReady : true;
    if (me) me.isReady = nextState;

    this.sendToHost({ type: 'TOGGLE_READY', isReady: nextState });
    this.renderPartyList();
  },

  hostStartGame() {
    if (!this.isHost) return;

    // Oyunu başlat
    Adventure.isGameStarted = true;
    this.broadcast({ type: 'GAME_STARTED' });
    App.showScreen('screen-adventure');
    App.switchTab('story');

    // Başlangıç sahnesi
    Adventure.launchAdventure();
  },

  // ================= TUR EYLEM HAVUZU (HERKES YAZMADAN DM CEVAP VERMEZ) =================
  submitTurnAction(actionText) {
    const charName = Adventure.character?.name || 'Maceracı';

    if (this.isHost) {
      this.pendingActions[this.peer.id] = { name: charName, text: actionText };
      Adventure.renderPlayerBubble(`${charName}: ${actionText}`);
      this.broadcast({
        type: 'ACTION_RECORDED',
        playerName: charName,
        text: actionText,
        pendingCount: Object.keys(this.pendingActions).length,
        totalCount: this.party.length
      });
      this.updateTurnActionStatus();
      this.checkAllActionsSubmitted();
    } else {
      this.sendToHost({
        type: 'SUBMIT_ACTION',
        playerName: charName,
        text: actionText
      });
      Adventure.renderPlayerBubble(`${charName}: ${actionText}`);
      Adventure.disableTurnInput("Eylemin iletildi. Diğer oyuncular bekleniyor...");
    }
  },

  updateTurnActionStatus() {
    const submitted = Object.keys(this.pendingActions).length;
    const total = Math.max(1, this.party.length);
    Adventure.setTurnActionStatus(submitted, total);
  },

  checkAllActionsSubmitted() {
    if (!this.isHost) return;

    const total = Math.max(1, this.party.length);
    const submitted = Object.keys(this.pendingActions).length;

    if (submitted >= total) {
      // Herkes yazdı! Tüm eylemleri birleştirip DM'e gönder
      this.triggerDMTurn();
    }
  },

  // Host istenirse turu hemen tetikleyebilir
  forceTriggerDMTurn() {
    if (!this.isHost) return;
    this.triggerDMTurn();
  },

  async triggerDMTurn() {
    const actions = Object.values(this.pendingActions);
    if (actions.length === 0) return;

    // Eylem özetini oluştur
    let turnPrompt = "BU TURDA OYUNCULARIN YAPTIĞI EYLEMLER:\n";
    actions.forEach(a => {
      turnPrompt += `- ${a.name}: "${a.text}"\n`;
    });
    turnPrompt += `\nLÜTFEN TÜM BU EYLEMLERİ D&D 5E KURALLARINA GÖRE DEĞERLENDİR.
Eğer bir oyuncunun eylemi (örneğin kilit açma, kapı kırma, gizlenme, büyü yapma veya saldırı) bir D&D ZARI gerektiriyorsa,
ve henüz zar atılmamışsa, yanıtının en başında tam olarak şu formatta bir etiket yaz:
[ZAR İSTEĞİ: OyuncuAdı | d20+Stat | DC X | Sebep]
Ardından sahnenin o anki gerilimini tarif et.`;

    // Havuzu temizle
    this.pendingActions = {};
    this.updateTurnActionStatus();

    Adventure.showTypingIndicator();
    try {
      const dmReply = await AIEngine.sendMessage(Adventure.history, turnPrompt, Adventure.character);
      Adventure.hideTypingIndicator();

      // DM yanıtında Zar İsteği var mı kontrol et!
      const diceMatch = dmReply.match(/\[ZAR İSTEĞİ:\s*([^|\]]+)\|\s*([^|\]]+)(?:\|\s*([^|\]]+))?\|\s*([^\]]+)\]/i);

      if (diceMatch) {
        const targetPlayer = diceMatch[1].trim();
        const diceType = diceMatch[2].trim();
        const reason = diceMatch[4]?.trim() || diceMatch[3]?.trim() || 'Kontrol';

        // Temiz metni göster
        const cleanReply = dmReply.replace(/\[ZAR İSTEĞİ:[^\]]+\]/g, '').trim();
        Adventure.addDMMessage(cleanReply);
        this.broadcast({ type: 'DM_MESSAGE', text: cleanReply });

        // Zar İsteme Kapısını Aç
        this.waitingForDice = { targetPlayerName: targetPlayer, diceType, reason };
        Adventure.showDiceGatePrompt(targetPlayer, reason, diceType);
        this.broadcast({
          type: 'DICE_REQUEST_GATE',
          targetPlayerName: targetPlayer,
          diceType: diceType,
          reason: reason
        });
      } else {
        // Normal yanıt
        Adventure.addDMMessage(dmReply);
        this.broadcast({ type: 'DM_MESSAGE', text: dmReply });
      }

      Adventure.resetTurnActionInput();
      Adventure.saveCurrentCampaign();
    } catch (e) {
      Adventure.hideTypingIndicator();
      Adventure.addSystemMessage(`⚠️ <strong>DM Hatası:</strong> ${e.message}`);
    }
  },

  // ================= UI GÖSTERİMLERİ =================
  renderLobbyUI() {
    const container = document.getElementById('lobby-container');
    if (!container) return;

    container.innerHTML = `
      <div class="lobby-card">
        <h3>👥 Çok Oyunculu Macera Odası</h3>
        <p class="text-muted" style="font-size:13px;margin-bottom:16px">Arkadaşlarınla aynı masada toplan, herkes kendi karakteriyle aynı AI Dungeon Master'a karşı oynasın!</p>
        
        <div class="lobby-actions-grid">
          <div class="lobby-box">
            <h4>👑 Yeni Oda Kur (Oda Lideri)</h4>
            <p>Macerayı başlatma yetkisi sende olur. Arkadaşlarına oda kodunu ver, katılsınlar.</p>
            <button class="btn btn-primary btn-block btn-lg" onclick="Multiplayer.createRoom()">
              ⚔️ Oda Oluştur
            </button>
          </div>

          <div class="lobby-box">
            <h4>🗝️ Odaya Katıl</h4>
            <p>Arkadaşının kurduğu odanın 4-6 haneli kodunu gir.</p>
            <div class="input-with-btn">
              <input type="text" id="join-room-code" placeholder="Örn: DND-7482" style="text-transform:uppercase">
              <button class="btn btn-secondary btn-lg" onclick="Multiplayer.joinRoom()">Katıl</button>
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

        <p class="text-muted" style="font-size:13px">Arkadaşlarına bu kodu ver. Katıldıklarında listede görünecekler.</p>

        <div class="party-members-list" id="party-members-list">
          <!-- JS ile dolacak -->
        </div>

        <div class="room-action-bar" style="margin-top:20px;display:flex;flex-direction:column;gap:10px">
          ${isHost ? `
            <button class="btn btn-primary btn-lg btn-block" onclick="Multiplayer.hostStartGame()">
              🚀 Macerayı Başlat (Tüm Grubu Sok)
            </button>
          ` : `
            <button class="btn btn-secondary btn-lg btn-block" id="btn-toggle-ready" onclick="Multiplayer.toggleMyReady()">
              ✅ Hazırım!
            </button>
            <p style="font-size:12px;color:var(--text-muted);text-align:center">Oda Lideri oyunu başlattığında otomatik gireceksin.</p>
          `}
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
      <div class="party-member-chip ${p.isReady ? 'ready' : ''}">
        <div class="party-avatar">
          ${p.portrait ? `<img src="${p.portrait}">` : '🛡️'}
        </div>
        <div class="party-member-details" style="flex:1">
          <span class="party-name">${p.name} ${p.isHost ? '👑 (Lider)' : ''}</span>
          <span class="party-sub">${p.race || ''} ${p.class || ''} &bull; ❤️ ${p.hp}/${p.maxHp} HP</span>
        </div>
        <div class="party-status-badge">
          ${p.isHost ? '<span class="badge" style="background:var(--accent);color:#000">Lider</span>' : 
            p.isReady ? '<span class="badge" style="background:var(--success);color:#000">🟢 Hazır</span>' : 
            '<span class="badge" style="background:var(--border)">⏳ Bekleniyor</span>'}
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

  leaveRoom() {
    if (this.peer) this.peer.destroy();
    this.peer = null;
    this.party = [];
    this.roomCode = null;
    this.isHost = false;
    this.renderLobbyUI();
  }
};
