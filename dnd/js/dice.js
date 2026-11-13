/* ===================================
   DICE ROLLER MODULE
   Zar atma motoru + animasyonlar
   =================================== */

const Dice = {
  history: [],
  maxHistory: 20,

  // Tek zar at
  roll(sides) {
    return Math.floor(Math.random() * sides) + 1;
  },

  // Birden fazla zar at: "2d6+3" formatında
  rollFormula(formula) {
    // Parse: NdS+M veya NdS-M veya NdS
    const match = formula.match(/^(\d+)?d(\d+)([+-]\d+)?$/i);
    if (!match) return { total: 0, rolls: [], formula };

    const count = parseInt(match[1] || '1');
    const sides = parseInt(match[2]);
    const modifier = parseInt(match[3] || '0');

    const rolls = [];
    for (let i = 0; i < count; i++) {
      rolls.push(this.roll(sides));
    }

    const total = rolls.reduce((a, b) => a + b, 0) + modifier;

    return {
      total,
      rolls,
      sides,
      count,
      modifier,
      formula,
      isCrit: sides === 20 && count === 1 && rolls[0] === 20,
      isFumble: sides === 20 && count === 1 && rolls[0] === 1
    };
  },

  // Avantajlı atış (2d20 en yüksek)
  rollAdvantage() {
    const r1 = this.roll(20);
    const r2 = this.roll(20);
    return {
      total: Math.max(r1, r2),
      rolls: [r1, r2],
      sides: 20,
      advantage: true,
      chosen: Math.max(r1, r2),
      discarded: Math.min(r1, r2),
      isCrit: Math.max(r1, r2) === 20,
      isFumble: Math.max(r1, r2) === 1
    };
  },

  // Dezavantajlı atış (2d20 en düşük)
  rollDisadvantage() {
    const r1 = this.roll(20);
    const r2 = this.roll(20);
    return {
      total: Math.min(r1, r2),
      rolls: [r1, r2],
      sides: 20,
      disadvantage: true,
      chosen: Math.min(r1, r2),
      discarded: Math.max(r1, r2),
      isCrit: Math.min(r1, r2) === 20,
      isFumble: Math.min(r1, r2) === 1
    };
  },

  // Yetenek puanı atışı (4d6 en düşüğü at)
  rollAbilityScore() {
    const rolls = [this.roll(6), this.roll(6), this.roll(6), this.roll(6)];
    rolls.sort((a, b) => b - a);
    const total = rolls[0] + rolls[1] + rolls[2]; // en yüksek 3
    return { total, rolls, dropped: rolls[3] };
  },

  // Skill check
  rollSkillCheck(modifier = 0) {
    const d20 = this.roll(20);
    return {
      natural: d20,
      total: d20 + modifier,
      modifier,
      isCrit: d20 === 20,
      isFumble: d20 === 1
    };
  },

  // Attack roll
  rollAttack(attackMod = 0, targetAC = 10) {
    const d20 = this.roll(20);
    const total = d20 + attackMod;
    const isCrit = d20 === 20;
    const isFumble = d20 === 1;
    const hits = isCrit || (!isFumble && total >= targetAC);

    return {
      natural: d20,
      total,
      attackMod,
      targetAC,
      hits,
      isCrit,
      isFumble
    };
  },

  // Damage roll
  rollDamage(formula, isCrit = false) {
    const result = this.rollFormula(formula);
    if (isCrit) {
      // Critical hit: zar sayısını ikiye katla
      const extraRolls = [];
      for (let i = 0; i < result.count; i++) {
        extraRolls.push(this.roll(result.sides));
      }
      result.critRolls = extraRolls;
      result.total += extraRolls.reduce((a, b) => a + b, 0);
      result.isCrit = true;
    }
    return result;
  },

  // Saving throw
  rollSavingThrow(modifier = 0, dc = 10) {
    const d20 = this.roll(20);
    const total = d20 + modifier;
    return {
      natural: d20,
      total,
      dc,
      success: d20 === 20 || (d20 !== 1 && total >= dc),
      isCrit: d20 === 20,
      isFumble: d20 === 1
    };
  },

  // Geçmişe ekle
  addToHistory(type, result) {
    this.history.unshift({
      type,
      result,
      timestamp: Date.now()
    });
    if (this.history.length > this.maxHistory) {
      this.history.pop();
    }
  },

  // UI: Zar atma animasyonu göster
  showRollAnimation(sides, result, container) {
    const resultEl = document.getElementById(container || 'dice-result');
    if (!resultEl) return;

    // Animasyonlu hızlı sayılar
    let count = 0;
    const maxCount = 10;
    const interval = setInterval(() => {
      const fakeVal = Math.floor(Math.random() * sides) + 1;
      resultEl.innerHTML = `<div class="dice-rolling">🎲</div><div class="dice-result-value">${fakeVal}</div><div class="dice-result-label">d${sides} atılıyor...</div>`;
      count++;
      if (count >= maxCount) {
        clearInterval(interval);
        // Gerçek sonucu göster
        let extraClass = '';
        let extraText = '';
        if (sides === 20 && result === 20) {
          extraClass = 'nat20';
          extraText = '⚡ KRİTİK BAŞARI! ⚡';
        } else if (sides === 20 && result === 1) {
          extraClass = 'nat1';
          extraText = '💀 KRİTİK BAŞARISIZLIK! 💀';
        }
        resultEl.innerHTML = `
          <div class="dice-result-value ${extraClass}">${result}</div>
          <div class="dice-result-label">d${sides}${extraText ? ' — ' + extraText : ''}</div>
        `;
      }
    }, 60);
  },

  // Geçmişi render et
  renderHistory(containerId) {
    const container = document.getElementById(containerId || 'dice-history');
    if (!container) return;

    if (this.history.length === 0) {
      container.innerHTML = '<p class="text-muted" style="font-size:12px;text-align:center">Henüz zar atılmadı</p>';
      return;
    }

    container.innerHTML = this.history.map(h => {
      const time = new Date(h.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
      return `<div class="dice-history-entry">
        <span class="roll-type">${time} — ${h.type}</span>
        <span class="roll-value">${h.result.total || h.result.natural || h.result}</span>
      </div>`;
    }).join('');
  }
};
