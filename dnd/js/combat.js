/* ===================================
   COMBAT SYSTEM MODULE
   D&D 5e Savaş Mekaniği, Inisiyatif, Canavarlar
   =================================== */

const Combat = {
  inCombat: false,
  round: 1,
  turnIndex: 0,
  combatants: [], // { id, name, isPlayer, hp, maxHp, ac, initiative, attacks: [...] }

  // Canavar Şablonları (SRD)
  bestiary: {
    goblin: {
      name: 'Goblin Çetecisi',
      hp: 7, maxHp: 7, ac: 15,
      initMod: 2,
      attackMod: 4,
      damage: '1d6+2',
      damageType: 'kesici',
      xp: 50,
      icon: '👺'
    },
    skeleton: {
      name: 'İskelet Savaşçı',
      hp: 13, maxHp: 13, ac: 13,
      initMod: 2,
      attackMod: 4,
      damage: '1d6+2',
      damageType: 'delici',
      xp: 50,
      icon: '💀'
    },
    bandit: {
      name: 'Haydut Muhafız',
      hp: 11, maxHp: 11, ac: 12,
      initMod: 1,
      attackMod: 3,
      damage: '1d6+1',
      damageType: 'kesici',
      xp: 25,
      icon: '🗡️'
    },
    wolf: {
      name: 'Yaban Kurdu',
      hp: 11, maxHp: 11, ac: 13,
      initMod: 2,
      attackMod: 4,
      damage: '2d4+2',
      damageType: 'delici',
      xp: 50,
      icon: '🐺'
    },
    orc: {
      name: 'Ork Berserker',
      hp: 15, maxHp: 15, ac: 13,
      initMod: 1,
      attackMod: 5,
      damage: '1d12+3',
      damageType: 'kesici',
      xp: 100,
      icon: '👹'
    }
  },

  // Savaşı Başlat
  startCombat(enemies = ['goblin']) {
    const char = Adventure.character;
    if (!char) return;

    this.inCombat = true;
    this.round = 1;
    this.turnIndex = 0;
    this.combatants = [];

    // 1. Oyuncu İnisiyatifi
    const dexMod = Rules.getModifier(char.stats.dex);
    const playerInit = Dice.roll(20) + dexMod;

    this.combatants.push({
      id: 'player',
      name: char.name,
      isPlayer: true,
      hp: char.hp,
      maxHp: char.maxHp,
      ac: char.ac,
      initiative: playerInit,
      attackMod: Math.max(Rules.getModifier(char.stats.str), Rules.getModifier(char.stats.dex)) + Rules.getProficiencyBonus(char.level),
      icon: '🛡️'
    });

    // 2. Düşmanları Ekle ve İnisiyatiflerini At
    enemies.forEach((enemyKey, idx) => {
      const template = this.bestiary[enemyKey] || this.bestiary.goblin;
      const enemyInit = Dice.roll(20) + template.initMod;
      this.combatants.push({
        id: `enemy_${idx}`,
        name: `${template.name} #${idx + 1}`,
        isPlayer: false,
        hp: template.hp,
        maxHp: template.maxHp,
        ac: template.ac,
        initiative: enemyInit,
        attackMod: template.attackMod,
        damage: template.damage,
        xp: template.xp,
        icon: template.icon
      });
    });

    // İnisiyatife göre sırala (en yüksek önce)
    this.combatants.sort((a, b) => b.initiative - a.initiative);

    // Paneli Aç
    const panel = document.getElementById('combat-panel');
    if (panel) panel.style.display = 'block';

    Adventure.addSystemMessage(`⚔️ <strong>Savaş Başladı!</strong> İnisiyatif sırası belirlendi.`);
    this.renderCombatUI();

    // İlk tur kimde?
    this.checkTurn();
  },

  // Savaş Arayüzünü Çiz
  renderCombatUI() {
    const tracker = document.getElementById('initiative-tracker');
    const enemiesDiv = document.getElementById('combat-enemies');
    if (!tracker || !enemiesDiv) return;

    // Tracker
    tracker.innerHTML = this.combatants.map((c, idx) => `
      <div class="init-entry ${idx === this.turnIndex ? 'active-turn' : ''} ${!c.isPlayer ? 'enemy' : ''}">
        <span class="init-order">${c.initiative}</span>
        <span class="init-name">${c.icon} ${c.name}</span>
        <span class="init-hp-mini">${c.hp}/${c.maxHp} HP</span>
      </div>
    `).join('');

    // Düşman Kartları
    const livingEnemies = this.combatants.filter(c => !c.isPlayer && c.hp > 0);
    enemiesDiv.innerHTML = livingEnemies.map(enemy => {
      const pct = Math.max(0, (enemy.hp / enemy.maxHp) * 100);
      return `
        <div class="enemy-card" id="card-${enemy.id}">
          <div class="enemy-card-header">
            <span class="enemy-name">${enemy.icon} ${enemy.name}</span>
            <span class="enemy-cr">AC ${enemy.ac}</span>
          </div>
          <div class="enemy-hp-bar">
            <div class="enemy-hp-fill" style="width: ${pct}%"></div>
          </div>
          <div class="enemy-hp-text">${enemy.hp} / ${enemy.maxHp} HP</div>
          <div class="combat-actions">
            <button class="btn btn-sm btn-primary" onclick="Combat.playerAttack('${enemy.id}')">
              🗡️ Saldır (Melee)
            </button>
            <button class="btn btn-sm btn-secondary" onclick="Combat.playerCastSpell('${enemy.id}')">
              ✨ Büyü Fırlat
            </button>
          </div>
        </div>
      `;
    }).join('');
  },

  // Tur Kontrolü
  async checkTurn() {
    if (!this.inCombat) return;

    const current = this.combatants[this.turnIndex];
    if (!current) {
      this.nextTurn();
      return;
    }

    if (current.isPlayer) {
      Adventure.addSystemMessage(`👉 <strong>Sıra Sende (${current.name})!</strong> Eylemini seç.`);
    } else {
      // Düşman Yapay Zekası
      await this.enemyTurn(current);
    }
  },

  nextTurn() {
    this.turnIndex = (this.turnIndex + 1) % this.combatants.length;
    if (this.turnIndex === 0) {
      this.round++;
      Adventure.addSystemMessage(`🔄 <strong>${this.round}. Tur Başladı!</strong>`);
    }
    this.renderCombatUI();
    this.checkTurn();
  },

  // Oyuncunun Saldırısı
  playerAttack(targetId) {
    const player = this.combatants.find(c => c.isPlayer);
    const target = this.combatants.find(c => c.id === targetId);

    if (!player || !target) return;

    // Saldırı Zarı (d20 + attackMod vs AC)
    const attackRoll = Dice.rollAttack(player.attackMod, target.ac);

    if (attackRoll.hits) {
      // Hasar zarı (örn 1d8 + STR mod)
      const strMod = Rules.getModifier(Adventure.character.stats.str);
      const dmgResult = Dice.rollDamage(`1d8+${Math.max(1, strMod)}`, attackRoll.isCrit);
      target.hp = Math.max(0, target.hp - dmgResult.total);

      Adventure.addSystemMessage(`🎯 <strong>${player.name}</strong> saldırdı! Zar: <strong>${attackRoll.natural}</strong> (+${player.attackMod} = ${attackRoll.total} vs AC ${target.ac}). <strong>İSABET!</strong> <span style="color:var(--danger)">${dmgResult.total} Hasar</span> vurdu.`);

      if (target.hp <= 0) {
        Adventure.addSystemMessage(`💀 <strong>${target.name}</strong> yere serildi!`);
        this.checkVictory();
      }
    } else {
      Adventure.addSystemMessage(`💨 <strong>${player.name}</strong> saldırdı fakat ISKALADI! (Zar: ${attackRoll.natural} vs AC ${target.ac})`);
    }

    this.renderCombatUI();
    this.nextTurn();
  },

  // Oyuncunun Büyü Kullanımı
  playerCastSpell(targetId) {
    const target = this.combatants.find(c => c.id === targetId);
    if (!target) return;

    // Fire Bolt örneği
    const intMod = Rules.getModifier(Adventure.character.stats.int);
    const attackRoll = Dice.rollAttack(intMod + Rules.getProficiencyBonus(Adventure.character.level), target.ac);

    if (attackRoll.hits) {
      const dmg = Dice.rollDamage('1d10', attackRoll.isCrit);
      target.hp = Math.max(0, target.hp - dmg.total);
      Adventure.addSystemMessage(`🔥 <strong>Fire Bolt!</strong> ${target.name} alevler içinde kaldı! <span style="color:var(--danger)">${dmg.total} Ateş Hasarı</span>.`);
      if (target.hp <= 0) {
        Adventure.addSystemMessage(`💀 <strong>${target.name}</strong> küle döndü!`);
        this.checkVictory();
      }
    } else {
      Adventure.addSystemMessage(`💨 Büyü hedefini ıskaladı.`);
    }

    this.renderCombatUI();
    this.nextTurn();
  },

  // Düşman Yapay Zeka Turu
  async enemyTurn(enemy) {
    if (enemy.hp <= 0) {
      this.nextTurn();
      return;
    }

    const player = this.combatants.find(c => c.isPlayer);
    if (!player) return;

    Adventure.addSystemMessage(`⚔️ <strong>${enemy.name}</strong> sana doğru atılıyor...`);
    await new Promise(r => setTimeout(r, 900));

    // Saldırı Zarı
    const attackRoll = Dice.rollAttack(enemy.attackMod, player.ac);

    if (attackRoll.hits) {
      const dmg = Dice.rollDamage(enemy.damage || '1d6+1', attackRoll.isCrit);
      player.hp = Math.max(0, player.hp - dmg.total);
      Adventure.character.hp = player.hp;
      Adventure.updateTopBar();

      Adventure.addSystemMessage(`💥 <strong>${enemy.name}</strong> vurdu! Zar: ${attackRoll.natural} (Toplam ${attackRoll.total} vs AC ${player.ac}). <span style="color:var(--danger)">${dmg.total} Hasar</span> aldın! (Kalan HP: ${player.hp}/${player.maxHp})`);

      if (player.hp <= 0) {
        Adventure.addSystemMessage(`🚨 <strong>Yere Yığıldın!</strong> Can puanın tükendi!`);
        this.endCombat(false);
        return;
      }
    } else {
      Adventure.addSystemMessage(`🛡️ <strong>${enemy.name}</strong> saldırdı fakat zırhından sekti! (Iskaladı)`);
    }

    this.nextTurn();
  },

  // Zafer Kontrolü
  checkVictory() {
    const livingEnemies = this.combatants.filter(c => !c.isPlayer && c.hp > 0);
    if (livingEnemies.length === 0) {
      const totalXP = this.combatants.filter(c => !c.isPlayer).reduce((sum, c) => sum + (c.xp || 50), 0);
      Adventure.addSystemMessage(`🏆 <strong>ZAFER!</strong> Tüm düşmanlar alt edildi! <strong>+${totalXP} XP</strong> kazandın.`);
      Adventure.character.xp = (Adventure.character.xp || 0) + totalXP;
      Adventure.updateTopBar();
      Storage.saveCharacter(Adventure.character);
      this.endCombat(true);
    }
  },

  // Savaşı Bitir
  endCombat(won) {
    this.inCombat = false;
    const panel = document.getElementById('combat-panel');
    if (panel) panel.style.display = 'none';

    if (won) {
      Adventure.sendAutoPromptToAI("Savaş sona erdi ve düşmanları yendim! Şimdi ne görüyorum?");
    }
  }
};
