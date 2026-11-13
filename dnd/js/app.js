/* ===================================
   MAIN APPLICATION ORCHESTRATOR
   Ekran geçişleri, Macera döngüsü, UI bağlama
   =================================== */

const App = {
  currentScreen: 'screen-loading',

  async init() {
    this.createParticles();
    this.loadSettings();

    // Veritabanını hazırla
    try {
      await Storage.openDB();
    } catch (e) {
      console.warn("IndexedDB açılamadı:", e);
    }

    // Karakter oluşturma sihirbazını başlat
    CharacterCreate.init();

    // 1 saniye sonra menüye geç
    setTimeout(() => {
      this.showScreen('screen-menu');
    }, 1200);
  },

  // Ekran Değiştirici
  showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(screenId);
    if (target) {
      target.classList.add('active');
      this.currentScreen = screenId;
    }
  },

  // Partikül Efekti (Ana Menü Arkaplanı)
  createParticles() {
    const container = document.getElementById('particles');
    if (!container) return;

    for (let i = 0; i < 25; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      p.style.left = `${Math.random() * 100}%`;
      p.style.animationDelay = `${Math.random() * 4}s`;
      p.style.animationDuration = `${3 + Math.random() * 4}s`;
      container.appendChild(p);
    }
  },

  // Ayarları Yükle
  loadSettings() {
    const s = Storage.getSettings();
    const providerEl = document.getElementById('ai-provider');
    const keyEl = document.getElementById('api-key');
    const modelEl = document.getElementById('ai-model');
    const themeEl = document.getElementById('theme-select');
    const langEl = document.getElementById('lang-select');

    if (providerEl) providerEl.value = s.apiProvider || 'gemini';
    if (keyEl) keyEl.value = s.apiKey || '';
    if (modelEl) modelEl.value = s.aiModel || 'gemini-2.0-flash';
    if (themeEl) themeEl.value = s.theme || 'dark';
    if (langEl) langEl.value = s.lang || 'tr';

    this.setTheme(s.theme || 'dark');
  },

  // Ayarları Kaydet
  saveSettings() {
    const settings = {
      apiProvider: document.getElementById('ai-provider')?.value || 'gemini',
      apiKey: document.getElementById('api-key')?.value.trim() || '',
      aiModel: document.getElementById('ai-model')?.value || 'gemini-2.0-flash',
      theme: document.getElementById('theme-select')?.value || 'dark',
      lang: document.getElementById('lang-select')?.value || 'tr'
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

  // AI Bağlantısını Test Et
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

  // Kayıtlı Karakterleri Listele
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
   ADVENTURE ENGINE (MAIN PLAYGROUND)
   =================================== */
const Adventure = {
  character: null,
  history: [], // { role: 'dm'|'player', text: '' }
  campaignId: null,

  // Yeni Karakterle Başla
  async start(character) {
    this.character = character;
    this.campaignId = 'camp_' + Date.now();
    this.history = [];

    App.showScreen('screen-adventure');
    this.updateTopBar();
    this.renderSidebar();

    // Hoş geldin mesajı ve başlangıç hikayesi
    const welcomeText = `Karanlık gölgelerin uzandığı, rüzgarın fısıltılarla estiği topraklara adım atıyorsun, **${this.character.name}**. 
${this.character.raceName} soyundan gelen bir ${this.character.className} olarak, yazgının seni çağırdığı bu kadim macerada ilk adımlarını atıyorsun.

Önünde ikiye ayrılan eski bir taş yol var: Sol taraf çürük meşe ağaçlarıyla kaplı fısıltılı bir ormana, sağ taraf ise kayalıkların ardında dumanı tüten terk edilmiş bir gözetleme kulesine uzanıyor.

Ne yapmak istiyorsun?`;

    this.addDMMessage(welcomeText);
  },

  // Kayıtlı Karakteri Yükle ve Devam Et
  async startFromSaved(id) {
    const char = await Storage.getCharacter(id);
    if (!char) return;
    this.character = char;
    App.showScreen('screen-adventure');
    this.updateTopBar();
    this.renderSidebar();

    // Önceki kayıtlı hikayeyi yüklemeyi dene
    const camp = await Storage.getCampaign('camp_' + id);
    if (camp && camp.history) {
      this.history = camp.history;
      document.getElementById('story-messages').innerHTML = '';
      this.history.forEach(m => {
        if (m.role === 'dm') this.renderDMBubble(m.text);
        else this.renderPlayerBubble(m.text);
      });
    } else {
      this.addDMMessage(`Yeniden hoş geldin, **${this.character.name}**! Maceran kaldığı yerden devam ediyor. Etrafını süzüyorsun... Nereye gitmek istersin?`);
    }
  },

  // Üst Barı Güncelle
  updateTopBar() {
    if (!this.character) return;
    const c = this.character;

    document.getElementById('adv-name').textContent = c.name;
    document.getElementById('adv-class').textContent = `${c.raceName || ''} ${c.className || ''}`;
    document.getElementById('adv-ac').textContent = `🛡️ ${c.ac || 10}`;
    document.getElementById('adv-level').textContent = `⭐ Lv ${c.level || 1}`;
    document.getElementById('adv-xp').textContent = `✨ ${c.xp || 0} XP`;

    const hpText = `${Math.max(0, c.hp)}/${c.maxHp}`;
    document.getElementById('adv-hp-text').textContent = hpText;
    const hpPct = Math.max(0, Math.min(100, (c.hp / c.maxHp) * 100));
    document.getElementById('adv-hp-fill').style.width = `${hpPct}%`;

    const portraitEl = document.getElementById('adv-portrait');
    if (c.portrait) {
      portraitEl.innerHTML = `<img src="${c.portrait}" alt="${c.name}">`;
    } else {
      portraitEl.innerHTML = '🗡️';
    }
  },

  // Yan Paneli Render Et
  renderSidebar() {
    if (!this.character) return;
    const c = this.character;

    // Statlar
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

    // Envanter
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

    // Büyüler
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

  // Yan Panel Toggle
  toggleCharSheet() {
    const sidebar = document.getElementById('adventure-sidebar');
    if (sidebar) {
      const isVisible = sidebar.style.display !== 'none';
      sidebar.style.display = isVisible ? 'none' : 'block';
      sidebar.classList.toggle('open', !isVisible);
    }
  },

  toggleInventory() {
    this.toggleCharSheet();
  },

  // Oyuncudan Eylem Gönder
  async sendAction() {
    const input = document.getElementById('player-input');
    const actionText = input.value.trim();
    if (!actionText) return;

    input.value = '';

    // Oyuncu mesajını ekrana bas
    this.addPlayerMessage(actionText);

    // Eğer savaş modundaysa veya savaş tetikleyen bir kelime varsa
    if (!Combat.inCombat && /saldır|dövüş|savaş|atak|kılıç çek/i.test(actionText)) {
      Combat.startCombat(['goblin']);
      return;
    }

    // AI DM'den yanıt bekle
    this.showTypingIndicator();
    try {
      const dmReply = await AIEngine.sendMessage(this.history, actionText, this.character);
      this.hideTypingIndicator();
      this.addDMMessage(dmReply);
      this.saveCurrentCampaign();
    } catch (err) {
      this.hideTypingIndicator();
      this.addSystemMessage(`⚠️ <strong>DM Bağlantı Sorunu:</strong> ${err.message}`);
    }
  },

  // Otomatik Prompt Gönder (savaş sonu vb.)
  async sendAutoPromptToAI(promptText) {
    this.showTypingIndicator();
    try {
      const reply = await AIEngine.sendMessage(this.history, promptText, this.character);
      this.hideTypingIndicator();
      this.addDMMessage(reply);
      this.saveCurrentCampaign();
    } catch (err) {
      this.hideTypingIndicator();
      this.addSystemMessage(`⚠️ ${err.message}`);
    }
  },

  // Hızlı Eylemler (Quick Actions)
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

  // Zar Paneli
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

    // Hikaye akışına da ufak bir zar bildirimi ekle
    this.addSystemMessage(`🎲 <strong>Zar Atıldı:</strong> d${sides} sonucu: <span class="inline-dice ${val === 20 ? 'crit' : val === 1 ? 'fumble' : ''}">${val}</span>`);
  },

  // Mesaj Ekleme Yardımcıları
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
    // Basit markdown biçimlendirme (kalın, italik, satır başları)
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
      <span style="font-size:12px;color:var(--text-muted);margin-left:6px">Dungeon Master düşünüyor...</span>
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

// Sayfa yüklendiğinde başlat
window.addEventListener('DOMContentLoaded', () => {
  App.init();

  // Enter tuşuyla aksiyon gönderme (Shift+Enter yeni satır)
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
