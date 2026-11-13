/* ===================================
   MAIN APPLICATION ORCHESTRATOR (V3)
   - Sıra Tabanlı Grup Eylemleri & Tur Durum Barı
   - DM Zar İsteme Kapısı (Dice Roll Request Gate)
   - Hikaye Kaydetme & Dışa Aktarma (JSON / HTML Günlük)
   =================================== */

const App = {
  currentScreen: 'screen-loading',
  currentTab: 'story',

  async init() {
    this.createParticles();
    this.loadSettings();

    try {
      await Storage.openDB();
    } catch (e) {
      console.warn("IndexedDB açılamadı:", e);
    }

    CharacterCreate.init();
    Multiplayer.init();

    setTimeout(() => {
      this.showScreen('screen-menu');
    }, 600);
  },

  showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(screenId);
    if (target) {
      target.classList.add('active');
      this.currentScreen = screenId;
    }

    const bottomNav = document.getElementById('mobile-bottom-nav');
    if (bottomNav) {
      bottomNav.style.display = screenId === 'screen-adventure' ? 'flex' : 'none';
    }
  },

  switchTab(tab) {
    this.currentTab = tab;
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.tab === tab);
    });

    const storyArea = document.getElementById('story-area');
    const inputArea = document.querySelector('.adventure-input');
    const sidebar = document.getElementById('adventure-sidebar');
    const lobbyOverlay = document.getElementById('adventure-lobby-modal');

    if (sidebar) sidebar.style.display = 'none';
    if (lobbyOverlay) lobbyOverlay.style.display = 'none';

    if (tab === 'story') {
      if (storyArea) storyArea.style.display = 'block';
      if (inputArea) inputArea.style.display = 'block';
    } else if (tab === 'sheet') {
      if (sidebar) {
        sidebar.style.display = 'block';
        sidebar.classList.add('mobile-full');
      }
      Adventure.renderSidebar();
    } else if (tab === 'party') {
      if (lobbyOverlay) lobbyOverlay.style.display = 'flex';
      Multiplayer.renderPartyList();
    } else if (tab === 'settings') {
      this.showScreen('screen-settings');
    }
  },

  createParticles() {
    const container = document.getElementById('particles');
    if (!container) return;
    container.innerHTML = '';
    for (let i = 0; i < 20; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      p.style.left = `${Math.random() * 100}%`;
      p.style.animationDelay = `${Math.random() * 4}s`;
      p.style.animationDuration = `${3 + Math.random() * 4}s`;
      container.appendChild(p);
    }
  },

  loadSettings() {
    const s = Storage.getSettings();
    const providerEl = document.getElementById('ai-provider');
    const keyEl = document.getElementById('api-key');
    const modelEl = document.getElementById('ai-model');
    const themeEl = document.getElementById('theme-select');

    if (providerEl) providerEl.value = s.apiProvider || 'gemini';
    if (keyEl) keyEl.value = s.apiKey || '';
    if (modelEl) modelEl.value = s.aiModel || 'gemini-2.5-flash';
    if (themeEl) themeEl.value = s.theme || 'dark';

    this.setTheme(s.theme || 'dark');
  },

  saveSettings() {
    const settings = {
      apiProvider: document.getElementById('ai-provider')?.value || 'gemini',
      apiKey: document.getElementById('api-key')?.value.trim() || '',
      aiModel: document.getElementById('ai-model')?.value || 'gemini-2.5-flash',
      theme: document.getElementById('theme-select')?.value || 'dark',
      lang: 'tr'
    };
    Storage.saveSettings(settings);
    alert('Ayarlar başarıyla kaydedildi! 🛡️');
  },

  setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
  },

  toggleApiKeyVisibility() {
    const keyInput = document.getElementById('api-key');
    if (keyInput) keyInput.type = keyInput.type === 'password' ? 'text' : 'password';
  },

  async testAI() {
    const resEl = document.getElementById('ai-test-result');
    const provider = document.getElementById('ai-provider')?.value || 'gemini';
    const key = document.getElementById('api-key')?.value.trim();
    const model = document.getElementById('ai-model')?.value;

    resEl.style.display = 'block';
    resEl.className = 'test-result';
    resEl.textContent = 'Yapay zeka ile bağlantı kuruluyor...';

    try {
      const msg = await AIEngine.testConnection(provider, key, model);
      resEl.className = 'test-result success';
      resEl.textContent = '✅ Bağlantı Başarılı: ' + msg;
    } catch (e) {
      resEl.className = 'test-result error';
      resEl.textContent = '❌ ' + e.message;
    }
  },

  async loadSavedCharacters() {
    this.showScreen('screen-saved-chars');
    const list = document.getElementById('saved-chars-list');
    if (!list) return;

    const chars = await Storage.getAllCharacters();
    if (!chars || chars.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <p>🏰 Henüz kayıtlı karakterin yok.</p>
          <button class="btn btn-primary" onclick="App.showScreen('screen-character-create')">Yeni Karakter Yarat</button>
        </div>
      `;
      return;
    }

    list.innerHTML = chars.map(c => `
      <div class="saved-char-card" onclick="Adventure.startFromSaved('${c.id}')">
        <div class="saved-char-portrait">
          ${c.portrait ? `<img src="${c.portrait}" alt="${c.name}">` : '🛡️'}
        </div>
        <div class="saved-char-info">
          <h4>${c.name}</h4>
          <p>${c.raceName || c.race} &bull; ${c.className || c.class} (Lv ${c.level || 1}) &bull; ❤️ ${c.hp}/${c.maxHp} HP</p>
        </div>
        <div class="saved-char-actions">
          <button class="btn btn-sm btn-ghost" onclick="event.stopPropagation(); App.deleteCharacter('${c.id}')" title="Sil">🗑️</button>
        </div>
      </div>
    `).join('');
  },

  async deleteCharacter(id) {
    if (confirm('Bu karakteri silmek istediğine emin misin?')) {
      await Storage.deleteCharacter(id);
      this.loadSavedCharacters();
    }
  }
};

/* ===================================
   ADVENTURE ENGINE (V3)
   =================================== */
const Adventure = {
  character: null,
  history: [],
  campaignId: null,
  isGameStarted: false,

  async start(character) {
    this.character = character;
    this.campaignId = 'camp_' + Date.now();
    this.history = [];
    this.openCampaignModal();
  },

  openCampaignModal() {
    const modal = document.getElementById('campaign-setup-modal');
    if (modal) modal.style.display = 'flex';
    else this.launchAdventure();
  },

  closeCampaignModal() {
    const modal = document.getElementById('campaign-setup-modal');
    if (modal) modal.style.display = 'none';
  },

  async launchAdventure() {
    const theme = document.getElementById('campaign-theme')?.value || 'grimdark';
    const customHook = document.getElementById('campaign-custom-hook')?.value.trim() || '';

    Storage.set('campaign_settings', { theme, customHook });
    this.closeCampaignModal();

    this.isGameStarted = true;
    App.showScreen('screen-adventure');
    App.switchTab('story');
    this.updateTopBar();
    this.renderSidebar();

    let openingPrompt = "Maceraya başlıyoruz. İlk sahneyi ve etrafımızdaki ortamı betimle.";
    if (customHook) {
      openingPrompt = `Oyuna şu hikaye çizgisiyle başlıyoruz: "${customHook}". Bu durumu ve sahneyi atmosferik olarak betimle ve ilk adımı bize bırak.`;
    }

    this.showTypingIndicator();
    try {
      const dmReply = await AIEngine.sendMessage([], openingPrompt, this.character);
      this.hideTypingIndicator();
      this.addDMMessage(dmReply);
      if (Multiplayer.isHost) {
        Multiplayer.broadcast({ type: 'DM_MESSAGE', text: dmReply });
      }
    } catch (err) {
      this.hideTypingIndicator();
      this.addDMMessage(`Sisli gölgelerin uzandığı kadim diyarlara adım atıyorsunuz. Yazgının çağırdığı bu macerada ilk adımlarınızı atıyorsunuz.\n\nNe yapmak istiyorsunuz?`);
    }
  },

  async startFromSaved(id) {
    const char = await Storage.getCharacter(id);
    if (!char) return;
    this.character = char;
    this.isGameStarted = true;
    App.showScreen('screen-adventure');
    App.switchTab('story');
    this.updateTopBar();
    this.renderSidebar();

    const camp = await Storage.getCampaign('camp_' + id);
    if (camp && camp.history && camp.history.length > 0) {
      this.history = camp.history;
      document.getElementById('story-messages').innerHTML = '';
      this.history.forEach(m => {
        if (m.role === 'dm') this.renderDMBubble(m.text);
        else this.renderPlayerBubble(m.text);
      });
    } else {
      this.addDMMessage(`Yeniden hoş geldin, **${this.character.name}**! Maceran kaldığı yerden devam ediyor.`);
    }
  },

  updateTopBar() {
    if (!this.character) return;
    const c = this.character;

    const nameEl = document.getElementById('adv-name');
    const classEl = document.getElementById('adv-class');
    if (nameEl) nameEl.textContent = c.name;
    if (classEl) classEl.textContent = `${c.raceName || ''} ${c.className || ''}`;

    const hpText = `${Math.max(0, c.hp)}/${c.maxHp}`;
    const hpTextEl = document.getElementById('adv-hp-text');
    if (hpTextEl) hpTextEl.textContent = hpText;

    const hpFill = document.getElementById('adv-hp-fill');
    if (hpFill) {
      const hpPct = Math.max(0, Math.min(100, (c.hp / c.maxHp) * 100));
      hpFill.style.width = `${hpPct}%`;
    }

    const portraitEl = document.getElementById('adv-portrait');
    if (portraitEl) {
      portraitEl.innerHTML = c.portrait ? `<img src="${c.portrait}" alt="${c.name}">` : '🗡️';
    }
  },

  renderSidebar() {
    if (!this.character) return;
    const c = this.character;

    const statsDiv = document.getElementById('sidebar-stats');
    if (statsDiv) {
      statsDiv.innerHTML = Object.entries(Rules.abilities).map(([key, meta]) => {
        const val = c.stats[key] || 10;
        const mod = Rules.getModifierStr(val);
        return `
          <div class="stat-inline">
            <span class="stat-inline-name">${meta.icon} ${key.toUpperCase()}</span>
            <span><strong class="stat-inline-val">${val}</strong> <span class="stat-inline-mod">(${mod})</span></span>
          </div>
        `;
      }).join('');
    }

    const invDiv = document.getElementById('sidebar-inventory');
    if (invDiv) {
      invDiv.innerHTML = (c.inventory || []).map(item => `
        <div class="inv-item">
          <span class="inv-icon">${item.icon || '📦'}</span>
          <span class="inv-name">${item.name}</span>
          <span class="inv-qty">x${item.qty || 1}</span>
        </div>
      `).join('') || '<p class="text-muted" style="font-size:12px">Çanta boş</p>';
    }

    Multiplayer.renderPartyList();
  },

  // Eylem Gönderme (Tur Havuzuna Ekler)
  sendAction() {
    const input = document.getElementById('player-input');
    const actionText = input?.value?.trim();
    if (!actionText) return;

    input.value = '';

    // Çok oyunculu odada mıyız?
    if (Multiplayer.peer) {
      Multiplayer.submitTurnAction(actionText);
    } else {
      // Tek oyunculu mod: doğrudan DM'e gönder
      this.addPlayerMessage(actionText);
      this.triggerSinglePlayerDM(actionText);
    }
  },

  async triggerSinglePlayerDM(actionText) {
    if (!Combat.inCombat && /saldır|dövüş|savaş|kılıç çek/i.test(actionText)) {
      Combat.startCombat(['goblin']);
      return;
    }

    this.showTypingIndicator();
    try {
      const dmReply = await AIEngine.sendMessage(this.history, actionText, this.character);
      this.hideTypingIndicator();

      // Zar isteği var mı kontrol et
      const diceMatch = dmReply.match(/\[ZAR İSTEĞİ:\s*([^|\]]+)\|\s*([^|\]]+)(?:\|\s*([^|\]]+))?\|\s*([^\]]+)\]/i);

      if (diceMatch) {
        const targetPlayer = diceMatch[1].trim();
        const diceType = diceMatch[2].trim();
        const reason = diceMatch[4]?.trim() || diceMatch[3]?.trim() || 'Kontrol';

        const cleanReply = dmReply.replace(/\[ZAR İSTEĞİ:[^\]]+\]/g, '').trim();
        this.addDMMessage(cleanReply);

        this.showDiceGatePrompt(targetPlayer, reason, diceType);
      } else {
        this.addDMMessage(dmReply);
      }

      this.saveCurrentCampaign();
    } catch (err) {
      this.hideTypingIndicator();
      this.addSystemMessage(`⚠️ <strong>DM Hatası:</strong> ${err.message}`);
    }
  },

  // ================= TUR DURUM GÖSTERGESİ =================
  setTurnActionStatus(submittedCount, totalCount) {
    let bar = document.getElementById('turn-status-banner');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'turn-status-banner';
      bar.className = 'turn-status-banner';
      const container = document.getElementById('story-area');
      if (container) container.appendChild(bar);
    }

    bar.style.display = 'flex';
    bar.innerHTML = `
      <span>👥 <strong>Tur Eylemleri:</strong> ${submittedCount} / ${totalCount} Oyuncu Yazdı</span>
      ${Multiplayer.isHost ? `
        <button class="btn btn-sm btn-primary" onclick="Multiplayer.forceTriggerDMTurn()" style="margin-left:auto">
          ⚡ Turu Tamamla & DM'e Gönder
        </button>
      ` : ''}
    `;
    this.scrollToBottom();
  },

  disableTurnInput(msg) {
    const input = document.getElementById('player-input');
    const sendBtn = document.getElementById('btn-send');
    if (input) {
      input.disabled = true;
      input.placeholder = msg || 'Diğer oyuncular bekleniyor...';
    }
    if (sendBtn) sendBtn.disabled = true;
  },

  resetTurnActionInput() {
    const input = document.getElementById('player-input');
    const sendBtn = document.getElementById('btn-send');
    const bar = document.getElementById('turn-status-banner');

    if (input) {
      input.disabled = false;
      input.placeholder = 'Ne yapmak istiyorsun? Eylemini yaz...';
    }
    if (sendBtn) sendBtn.disabled = false;
    if (bar) bar.style.display = 'none';
  },

  // ================= ZAR İSTEME KAPISI (DICE ROLL GATE) =================
  showDiceGatePrompt(targetPlayerName, reason, diceType) {
    const modal = document.getElementById('dice-gate-modal');
    if (!modal) return;

    const isMe = (Adventure.character?.name === targetPlayerName) || !Multiplayer.peer;
    const titleEl = document.getElementById('dice-gate-title');
    const descEl = document.getElementById('dice-gate-desc');
    const btnEl = document.getElementById('btn-dice-gate-roll');

    if (titleEl) titleEl.textContent = `🎲 Zar İsteği: ${targetPlayerName}`;
    if (descEl) descEl.innerHTML = `Dungeon Master <strong>${targetPlayerName}</strong> için bir zar kontrolü istiyor:<br><strong class="text-gold">${reason} (${diceType})</strong>`;

    if (btnEl) {
      if (isMe) {
        btnEl.style.display = 'block';
        btnEl.textContent = `🎲 Hemen ${diceType} At!`;
        btnEl.onclick = () => this.executeGateRoll(targetPlayerName, diceType, reason);
      } else {
        btnEl.style.display = 'none';
      }
    }

    modal.style.display = 'flex';
  },

  hideDiceGatePrompt() {
    const modal = document.getElementById('dice-gate-modal');
    if (modal) modal.style.display = 'none';
  },

  executeGateRoll(playerName, diceType, reason) {
    const match = diceType.match(/d(\d+)/i);
    const sides = match ? parseInt(match[1]) : 20;

    const val = Dice.roll(sides);
    Dice.addToHistory(`d${sides} (${reason})`, val);
    Dice.showRollAnimation(sides, val, 'dice-result');

    this.hideDiceGatePrompt();
    this.addSystemMessage(`🎲 <strong>${playerName}</strong> beklenen zarı attı: <span class="inline-dice ${val === 20 ? 'crit' : val === 1 ? 'fumble' : ''}">${val}</span> (${reason})`);

    if (Multiplayer.peer) {
      const payload = {
        type: 'DICE_ROLLED',
        playerName: playerName,
        label: `d${sides} (${reason})`,
        val: val
      };
      if (Multiplayer.isHost) {
        Multiplayer.broadcast(payload);
        this.resolveDiceGate(playerName, reason, val);
      } else {
        Multiplayer.sendToHost(payload);
      }
    } else {
      this.resolveDiceGate(playerName, reason, val);
    }
  },

  async resolveDiceGate(playerName, reason, val) {
    const followUpPrompt = `[${playerName} ZAR SONUCU: ${val} attı (${reason})]. Lütfen bu zar sonucuna göre sahneyi devam ettir.`;
    this.showTypingIndicator();
    try {
      const dmReply = await AIEngine.sendMessage(this.history, followUpPrompt, this.character);
      this.hideTypingIndicator();
      this.addDMMessage(dmReply);
      if (Multiplayer.isHost) {
        Multiplayer.broadcast({ type: 'DM_MESSAGE', text: dmReply });
      }
      this.saveCurrentCampaign();
    } catch (e) {
      this.hideTypingIndicator();
      this.addSystemMessage(`⚠️ ${e.message}`);
    }
  },

  // ================= HİKAYEYİ DIŞA AKTARMA (EXPORT) =================
  exportCampaign(format = 'html') {
    const charName = this.character?.name || 'Maceraci';
    const dateStr = new Date().toISOString().slice(0, 10);

    if (format === 'json') {
      const exportData = {
        character: this.character,
        party: Multiplayer.party,
        history: this.history,
        exportedAt: new Date().toISOString()
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      this.downloadBlob(blob, `dnd_macera_${charName}_${dateStr}.json`);
    } else {
      // HTML Roman / Günlük Formatı
      let htmlContent = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<title>D&D Macera Günlüğü — ${charName}</title>
<style>
  body { font-family: 'Georgia', serif; line-height: 1.8; max-width: 800px; margin: 40px auto; padding: 20px; background: #121218; color: #e0dcd0; }
  h1 { font-family: 'Cinzel', serif; color: #c9a84c; text-align: center; border-bottom: 2px solid #c9a84c; padding-bottom: 10px; }
  .meta { text-align: center; color: #888; font-size: 14px; margin-bottom: 30px; }
  .entry { margin-bottom: 24px; padding: 16px; border-radius: 8px; }
  .entry-dm { background: #1a1a26; border-left: 4px solid #c9a84c; font-style: italic; }
  .entry-player { background: #222238; border-left: 4px solid #845ec2; font-weight: 500; }
  .entry-speaker { font-weight: bold; color: #c9a84c; font-size: 12px; text-transform: uppercase; margin-bottom: 6px; }
</style>
</head>
<body>
<h1>⚔️ D&D Macera Günlüğü</h1>
<div class="meta">Kahraman: <strong>${charName}</strong> &bull; Tarih: ${new Date().toLocaleDateString('tr-TR')}</div>
`;

      this.history.forEach(m => {
        const isDM = m.role === 'dm';
        htmlContent += `
<div class="entry ${isDM ? 'entry-dm' : 'entry-player'}">
  <div class="entry-speaker">${isDM ? '🐉 Dungeon Master' : '🗡️ ' + charName}</div>
  <div>${m.text.replace(/\n/g, '<br>')}</div>
</div>`;
      });

      htmlContent += `</body></html>`;
      const blob = new Blob([htmlContent], { type: 'text/html' });
      this.downloadBlob(blob, `dnd_macera_gunlugu_${charName}_${dateStr}.html`);
    }
  },

  downloadBlob(blob, filename) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  },

  // Yardımcı Eylemler
  quickAction(type) {
    const input = document.getElementById('player-input');
    if (!input) return;
    switch (type) {
      case 'attack':
        input.value = "Kılıcımı çekip en yakındaki düşmana saldırıyorum!";
        break;
      case 'spell':
        input.value = "Etrafı aydınlatıp enerjiyi yönlendirmek için bir büyü yapıyorum.";
        break;
      case 'investigate':
        input.value = "Etraftaki gizli geçitleri, tuzakları ve ipuçlarını dikkatlice araştırıyorum.";
        break;
      case 'stealth':
        input.value = "Gölgelerin arasına süzülüp nefesimi tutarak sessizce ilerliyorum.";
        break;
      case 'talk':
        input.value = "Gözlerimi karşımdakine dikip temkinli bir şekilde konuşmaya başlıyorum.";
        break;
    }
    this.sendAction();
  },

  showDicePanel() {
    document.getElementById('dice-overlay').style.display = 'flex';
  },

  hideDicePanel() {
    document.getElementById('dice-overlay').style.display = 'none';
  },

  rollDice(sides) {
    const val = Dice.roll(sides);
    Dice.addToHistory(`d${sides}`, val);
    Dice.showRollAnimation(sides, val, 'dice-result');
    Dice.renderHistory('dice-history');

    const msg = `🎲 <strong>${this.character?.name || 'Oyuncu'}</strong> zar attı: d${sides} = <span class="inline-dice ${val === 20 ? 'crit' : val === 1 ? 'fumble' : ''}">${val}</span>`;
    this.addSystemMessage(msg);

    if (Multiplayer.peer) {
      const payload = {
        type: 'DICE_ROLLED',
        playerName: this.character.name,
        label: `d${sides}`,
        val: val
      };
      if (Multiplayer.isHost) Multiplayer.broadcast(payload);
      else Multiplayer.sendToHost(payload);
    }
  },

  addDMMessage(text) {
    this.history.push({ role: 'dm', text });
    this.renderDMBubble(text);
  },

  addPlayerMessage(text) {
    this.history.push({ role: 'player', text });
    this.renderPlayerBubble(text);
  },

  addSystemMessage(html) {
    const container = document.getElementById('story-messages');
    if (!container) return;
    const msg = document.createElement('div');
    msg.className = 'message message-system';
    msg.innerHTML = html;
    container.appendChild(msg);
    this.scrollToBottom();
  },

  applyDamage(targetName, amount, rule = '', reason = '') {
    const num = parseInt(amount, 10);
    if (isNaN(num) || num <= 0) return;

    const myName = (this.character?.name || '').toLowerCase();
    const isMe = !targetName || targetName.toLowerCase() === myName || targetName.toLowerCase() === 'oyuncu';

    if (isMe && this.character) {
      this.character.hp = Math.max(0, this.character.hp - num);
      this.updateTopBar();
      this.renderSidebar();
      Storage.saveCharacter(this.character);

      if (this.character.hp === 0) {
        this.addSystemMessage(`💀 <strong>${this.character.name}</strong> 0 HP'ye düştü! <strong>Baygın (Unconscious)</strong> durumuna geçti! D&D 5e Ölüm Kurtarma Zarı (Death Saving Throw) gerekiyor.`);
      }
    }

    if (Multiplayer.party && Multiplayer.party.length > 0) {
      const member = Multiplayer.party.find(p => p.name.toLowerCase() === (targetName || '').toLowerCase());
      if (member) {
        member.hp = Math.max(0, member.hp - num);
        Multiplayer.renderPartyList();
        if (Multiplayer.isHost) {
          Multiplayer.broadcast({ type: 'PARTY_UPDATE', party: Multiplayer.party });
        }
      }
    }

    this.saveCurrentCampaign();
  },

  heal(targetName, amount, reason = '') {
    const num = parseInt(amount, 10);
    if (isNaN(num) || num <= 0) return;

    const myName = (this.character?.name || '').toLowerCase();
    const isMe = !targetName || targetName.toLowerCase() === myName || targetName.toLowerCase() === 'oyuncu';

    if (isMe && this.character) {
      this.character.hp = Math.min(this.character.maxHp, this.character.hp + num);
      this.updateTopBar();
      this.renderSidebar();
      Storage.saveCharacter(this.character);
    }

    if (Multiplayer.party && Multiplayer.party.length > 0) {
      const member = Multiplayer.party.find(p => p.name.toLowerCase() === (targetName || '').toLowerCase());
      if (member) {
        member.hp = Math.min(member.maxHp, member.hp + num);
        Multiplayer.renderPartyList();
        if (Multiplayer.isHost) {
          Multiplayer.broadcast({ type: 'PARTY_UPDATE', party: Multiplayer.party });
        }
      }
    }

    this.saveCurrentCampaign();
  },

  renderDMBubble(text) {
    const container = document.getElementById('story-messages');
    if (!container) return;

    let processedText = text;
    const ruleBadges = [];

    // [HASAR: Karakter | Miktar | Kural | Sebep]
    const damageRegex = /\[HASAR:\s*([^|\]]+)\|\s*([^|\]]+)(?:\|\s*([^|\]]+))?(?:\|\s*([^\]]+))?\]/gi;
    let dMatch;
    while ((dMatch = damageRegex.exec(text)) !== null) {
      const target = dMatch[1]?.trim() || '';
      const amount = parseInt(dMatch[2]?.trim(), 10) || 0;
      const rule = dMatch[3]?.trim() || 'D&D 5e Hasar Kuralı';
      const reason = dMatch[4]?.trim() || '';

      this.applyDamage(target, amount, rule, reason);

      ruleBadges.push(`
        <div class="rule-callout-card damage-card">
          <div class="rule-callout-header">💥 D&D 5E HASAR & KURAL UYGULAMASI</div>
          <div class="rule-callout-body">
            <div><strong>${target}</strong>, <span class="badge-dmg">-${amount} HP</span> hasar aldı!</div>
            <div class="rule-meta">📜 <strong>Kural Gerekçesi:</strong> ${rule} ${reason ? `(${reason})` : ''}</div>
          </div>
        </div>
      `);
    }

    // [İYİLEŞME: Karakter | Miktar | Sebep]
    const healRegex = /\[İYİLEŞME:\s*([^|\]]+)\|\s*([^|\]]+)(?:\|\s*([^\]]+))?\]/gi;
    let hMatch;
    while ((hMatch = healRegex.exec(text)) !== null) {
      const target = hMatch[1]?.trim() || '';
      const amount = parseInt(hMatch[2]?.trim(), 10) || 0;
      const reason = hMatch[3]?.trim() || 'İyileşme';

      this.heal(target, amount, reason);

      ruleBadges.push(`
        <div class="rule-callout-card heal-card">
          <div class="rule-callout-header">💚 D&D 5E İYİLEŞME & ŞİFA</div>
          <div class="rule-callout-body">
            <div><strong>${target}</strong>, <span class="badge-heal">+${amount} HP</span> can kazandı!</div>
            <div class="rule-meta">✨ <strong>Sebep:</strong> ${reason}</div>
          </div>
        </div>
      `);
    }

    // Etiketleri temizle
    processedText = processedText
      .replace(/\[HASAR:[^\]]+\]/gi, '')
      .replace(/\[İYİLEŞME:[^\]]+\]/gi, '')
      .replace(/\[ZAR İSTEĞİ:[^\]]+\]/gi, '')
      .trim();

    const msg = document.createElement('div');
    msg.className = 'message message-dm';
    const formatted = processedText
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>');

    msg.innerHTML = `
      <div class="dm-author-badge">
        <span>👑 ENI (Dungeon Master)</span>
      </div>
      <div class="dm-content-body">${formatted}</div>
      ${ruleBadges.length > 0 ? `<div class="rule-badges-wrap">${ruleBadges.join('')}</div>` : ''}
    `;
    container.appendChild(msg);
    this.scrollToBottom();
  },

  renderPlayerBubble(text) {
    const container = document.getElementById('story-messages');
    if (!container) return;
    const msg = document.createElement('div');
    msg.className = 'message message-player';
    msg.textContent = text;
    container.appendChild(msg);
    this.scrollToBottom();
  },

  showTypingIndicator() {
    const container = document.getElementById('story-messages');
    if (!container) return;
    const indicator = document.createElement('div');
    indicator.id = 'typing-indicator-box';
    indicator.className = 'typing-indicator';
    indicator.innerHTML = `
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <span style="font-size:12px;color:var(--text-muted);margin-left:6px">Dungeon Master değerlendiriyor...</span>
    `;
    container.appendChild(indicator);
    this.scrollToBottom();
  },

  hideTypingIndicator() {
    const el = document.getElementById('typing-indicator-box');
    if (el) el.remove();
  },

  scrollToBottom() {
    const area = document.getElementById('story-area');
    if (area) {
      setTimeout(() => { area.scrollTop = area.scrollHeight; }, 40);
    }
  },

  async saveCurrentCampaign() {
    if (!this.character) return;
    await Storage.saveCampaign({
      id: 'camp_' + this.character.id,
      characterId: this.character.id,
      history: this.history,
      updatedAt: Date.now()
    });
  },

  // ================= DM MASASI & KONTROL PANELİ =================
  openDMConsole() {
    const modal = document.getElementById('dm-console-modal');
    if (!modal) return;

    // Hedef oyuncu listesini doldur
    const select = document.getElementById('dm-target-player');
    if (select) {
      select.innerHTML = '';
      if (this.character) {
        select.innerHTML += `<option value="${this.character.name}">${this.character.name} (Sen - ${this.character.hp}/${this.character.maxHp} HP)</option>`;
      }
      if (Multiplayer.party) {
        Multiplayer.party.forEach(p => {
          if (p.name !== this.character?.name) {
            select.innerHTML += `<option value="${p.name}">${p.name} (${p.hp}/${p.maxHp} HP)</option>`;
          }
        });
      }
    }

    modal.style.display = 'flex';
    this.switchDMTab('actions');
  },

  closeDMConsole() {
    const modal = document.getElementById('dm-console-modal');
    if (modal) modal.style.display = 'none';
  },

  switchDMTab(tab) {
    document.querySelectorAll('.dm-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.dm-tab-content').forEach(c => c.style.display = 'none');

    const btn = document.getElementById(`btn-dm-tab-${tab}`);
    const content = document.getElementById(`dm-tab-${tab}`);
    if (btn) btn.classList.add('active');
    if (content) content.style.display = 'block';
  },

  dmApplyDamage() {
    const target = document.getElementById('dm-target-player')?.value || this.character?.name || 'Maceracı';
    const amount = parseInt(document.getElementById('dm-hp-amount')?.value, 10) || 1;
    const rule = document.getElementById('dm-rule-reason')?.value.trim() || 'DM Müdahalesi (D&D 5e Kuralı)';

    const tagMsg = `[HASAR: ${target} | ${amount} | ${rule} | DM Eylemi]\n**Dungeon Master Kararı:** ${target}, ${rule} sebebiyle **${amount} hasar** alıyor!`;
    this.addDMMessage(tagMsg);
    if (Multiplayer.peer) {
      const payload = { type: 'DM_MESSAGE', text: tagMsg };
      if (Multiplayer.isHost) Multiplayer.broadcast(payload);
      else Multiplayer.sendToHost(payload);
    }
    this.closeDMConsole();
  },

  dmApplyHeal() {
    const target = document.getElementById('dm-target-player')?.value || this.character?.name || 'Maceracı';
    const amount = parseInt(document.getElementById('dm-hp-amount')?.value, 10) || 1;

    const tagMsg = `[İYİLEŞME: ${target} | ${amount} | DM Şifası]\n**Dungeon Master Kararı:** ${target}, ilahi bir lütuf veya şifa iksiri sayesinde **+${amount} can** kazanıyor!`;
    this.addDMMessage(tagMsg);
    if (Multiplayer.peer) {
      const payload = { type: 'DM_MESSAGE', text: tagMsg };
      if (Multiplayer.isHost) Multiplayer.broadcast(payload);
      else Multiplayer.sendToHost(payload);
    }
    this.closeDMConsole();
  },

  dmTriggerTrap(type) {
    const target = document.getElementById('dm-target-player')?.value || this.character?.name || 'Maceracı';
    let text = '';
    if (type === 'pit') {
      const dmg = Math.floor(Math.random() * 6) + 1;
      text = `[HASAR: ${target} | ${dmg} | Düşme Hasarı (10ft derinlik: 1d6 Ezici, DC 12 Dex) | Çukur Tuzağı]\n⚠️ **Tuzak Devrede!** Zemin ayağınızın altından aniden kayıyor! Derin bir çukura yuvarlanıyorsunuz. Taş zemine çarpmanın etkisiyle nefesiniz kesiliyor!`;
    } else if (type === 'poison') {
      const dmg = Math.floor(Math.random() * 4) + 1 + Math.floor(Math.random() * 4) + 1;
      text = `[HASAR: ${target} | ${dmg} | Zehirli İğne Tuzağı (1d4 Delici + 2d4 Zehir, DC 13 Con) | Gizli İğne]\n⚠️ **Tuzak Devrede!** Duvarın oyuğundan fırlayan ince paslı bir iğne teninize batıyor. Damarlarınızda buz gibi yanan bir zehrin yayıldığını hissediyorsunuz!`;
    } else if (type === 'rocks') {
      const dmg = Math.floor(Math.random() * 6) + 1 + Math.floor(Math.random() * 6) + 1;
      text = `[HASAR: ${target} | ${dmg} | Düşen Kaya Tuzağı (2d6 Ezici Hasar, DC 14 Dex) | Taş Çığı]\n⚠️ **Tuzak Devrede!** Tavandaki destek kirişi gıcırdayarak çöküyor! Yukarıdan yağan devasa taş blokları doğrudan üzerinize iniyor!`;
    } else if (type === 'fire') {
      const dmg = Math.floor(Math.random() * 6) + 1 + Math.floor(Math.random() * 6) + 1 + Math.floor(Math.random() * 6) + 1;
      text = `[HASAR: ${target} | ${dmg} | Kadim Büyü Tuzağı (3d6 Ateş Hasarı, DC 15 Dex) | Alev Püskürmesi]\n⚠️ **Tuzak Devrede!** Taşların üzerindeki kızıl rünler alev alıyor ve bir anda koridoru kavurucu bir cehennem dalgası kaplıyor!`;
    }

    this.addDMMessage(text);
    if (Multiplayer.peer) {
      const payload = { type: 'DM_MESSAGE', text: text };
      if (Multiplayer.isHost) Multiplayer.broadcast(payload);
      else Multiplayer.sendToHost(payload);
    }
    this.closeDMConsole();
  },

  dmSpawnEnemies(type) {
    let enemyName = '';
    let enemyCount = Math.floor(Math.random() * 3) + 2;
    if (type === 'goblin') enemyName = `${enemyCount} adet Goblin Avcısı (AC: 15, HP: 7)`;
    else if (type === 'skeleton') enemyName = `${enemyCount} adet Kadim İskelet Savaşçı (AC: 13, HP: 13)`;
    else if (type === 'bandit') enemyName = `${enemyCount} adet Zırhlı Haydut (AC: 12, HP: 11)`;
    else if (type === 'wolf') enemyName = `${enemyCount} adet Aç Kurt (AC: 13, HP: 11)`;

    const text = `⚔️ **Düşman Pususu!** Gölgelerin arasından hırlamalar ve kılıç kınından çekilme sesleri yükseliyor! Karşınızda **${enemyName}** beliriyor! Silahlarınızı çekin, inisiyatif zarlarınızı hazırlayın!`;
    this.addDMMessage(text);
    if (Multiplayer.peer) {
      const payload = { type: 'DM_MESSAGE', text: text };
      if (Multiplayer.isHost) Multiplayer.broadcast(payload);
      else Multiplayer.sendToHost(payload);
    }
    this.closeDMConsole();
  },

  dmBroadcastStory() {
    const input = document.getElementById('dm-custom-narrative');
    const text = input?.value.trim();
    if (!text) return;

    const formatted = `👑 **Dungeon Master Anlatımı:**\n${text}`;
    this.addDMMessage(formatted);
    if (Multiplayer.peer) {
      const payload = { type: 'DM_MESSAGE', text: formatted };
      if (Multiplayer.isHost) Multiplayer.broadcast(payload);
      else Multiplayer.sendToHost(payload);
    }
    input.value = '';
    this.closeDMConsole();
  }
};

window.addEventListener('DOMContentLoaded', () => {
  App.init();

  const inputEl = document.getElementById('player-input');
  if (inputEl) {
    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        Adventure.sendAction();
      }
    });
  }
});
