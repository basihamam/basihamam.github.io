/* ===================================
   CHARACTER CREATION & MANAGEMENT MODULE (V2)
   Prompt-to-Character (AI), Manuel Sihirbaz, Portre & Statlar
   =================================== */

const CharacterCreate = {
  currentStep: 1,
  mode: 'wizard', // 'wizard' veya 'ai-prompt'
  data: {
    id: null,
    name: '',
    portrait: null,
    race: 'human',
    raceName: 'İnsan',
    class: 'fighter',
    className: 'Savaşçı',
    stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    statMethod: 'standard',
    pointBuyRemaining: 27,
    background: 'soldier',
    backstory: '',
    alignment: 'TN',
    level: 1,
    xp: 0,
    hp: 10,
    maxHp: 10,
    ac: 10,
    inventory: [],
    spells: [],
    spellSlots: []
  },

  init() {
    this.renderRaces();
    this.renderClasses();
    this.setupPortraitUpload();
    this.initStats();
  },

  // Mod Değiştir (AI ile Yarat vs Adım Adım)
  setCreateMode(mode) {
    this.mode = mode;
    const aiTab = document.getElementById('tab-create-ai');
    const wizardTab = document.getElementById('tab-create-wizard');
    const aiView = document.getElementById('char-create-ai-view');
    const wizardView = document.getElementById('char-create-wizard-view');

    if (aiTab) aiTab.classList.toggle('active', mode === 'ai-prompt');
    if (wizardTab) wizardTab.classList.toggle('active', mode === 'wizard');
    if (aiView) aiView.style.display = mode === 'ai-prompt' ? 'block' : 'none';
    if (wizardView) wizardView.style.display = mode === 'wizard' ? 'block' : 'none';
  },

  // 1. AI ile Karakter Yarat (Prompt-to-Character)
  async generateFromPrompt() {
    const promptInput = document.getElementById('ai-char-prompt');
    const promptText = promptInput?.value?.trim();
    if (!promptText) {
      alert("Lütfen karakterini tarif eden bir metin yaz!");
      return;
    }

    const btn = document.getElementById('btn-ai-generate-char');
    const statusEl = document.getElementById('ai-char-status');
    if (btn) btn.disabled = true;
    if (statusEl) {
      statusEl.style.display = 'block';
      statusEl.innerHTML = `<span class="loading-spin">🔮</span> Yapay zeka karakterini D&D 5e kurallarına göre inşa ediyor...`;
    }

    try {
      const generated = await AIEngine.createCharacterFromPrompt(promptText);

      // Veriyi aktar
      this.data.name = generated.name || 'Maceracı';
      this.data.race = generated.race || 'human';
      this.data.raceName = generated.raceName || (Rules.races[this.data.race]?.name || 'İnsan');
      this.data.class = generated.class || 'fighter';
      this.data.className = generated.className || (Rules.classes[this.data.class]?.name || 'Savaşçı');
      this.data.stats = generated.stats || { str: 14, dex: 12, con: 14, int: 10, wis: 10, cha: 10 };
      this.data.background = generated.background || 'soldier';
      this.data.alignment = generated.alignment || 'TN';
      this.data.backstory = generated.backstory || promptText;
      this.data.spells = generated.spells || [];

      // Önizleme Ekranını Aç
      this.renderAIGeneratedPreview();
      if (statusEl) statusEl.style.display = 'none';
    } catch (e) {
      alert("Karakter üretilirken bir hata oluştu: " + e.message);
      if (statusEl) statusEl.style.display = 'none';
    } finally {
      if (btn) btn.disabled = false;
    }
  },

  renderAIGeneratedPreview() {
    const previewBox = document.getElementById('ai-char-preview');
    if (!previewBox) return;

    const conMod = Rules.getModifier(this.data.stats.con);
    const dexMod = Rules.getModifier(this.data.stats.dex);
    const hp = Rules.getMaxHP(this.data.class, 1, conMod);
    const ac = Rules.getAC(dexMod);

    previewBox.style.display = 'block';
    previewBox.innerHTML = `
      <div class="generated-char-sheet">
        <div class="sheet-top">
          <div class="portrait-mini" id="ai-preview-portrait-box" onclick="document.getElementById('ai-portrait-input').click()">
            ${this.data.portrait ? `<img src="${this.data.portrait}">` : '📷<br><span style="font-size:10px">Fotoğraf Ekle</span>'}
            <input type="file" id="ai-portrait-input" accept="image/*" hidden onchange="CharacterCreate.handleAIPortrait(event)">
          </div>
          <div class="sheet-head">
            <h3>${this.data.name}</h3>
            <p class="text-gold">${this.data.raceName} &bull; ${this.data.className} &bull; ${this.data.alignment}</p>
            <p style="font-size:12px;color:var(--text-muted)">❤️ ${hp} HP &bull; 🛡️ ${ac} AC</p>
          </div>
        </div>

        <div class="preview-stats-row">
          ${Object.entries(this.data.stats).map(([k, v]) => `
            <div class="stat-pill">
              <span class="lbl">${k.toUpperCase()}</span>
              <span class="val">${v}</span>
              <span class="mod">(${Rules.getModifierStr(v)})</span>
            </div>
          `).join('')}
        </div>

        <div class="preview-backstory">
          <strong>Hikaye & Arkaplan:</strong>
          <p>${this.data.backstory}</p>
        </div>

        <div class="sheet-confirm-bar">
          <button class="btn btn-primary btn-lg" onclick="CharacterCreate.confirmAICharacter()">
            🗡️ Bu Karakterle Maceraya Başla!
          </button>
          <button class="btn btn-secondary" onclick="CharacterCreate.transferToWizard()">
            🛠️ Detayları Düzenle (Sihirbaza Aktar)
          </button>
        </div>
      </div>
    `;
  },

  handleAIPortrait(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      this.data.portrait = ev.target.result;
      this.renderAIGeneratedPreview();
    };
    reader.readAsDataURL(file);
  },

  async confirmAICharacter() {
    const conMod = Rules.getModifier(this.data.stats.con);
    const dexMod = Rules.getModifier(this.data.stats.dex);
    this.data.maxHp = Rules.getMaxHP(this.data.class, 1, conMod);
    this.data.hp = this.data.maxHp;
    this.data.ac = Rules.getAC(dexMod);

    this.data.inventory = [
      { name: 'Sırt Çantası', qty: 1, icon: '🎒' },
      { name: 'Maceracı Rasyonu', qty: 5, icon: '🍞' },
      { name: 'Matara', qty: 1, icon: '💧' },
      { name: 'Altın Kese', qty: 20, icon: '🪙' }
    ];

    this.data.id = 'char_' + Date.now();
    await Storage.saveCharacter(this.data);
    Adventure.start(this.data);
  },

  transferToWizard() {
    this.setCreateMode('wizard');
    document.getElementById('char-name').value = this.data.name;
    this.selectRace(this.data.race);
    this.selectClass(this.data.class);
    this.renderStatsGrid();
    document.getElementById('char-backstory').value = this.data.backstory;
    this.nextStep(1);
  },

  // 2. Manuel Adım Adım Sihirbaz
  nextStep(step) {
    if (step > this.currentStep) {
      if (this.currentStep === 1) {
        const name = document.getElementById('char-name').value.trim();
        if (!name) {
          alert('Lütfen karakterine bir isim ver!');
          return;
        }
        this.data.name = name;
      } else if (this.currentStep === 2) {
        if (!this.data.race) {
          alert('Lütfen bir ırk seç!');
          return;
        }
      } else if (this.currentStep === 3) {
        if (!this.data.class) {
          alert('Lütfen bir sınıf seç!');
          return;
        }
      }
    }

    for (let i = 1; i <= 5; i++) {
      const stepEl = document.getElementById(`char-step-${i}`);
      if (stepEl) stepEl.style.display = i === step ? 'block' : 'none';

      const navStep = document.querySelector(`.char-create-steps .step[data-step="${i}"]`);
      if (navStep) {
        navStep.classList.toggle('active', i === step);
        navStep.classList.toggle('done', i < step);
      }
    }

    this.currentStep = step;
  },

  setupPortraitUpload() {
    const uploadArea = document.getElementById('portrait-upload');
    const input = document.getElementById('portrait-input');
    const preview = document.getElementById('portrait-preview');

    if (!uploadArea || !input) return;

    uploadArea.onclick = () => input.click();

    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const size = 300;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');

          const minDim = Math.min(img.width, img.height);
          const sx = (img.width - minDim) / 2;
          const sy = (img.height - minDim) / 2;

          ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
          const base64 = canvas.toDataURL('image/jpeg', 0.85);

          this.data.portrait = base64;
          preview.innerHTML = `<img src="${base64}" alt="Portre">`;
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    };
  },

  renderRaces() {
    const grid = document.getElementById('race-grid');
    if (!grid) return;

    grid.innerHTML = '';
    for (const [key, race] of Object.entries(Rules.races)) {
      const card = document.createElement('div');
      card.className = 'race-card';
      card.dataset.race = key;
      card.innerHTML = `
        <span class="card-icon">${race.icon}</span>
        <span class="card-name">${race.name}</span>
      `;
      card.onclick = () => this.selectRace(key);
      grid.appendChild(card);
    }
  },

  selectRace(key) {
    this.data.race = key;
    const race = Rules.races[key];
    this.data.raceName = race.name;

    document.querySelectorAll('.race-card').forEach(c => {
      c.classList.toggle('selected', c.dataset.race === key);
    });

    const info = document.getElementById('race-info');
    document.getElementById('race-info-name').textContent = `${race.icon} ${race.name}`;
    document.getElementById('race-info-desc').textContent = race.desc;

    const bonuses = Object.entries(race.bonuses || {})
      .map(([st, val]) => `<strong>${st.toUpperCase()} +${val}</strong>`)
      .join(', ');
    document.getElementById('race-info-bonuses').innerHTML = `<p style="margin-top:8px">✨ <strong>Yetenek Bonusları:</strong> ${bonuses || 'Özel'}</p>`;
    document.getElementById('race-info-traits').innerHTML = `<p style="margin-top:6px">🧬 <strong>Özellikler:</strong> ${race.traits.join(', ')}</p>`;
    info.style.display = 'block';

    const nextBtn = document.getElementById('btn-race-next');
    if (nextBtn) nextBtn.disabled = false;
  },

  renderClasses() {
    const grid = document.getElementById('class-grid');
    if (!grid) return;

    grid.innerHTML = '';
    for (const [key, cls] of Object.entries(Rules.classes)) {
      const card = document.createElement('div');
      card.className = 'class-card';
      card.dataset.class = key;
      card.innerHTML = `
        <span class="card-icon">${cls.icon}</span>
        <span class="card-name">${cls.name}</span>
      `;
      card.onclick = () => this.selectClass(key);
      grid.appendChild(card);
    }
  },

  selectClass(key) {
    this.data.class = key;
    const cls = Rules.classes[key];
    this.data.className = cls.name;

    document.querySelectorAll('.class-card').forEach(c => {
      c.classList.toggle('selected', c.dataset.class === key);
    });

    const info = document.getElementById('class-info');
    document.getElementById('class-info-name').textContent = `${cls.icon} ${cls.name}`;
    document.getElementById('class-info-desc').textContent = cls.desc;

    document.getElementById('class-info-details').innerHTML = `
      <p style="margin-top:8px">❤️ <strong>Can Zarı:</strong> d${cls.hitDie}</p>
      <p style="margin-top:4px">🛡️ <strong>Kurtarma Atışları:</strong> ${cls.savingThrows.map(s => s.toUpperCase()).join(', ')}</p>
      <p style="margin-top:4px">⚡ <strong>1. Seviye Özellikleri:</strong> ${cls.features[1]?.join(', ') || 'Yok'}</p>
    `;
    info.style.display = 'block';

    const nextBtn = document.getElementById('btn-class-next');
    if (nextBtn) nextBtn.disabled = false;
  },

  initStats() {
    this.data.stats = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
    this.setStatMethod('standard');
  },

  setStatMethod(method) {
    this.data.statMethod = method;
    ['standard', 'pointbuy', 'roll'].forEach(m => {
      const btn = document.getElementById(`btn-stat-${m}`);
      if (btn) btn.classList.toggle('active', m === method);
    });

    if (method === 'standard') {
      const arr = [...Rules.standardArray];
      const keys = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
      keys.forEach((k, idx) => {
        this.data.stats[k] = arr[idx] || 10;
      });
    } else if (method === 'pointbuy') {
      this.data.pointBuyRemaining = 27;
      Object.keys(this.data.stats).forEach(k => {
        this.data.stats[k] = 8;
      });
    } else if (method === 'roll') {
      this.rollAllStats();
    }

    this.renderStatsGrid();
  },

  rollAllStats() {
    Object.keys(this.data.stats).forEach(k => {
      const res = Dice.rollAbilityScore();
      this.data.stats[k] = res.total;
    });
    this.renderStatsGrid();
  },

  renderStatsGrid() {
    const grid = document.getElementById('stats-grid');
    if (!grid) return;

    grid.innerHTML = '';
    const raceBonus = Rules.races[this.data.race]?.bonuses || {};

    for (const [key, meta] of Object.entries(Rules.abilities)) {
      const baseVal = this.data.stats[key] || 10;
      const bonus = raceBonus[key] || 0;
      const totalVal = baseVal + bonus;
      const modStr = Rules.getModifierStr(totalVal);

      const item = document.createElement('div');
      item.className = 'stat-item';
      item.innerHTML = `
        <span class="stat-icon">${meta.icon}</span>
        <div>
          <div class="stat-name">${meta.name}</div>
          <div class="stat-value">${totalVal} <span class="stat-modifier">(${modStr})</span></div>
          ${bonus > 0 ? `<div style="font-size:11px;color:var(--accent)">+${bonus} Irk Bonusu</div>` : ''}
        </div>
        <div class="stat-controls">
          ${this.data.statMethod === 'pointbuy' ? `
            <button onclick="CharacterCreate.adjustPointBuy('${key}', -1)">-</button>
            <button onclick="CharacterCreate.adjustPointBuy('${key}', 1)">+</button>
          ` : ''}
        </div>
      `;
      grid.appendChild(item);
    }

    const summary = document.getElementById('stat-summary');
    if (summary) {
      if (this.data.statMethod === 'pointbuy') {
        summary.innerHTML = `<p style="font-size:13px;color:var(--accent);margin-top:10px">Kalan Puan: <strong>${this.data.pointBuyRemaining} / 27</strong></p>`;
      } else if (this.data.statMethod === 'roll') {
        summary.innerHTML = `<button class="btn btn-sm btn-secondary" onclick="CharacterCreate.rollAllStats()" style="margin-top:10px">🎲 Zarları Yeniden At</button>`;
      } else {
        summary.innerHTML = '';
      }
    }
  },

  adjustPointBuy(statKey, delta) {
    const current = this.data.stats[statKey];
    const next = current + delta;
    if (next < 8 || next > 15) return;

    const currentCost = Rules.pointBuyCost[current];
    const nextCost = Rules.pointBuyCost[next];
    const diff = nextCost - currentCost;

    if (this.data.pointBuyRemaining - diff < 0) {
      alert("Yeterli puanın yok!");
      return;
    }

    this.data.pointBuyRemaining -= diff;
    this.data.stats[statKey] = next;
    this.renderStatsGrid();
  },

  async finalize() {
    this.data.background = document.getElementById('char-background').value;
    this.data.backstory = document.getElementById('char-backstory').value;
    this.data.alignment = document.getElementById('char-alignment').value;

    const raceBonus = Rules.races[this.data.race]?.bonuses || {};
    for (const [k, v] of Object.entries(raceBonus)) {
      this.data.stats[k] = (this.data.stats[k] || 10) + v;
    }

    const conMod = Rules.getModifier(this.data.stats.con);
    const dexMod = Rules.getModifier(this.data.stats.dex);

    this.data.maxHp = Rules.getMaxHP(this.data.class, 1, conMod);
    this.data.hp = this.data.maxHp;
    this.data.ac = Rules.getAC(dexMod);

    const clsData = Rules.classes[this.data.class];
    this.data.inventory = [
      { name: 'Sırt Çantası', qty: 1, icon: '🎒' },
      { name: 'Maceracı Rasyonu', qty: 5, icon: '🍞' },
      { name: 'Su Matarası', qty: 1, icon: '💧' },
      { name: 'Meşale', qty: 2, icon: '🔥' },
      { name: 'Altın Kese', qty: 15, icon: '🪙' }
    ];

    if (clsData?.startingEquipment) {
      clsData.startingEquipment.forEach(item => {
        this.data.inventory.push({ name: item, qty: 1, icon: '⚔️' });
      });
    }

    if (clsData?.spellcaster) {
      this.data.spells = ['fire_bolt', 'magic_missile', 'shield'];
      this.data.spellSlots = [2, 0, 0, 0, 0, 0, 0, 0, 0];
    }

    this.data.id = 'char_' + Date.now();
    await Storage.saveCharacter(this.data);
    Adventure.start(this.data);
  }
};
