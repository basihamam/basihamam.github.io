/* ===================================
   MAIN APPLICATION ORCHESTRATOR (V2)
   Mobil Dostu Gezinme, Çok Oyunculu Eşitleme, Özel Kampanya Başlatıcı
   =================================== */

const App = {
  currentScreen: 'screen-loading',
  currentTab: 'story', // 'story', 'sheet', 'inventory', 'party', 'settings'

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
    }, 800);
  },

  showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(screenId);
    if (target) {
      target.classList.add('active');
      this.currentScreen = screenId;
    }

    // Mobil bottom bar görünürlüğü
    const bottomNav = document.getElementById('mobile-bottom-nav');
    if (bottomNav) {
      bottomNav.style.display = screenId === 'screen-adventure' ? 'flex' : 'none';
    }
  },

  // Mobil Sekme Değiştirici (Bottom Nav)
  switchTab(tab) {
    this.currentTab = tab;
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.tab === tab);
    });

    const storyArea = document.getElementById('story-area');
    const inputArea = document.querySelector('.adventure-input');
    const sidebar = document.getElementById('adventure-sidebar');
    const combatPanel = document.getElementById('combat-panel');
    const lobbyOverlay = document.getElementById('adventure-lobby-modal');

    // Varsayılan gizle
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
    if (modelEl) modelEl.value = s.aiModel || 'gemini-1.5-pro';
    if (themeEl) themeEl.value = s.theme || 'dark';

    this.setTheme(s.theme || 'dark');
  },

  saveSettings() {
    const settings = {
      apiProvider: document.getElementById('ai-provider')?.value || 'gemini',
      apiKey: document.getElementById('api-key')?.value.trim() || '',
      aiModel: document.getElementById('ai-model')?.value || 'gemini-1.5-pro',
      theme: document.getElementById('theme-select')?.value || 'dark',
      lang: 'tr'
    };
    Storage.saveSettings(settings);
    alert('Ayarlar kaydedildi! 🛡️');
  },

  setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
  },

  toggleApiKeyVisibility() {
    const keyInput = document.getElementById('api-key');
    if (keyInput) {
      keyInput.type = keyInput.type === 'password' ? 'text' : 'password';
    }
  },

  async testAI() {
    const resEl = document.getElementById('ai-test-result');
    const provider = document.getElementById('ai-provider')?.value || 'gemini';
    const key = document.getElementById('api-key')?.value.trim() || AIEngine.getApiKey();
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
      resEl.textContent = '❌ Hata: ' + e.message;
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
   ADVENTURE ENGINE (V2)
   =================================== */
const Adventure = {
  character: null,
  history: [],
  campaignId: null,

  async start(character) {
    this.character = character;
    this.campaignId = 'camp_' + Date.now();
    this.history = [];

    // Kampanya Ayarlarını Aç (Oyuncu nasıl bir hikaye istiyor?)
    this.openCampaignModal();
  },

  openCampaignModal() {
    const modal = document.getElementById('campaign-setup-modal');
    if (modal) {
      modal.style.display = 'flex';
    } else {
      this.launchAdventure();
    }
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

    App.showScreen('screen-adventure');
    App.switchTab('story');
    this.updateTopBar();
    this.renderSidebar();

    // Özel Başlangıç Prompt'u
    let openingPrompt = "Maceraya başlıyoruz. İlk sahneyi ve etrafımdaki ortamı betimle.";
    if (customHook) {
      openingPrompt = `Oyuna şu hikaye çizgisiyle başlıyoruz: "${customHook}". Bu durumu ve sahneyi atmosferik olarak betimle ve ilk adımı bana bırak.`;
    }

    this.showTypingIndicator();
    try {
      const dmReply = await AIEngine.sendMessage([], openingPrompt, this.character);
      this.hideTypingIndicator();
      this.addDMMessage(dmReply);
    } catch (err) {
      this.hideTypingIndicator();
      this.addDMMessage(`Sisli gölgelerin uzandığı topraklara adım atıyorsun, **${this.character.name}**. Yazgının çağırdığı bu macerada ilk adımlarını atıyorsun.\n\nNe yapmak istiyorsun?`);
    }
  },

  async startFromSaved(id) {
    const char = await Storage.getCharacter(id);
    if (!char) return;
    this.character = char;
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
      this.addDMMessage(`Yeniden hoş geldin, **${this.character.name}**! Maceran kaldığı yerden devam ediyor. Nereye gitmek istersin?`);
    }
  },

  updateTopBar() {
    if (!this.character) return;
    const c = this.character;

    const nameEl = document.getElementById('adv-name');
    const classEl = document.getElementById('adv-class');
    const acEl = document.getElementById('adv-ac');
    const lvlEl = document.getElementById('adv-level');
    const xpEl = document.getElementById('adv-xp');

    if (nameEl) nameEl.textContent = c.name;
    if (classEl) classEl.textContent = `${c.raceName || ''} ${c.className || ''}`;
    if (acEl) acEl.textContent = `🛡️ ${c.ac || 10}`;
    if (lvlEl) lvlEl.textContent = `⭐ Lv ${c.level || 1}`;
    if (xpEl) xpEl.textContent = `✨ ${c.xp || 0}`;

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

    const spellsDiv = document.getElementById('sidebar-spells');
    if (spellsDiv) {
      if (c.spells && c.spells.length > 0) {
        spellsDiv.innerHTML = c.spells.map(sKey => {
          const s = Rules.spells[sKey];
          return s ? `
            <div class="inv-item">
              <span class="inv-icon">✨</span>
              <span class="inv-name">${s.name} (${s.damage || s.school})</span>
            </div>
          ` : '';
        }).join('');
      } else {
        spellsDiv.innerHTML = '<p class="text-muted" style="font-size:12px">Büyü yeteneği yok</p>';
      }
    }
  },

  // Eylem Gönder
  async sendAction() {
    const input = document.getElementById('player-input');
    const actionText = input.value.trim();
    if (!actionText) return;

    input.value = '';

    // Çok oyunculu kontrol
    if (Multiplayer.peer && !Multiplayer.isHost) {
      // Client isek Host'a ilet
      this.addPlayerMessage(actionText);
      Multiplayer.sendToHost({
        type: 'ACTION_TRIGGER',
        playerName: this.character.name,
        text: actionText
      });
      return;
    }

    this.addPlayerMessage(actionText);

    // Host veya tek oyunculu ise AI çalıştır
    if (Multiplayer.isHost) {
      Multiplayer.broadcast({
        type: 'CHAT_MESSAGE',
        playerName: this.character.name,
        text: actionText
      });
    }

    if (!Combat.inCombat && /saldır|dövüş|savaş|atak|kılıç çek/i.test(actionText)) {
      Combat.startCombat(['goblin']);
      return;
    }

    this.showTypingIndicator();
    try {
      const dmReply = await AIEngine.sendMessage(this.history, actionText, this.character);
      this.hideTypingIndicator();
      this.addDMMessage(dmReply);

      // Çok oyunculuda herkese yay
      if (Multiplayer.isHost) {
        Multiplayer.broadcast({ type: 'DM_MESSAGE', text: dmReply });
      }

      this.saveCurrentCampaign();
    } catch (err) {
      this.hideTypingIndicator();
      this.addSystemMessage(`⚠️ <strong>DM Hatası:</strong> ${err.message}`);
    }
  },

  async sendActionForParty(playerName, actionText) {
    this.showTypingIndicator();
    try {
      const dmReply = await AIEngine.sendMessage(this.history, `[${playerName}]: ${actionText}`, this.character);
      this.hideTypingIndicator();
      this.addDMMessage(dmReply);
      Multiplayer.broadcast({ type: 'DM_MESSAGE', text: dmReply });
      this.saveCurrentCampaign();
    } catch (err) {
      this.hideTypingIndicator();
      this.addSystemMessage(`⚠️ <strong>DM Hatası:</strong> ${err.message}`);
    }
  },

  quickAction(type) {
    const input = document.getElementById('player-input');
    switch (type) {
      case 'attack':
        if (Combat.inCombat) {
          const firstEnemy = Combat.combatants.find(c => !c.isPlayer && c.hp > 0);
          if (firstEnemy) Combat.playerAttack(firstEnemy.id);
        } else {
          input.value = "Silahımı çekip en yakındaki tehdide saldırıyorum!";
          this.sendAction();
        }
        break;
      case 'spell':
        if (Combat.inCombat) {
          const firstEnemy = Combat.combatants.find(c => !c.isPlayer && c.hp > 0);
          if (firstEnemy) Combat.playerCastSpell(firstEnemy.id);
        } else {
          input.value = "Etrafı aydınlatmak ve tehlikeleri sezmek için bir büyü yapıyorum.";
          this.sendAction();
        }
        break;
      case 'investigate':
        const wisMod = Rules.getModifier(this.character.stats.wis);
        const roll = Dice.rollSkillCheck(wisMod);
        this.addSystemMessage(`🔍 <strong>Algı / Araştırma Zarı:</strong> d20 (${roll.natural}) + ${wisMod} = <strong>${roll.total}</strong>`);
        input.value = `Etrafımı dikkatlice inceliyorum ve gizli şeyleri arıyorum (Algı zarı attım: ${roll.total}).`;
        this.sendAction();
        break;
      case 'talk':
        input.value = "Dostane bir ses tonuyla sesleniyorum: 'Kim var orada? Size zarar vermeye niyetim yok!'";
        break;
      case 'stealth':
        const dexMod = Rules.getModifier(this.character.stats.dex);
        const stealthRoll = Dice.rollSkillCheck(dexMod);
        this.addSystemMessage(`🥷 <strong>Gizlenme (Stealth) Zarı:</strong> d20 (${stealthRoll.natural}) + ${dexMod} = <strong>${stealthRoll.total}</strong>`);
        input.value = `Gölgelere sığınıp sessizce ilerliyorum (Gizlenme zarı attım: ${stealthRoll.total}).`;
        this.sendAction();
        break;
    }
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

    const msg = `🎲 <strong>${this.character?.name || 'Oyuncu'}</strong> zar attı: d${sides} sonucu: <span class="inline-dice ${val === 20 ? 'crit' : val === 1 ? 'fumble' : ''}">${val}</span>`;
    this.addSystemMessage(msg);

    // Çok oyunculu eşitleme
    if (Multiplayer.peer) {
      const payload = {
        type: 'DICE_ROLL',
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

  renderDMBubble(text) {
    const container = document.getElementById('story-messages');
    if (!container) return;
    const msg = document.createElement('div');
    msg.className = 'message message-dm';
    const formatted = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>');
    msg.innerHTML = formatted;
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
      <span style="font-size:12px;color:var(--text-muted);margin-left:6px">Dungeon Master yazıyor...</span>
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
      setTimeout(() => {
        area.scrollTop = area.scrollHeight;
      }, 50);
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
