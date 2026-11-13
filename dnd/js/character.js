/* ===================================
   CHARACTER CREATION & MANAGEMENT MODULE
   Karakter sihirbazı, portre yükleme, stat hesaplama
   =================================== */

const CharacterCreate = {
  currentStep: 1,
  data: {
    id: null,
    name: '',
    portrait: null,
    race: null,
    raceName: '',
    class: null,
    className: '',
    stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    statMethod: 'standard', // 'standard', 'pointbuy', 'roll'
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

  nextStep(step) {
    if (step > this.currentStep) {
      // Doğrulama
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

    // Ekran adımlarını güncelle
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

  // Portre Yükleme
  setupPortraitUpload() {
    const uploadArea = document.getElementById('portrait-upload');
    const input = document.getElementById('portrait-input');
    const preview = document.getElementById('portrait-preview');

    if (!uploadArea || !input) return;

    uploadArea.onclick = () => input.click();

    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        alert('Lütfen geçerli bir görsel dosyası seçin!');
        return;
      }

      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          // Resmi canvas ile optimize et / crop et
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

  // Irkları Listele
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

    // Bilgi panelini aç
    const info = document.getElementById('race-info');
    document.getElementById('race-info-name').textContent = `${race.icon} ${race.name}`;
    document.getElementById('race-info-desc').textContent = race.desc;

    // Bonuslar
    const bonuses = Object.entries(race.bonuses || {})
      .map(([st, val]) => `<strong>${st.toUpperCase()} +${val}</strong>`)
      .join(', ');
    document.getElementById('race-info-bonuses').innerHTML = `<p style="margin-top:8px">✨ <strong>Yetenek Bonusları:</strong> ${bonuses || 'Özel'}</p>`;

    // Özellikler
    document.getElementById('race-info-traits').innerHTML = `<p style="margin-top:6px">🧬 <strong>Özellikler:</strong> ${race.traits.join(', ')}</p>`;
    info.style.display = 'block';

    const nextBtn = document.getElementById('btn-race-next');
    if (nextBtn) nextBtn.disabled = false;
  },

  // Sınıfları Listele
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
      <p style="margin-top:8px">❤️ <strong>Can Zarı (Hit Die):</strong> d${cls.hitDie}</p>
      <p style="margin-top:4px">🛡️ <strong>Kurtarma Atışları:</strong> ${cls.savingThrows.map(s => s.toUpperCase()).join(', ')}</p>
      <p style="margin-top:4px">⚡ <strong>1. Seviye Özellikleri:</strong> ${cls.features[1]?.join(', ') || 'Yok'}</p>
    `;
    info.style.display = 'block';

    const nextBtn = document.getElementById('btn-class-next');
    if (nextBtn) nextBtn.disabled = false;
  },

  // Stat Dağıtımı
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
        summary.innerHTML = `<p style="font-size:13px;color:var(--accent);margin-top:10px">Kalan Puan Bütçesi: <strong>${this.data.pointBuyRemaining} / 27</strong></p>`;
      } else if (this.data.statMethod === 'roll') {
        summary.innerHTML = `<button class="btn btn-sm btn-secondary" onclick="CharacterCreate.rollAllStats()" style="margin-top:10px">🎲 Zarları Yeniden At (4d6 drop lowest)</button>`;
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

  // Backstory Üretici
  async generateBackstory() {
    const btn = event?.target;
    if (btn) btn.disabled = true;
    const bg = document.getElementById('char-background').value;
    const name = this.data.name;
    const race = this.data.raceName || 'İnsan';
    const cls = this.data.className || 'Savaşçı';

    const textEl = document.getElementById('char-backstory');
    textEl.value = "Yapay zeka hikayeyi dokuyor...";

    try {
      const generated = await AIEngine.generateBackstory(race, cls, bg, name);
      textEl.value = generated;
    } catch (e) {
      textEl.value = `${name}, ${race} soyundan gelen bir ${cls}. Macera dolu bir arayış içinde.`;
    } finally {
      if (btn) btn.disabled = false;
    }
  },

  // Karakteri Sonuçlandır ve Kaydet
  async finalize() {
    this.data.background = document.getElementById('char-background').value;
    this.data.backstory = document.getElementById('char-backstory').value;
    this.data.alignment = document.getElementById('char-alignment').value;

    // Irk bonuslarını kalıcı olarak statlara ekle
    const raceBonus = Rules.races[this.data.race]?.bonuses || {};
    for (const [k, v] of Object.entries(raceBonus)) {
      this.data.stats[k] = (this.data.stats[k] || 10) + v;
    }

    const conMod = Rules.getModifier(this.data.stats.con);
    const dexMod = Rules.getModifier(this.data.stats.dex);

    // HP ve AC hesaplama
    this.data.maxHp = Rules.getMaxHP(this.data.class, 1, conMod);
    this.data.hp = this.data.maxHp;
    this.data.ac = Rules.getAC(dexMod);

    // Başlangıç Envanteri
    const clsData = Rules.classes[this.data.class];
    this.data.inventory = [
      { name: 'Sırt Çantası', qty: 1, icon: '🎒' },
      { name: 'Maceracı Rasyonu (1 Gün)', qty: 5, icon: '🍞' },
      { name: 'Su Matarası', qty: 1, icon: '💧' },
      { name: 'Meşale', qty: 2, icon: '🔥' },
      { name: 'Altın Kese', qty: 15, icon: '🪙' }
    ];

    if (clsData?.startingEquipment) {
      clsData.startingEquipment.forEach(item => {
        this.data.inventory.push({ name: item, qty: 1, icon: '⚔️' });
      });
    }

    // Büyücü ise temel büyüler
    if (clsData?.spellcaster) {
      this.data.spells = ['fire_bolt', 'magic_missile', 'shield'];
      this.data.spellSlots = [2, 0, 0, 0, 0, 0, 0, 0, 0];
    }

    // ID Ata ve Kaydet
    this.data.id = 'char_' + Date.now();
    await Storage.saveCharacter(this.data);

    // Macerayı Başlat!
    Adventure.start(this.data);
  }
};
