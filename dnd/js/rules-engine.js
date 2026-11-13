/* ===================================
   D&D 5e RULES ENGINE
   Tüm D&D 5e SRD kuralları
   =================================== */

const Rules = {
  // ===== IRKLAR =====
  races: {
    human: {
      name: 'İnsan (Human)',
      icon: '🧑',
      desc: 'Çok yönlü ve uyumlu. Tüm yetenek puanlarına +1 bonus alır.',
      bonuses: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 },
      speed: 30,
      traits: ['Ekstra Dil'],
      languages: ['Ortak', 'Seçime Bağlı +1'],
      size: 'Orta'
    },
    elf: {
      name: 'Elf',
      icon: '🧝',
      desc: 'Zarif ve uzun ömürlü. Yüksek çeviklik ve karanlık görüş.',
      bonuses: { dex: 2 },
      speed: 30,
      traits: ['Karanlık Görüş (60ft)', 'Fey Ancestry', 'Trance (4 saat uyku)'],
      languages: ['Ortak', 'Elfçe'],
      size: 'Orta',
      subraces: {
        high_elf: { name: 'Yüksek Elf', bonuses: { int: 1 }, traits: ['Elf Büyüsü (1 cantrip)'] },
        wood_elf: { name: 'Orman Elfi', bonuses: { wis: 1 }, traits: ['Hızlı (35ft)', 'Doğa Gizlenmesi'] },
        dark_elf: { name: 'Drow', bonuses: { cha: 1 }, traits: ['Üstün Karanlık Görüş (120ft)', 'Güneş Hassasiyeti', 'Drow Büyüsü'] }
      }
    },
    dwarf: {
      name: 'Cüce (Dwarf)',
      icon: '⛏️',
      desc: 'Sağlam ve dayanıklı. Taş ve metal işçiliğinde usta.',
      bonuses: { con: 2 },
      speed: 25,
      traits: ['Karanlık Görüş (60ft)', 'Cüce Dayanıklılığı (zehire karşı avantaj)', 'Taş Uzmanlığı'],
      languages: ['Ortak', 'Cücece'],
      size: 'Orta',
      subraces: {
        hill_dwarf: { name: 'Tepe Cücesi', bonuses: { wis: 1 }, traits: ['Cüce Azmi (+1 HP/level)'] },
        mountain_dwarf: { name: 'Dağ Cücesi', bonuses: { str: 2 }, traits: ['Zırh Eğitimi (hafif ve orta)'] }
      }
    },
    halfling: {
      name: 'Halfling',
      icon: '🍀',
      desc: 'Küçük ama cesur. Doğal şans ve gizlenme yeteneği.',
      bonuses: { dex: 2 },
      speed: 25,
      traits: ['Şanslı (1 atınca tekrar at)', 'Cesur (korku saving throw avantajı)', 'Halfling Çevikliği'],
      languages: ['Ortak', 'Halflingce'],
      size: 'Küçük',
      subraces: {
        lightfoot: { name: 'Hafif Ayak', bonuses: { cha: 1 }, traits: ['Doğal Gizlenme'] },
        stout: { name: 'Gürbüz', bonuses: { con: 1 }, traits: ['Gürbüz Dayanıklılık (zehire karşı)'] }
      }
    },
    dragonborn: {
      name: 'Dragonborn',
      icon: '🐲',
      desc: 'Ejderha soyundan gelen savaşçılar. Nefes silahı.',
      bonuses: { str: 2, cha: 1 },
      speed: 30,
      traits: ['Ejderha Soyu (element seçimi)', 'Nefes Silahı (2d6)', 'Hasara Direnç'],
      languages: ['Ortak', 'Ejderce'],
      size: 'Orta'
    },
    tiefling: {
      name: 'Tiefling',
      icon: '😈',
      desc: 'Şeytani soydan gelen karizmatik varlıklar. Doğuştan büyü.',
      bonuses: { cha: 2, int: 1 },
      speed: 30,
      traits: ['Karanlık Görüş (60ft)', 'Cehennem Direnci (ateş hasarına direnç)', 'Cehennem Mirası (Thaumaturgy cantrip)'],
      languages: ['Ortak', 'Cehennemce'],
      size: 'Orta'
    },
    gnome: {
      name: 'Cüce (Gnome)',
      icon: '🍄',
      desc: 'Meraklı ve zeki küçük yaratıklar. Büyüye karşı dirençli.',
      bonuses: { int: 2 },
      speed: 25,
      traits: ['Karanlık Görüş (60ft)', 'Gnome Kurnazlığı (INT, WIS, CHA büyü savunma avantajı)'],
      languages: ['Ortak', 'Gnomca'],
      size: 'Küçük',
      subraces: {
        forest_gnome: { name: 'Orman Gnome', bonuses: { dex: 1 }, traits: ['Doğal Illüzyonist', 'Küçük Hayvanlarla Konuşma'] },
        rock_gnome: { name: 'Kaya Gnome', bonuses: { con: 1 }, traits: ['Tamirci Bilgisi', 'Cihaz Yapımı'] }
      }
    },
    half_elf: {
      name: 'Yarı Elf (Half-Elf)',
      icon: '🧝‍♂️',
      desc: 'İki dünyanın en iyisi. Karizmatik ve çok yönlü.',
      bonuses: { cha: 2 },
      extraBonuses: 2, // 2 farklı yetenek puanına +1
      speed: 30,
      traits: ['Karanlık Görüş (60ft)', 'Fey Ancestry', '2 Ekstra Beceri'],
      languages: ['Ortak', 'Elfçe', 'Seçime Bağlı +1'],
      size: 'Orta'
    },
    half_orc: {
      name: 'Yarı Ork (Half-Orc)',
      icon: '👹',
      desc: 'Güçlü ve dayanıklı. Öfkeli savaşçılar.',
      bonuses: { str: 2, con: 1 },
      speed: 30,
      traits: ['Karanlık Görüş (60ft)', 'Amansız Dayanıklılık (0 HP yerine 1 HP)', 'Vahşi Saldırılar (ekstra zar critical hit)'],
      languages: ['Ortak', 'Orkça'],
      size: 'Orta'
    }
  },

  // ===== SINIFLAR =====
  classes: {
    fighter: {
      name: 'Savaşçı (Fighter)',
      icon: '⚔️',
      desc: 'Her türlü silah ve zırhta usta. Savaş alanının kralı.',
      hitDie: 10,
      primaryAbility: 'str',
      savingThrows: ['str', 'con'],
      armorProf: ['Hafif', 'Orta', 'Ağır', 'Kalkan'],
      weaponProf: ['Basit', 'Savaş'],
      skills: ['Akrobasi', 'Hayvan Bakımı', 'Atletizm', 'Tarih', 'Kavrayış', 'Gözdağı', 'Algı', 'Hayatta Kalma'],
      skillCount: 2,
      features: {
        1: ['Fighting Style', 'İkinci Rüzgar (Second Wind)'],
        2: ['Action Surge (1 kullanım)'],
        3: ['Martial Archetype'],
        5: ['Extra Attack'],
        9: ['Indomitable (1 kullanım)']
      },
      startingEquipment: ['Zincir Zırh veya Deri Zırh', 'Savaş Silahı + Kalkan veya 2 Savaş Silahı', 'Hafif Arbalet veya 2 El Baltası', 'Explorer Pack veya Dungeoneer Pack'],
      spellcaster: false
    },
    wizard: {
      name: 'Büyücü (Wizard)',
      icon: '🧙',
      desc: 'Arcane büyünün ustası. Büyü kitabından güç alır.',
      hitDie: 6,
      primaryAbility: 'int',
      savingThrows: ['int', 'wis'],
      armorProf: [],
      weaponProf: ['Hançer', 'Dart', 'Sapan', 'Asa', 'Hafif Arbalet'],
      skills: ['Arcana', 'Tarih', 'Kavrayış', 'Soruşturma', 'Tıp', 'Din'],
      skillCount: 2,
      features: {
        1: ['Büyü Yapımı (Spellcasting)', 'Arcane Kurtarma (Arcane Recovery)'],
        2: ['Arcane Geleneği (Arcane Tradition)'],
        18: ['Büyü Ustalığı (Spell Mastery)'],
        20: ['İmza Büyüleri (Signature Spells)']
      },
      startingEquipment: ['Asa veya Hançer', 'Component Pouch veya Arcane Focus', 'Scholar Pack veya Explorer Pack', 'Büyü Kitabı'],
      spellcaster: true,
      spellAbility: 'int',
      cantripsKnown: { 1: 3, 4: 4, 10: 5 },
      spellSlots: {
        1: [2,0,0,0,0,0,0,0,0],
        2: [3,0,0,0,0,0,0,0,0],
        3: [4,2,0,0,0,0,0,0,0],
        4: [4,3,0,0,0,0,0,0,0],
        5: [4,3,2,0,0,0,0,0,0]
      }
    },
    rogue: {
      name: 'Hırsız (Rogue)',
      icon: '🗡️',
      desc: 'Gizlilik ve kurnazlık ustası. Ölümcül sneak attack.',
      hitDie: 8,
      primaryAbility: 'dex',
      savingThrows: ['dex', 'int'],
      armorProf: ['Hafif'],
      weaponProf: ['Basit', 'El Arbalet', 'Uzun Kılıç', 'Rapier', 'Kısa Kılıç'],
      skills: ['Akrobasi', 'Atletizm', 'Aldatma', 'Kavrayış', 'Gözdağı', 'Soruşturma', 'Algı', 'Performans', 'İkna', 'El Çabukluğu', 'Gizlenme'],
      skillCount: 4,
      features: {
        1: ['Uzmanlık (Expertise)', 'Sinsi Saldırı (Sneak Attack) 1d6', 'Hırsız Jargonu (Thieves Cant)'],
        2: ['Kurnaz Hareket (Cunning Action)'],
        3: ['Roguish Archetype'],
        5: ['Uncanny Dodge'],
        7: ['Evasion']
      },
      startingEquipment: ['Rapier veya Kısa Kılıç', 'Kısa Yay + 20 Ok veya Kısa Kılıç', 'Burglar Pack / Dungeoneer Pack / Explorer Pack', 'Deri Zırh, 2 Hançer, Hırsız Aletleri'],
      spellcaster: false
    },
    cleric: {
      name: 'Rahip (Cleric)',
      icon: '✝️',
      desc: 'İlahi güçle donatılmış savaşçı-iyileştirici.',
      hitDie: 8,
      primaryAbility: 'wis',
      savingThrows: ['wis', 'cha'],
      armorProf: ['Hafif', 'Orta', 'Kalkan'],
      weaponProf: ['Basit'],
      skills: ['Tarih', 'Kavrayış', 'Tıp', 'İkna', 'Din'],
      skillCount: 2,
      features: {
        1: ['Büyü Yapımı (Spellcasting)', 'İlahi Alan (Divine Domain)'],
        2: ['Kanal İlahiyat (Channel Divinity) 1/rest', 'İlahi Alan Özelliği'],
        5: ['Ölüleri Yok Et (Destroy Undead) CR 1/2'],
        10: ['İlahi Müdahale (Divine Intervention)']
      },
      startingEquipment: ['Topuz veya Savaş Çekici', 'Pullu Zırh / Deri Zırh / Zincir Zırh', 'Hafif Arbalet + 20 Cıvata veya Basit Silah', 'Priest Pack veya Explorer Pack', 'Kalkan ve Kutsal Sembol'],
      spellcaster: true,
      spellAbility: 'wis',
      cantripsKnown: { 1: 3, 4: 4, 10: 5 },
      spellSlots: {
        1: [2,0,0,0,0,0,0,0,0],
        2: [3,0,0,0,0,0,0,0,0],
        3: [4,2,0,0,0,0,0,0,0],
        4: [4,3,0,0,0,0,0,0,0],
        5: [4,3,2,0,0,0,0,0,0]
      }
    },
    barbarian: {
      name: 'Barbar (Barbarian)',
      icon: '🪓',
      desc: 'Öfkeli ve acımasız savaşçı. Rage gücüyle savaşır.',
      hitDie: 12,
      primaryAbility: 'str',
      savingThrows: ['str', 'con'],
      armorProf: ['Hafif', 'Orta', 'Kalkan'],
      weaponProf: ['Basit', 'Savaş'],
      skills: ['Hayvan Bakımı', 'Atletizm', 'Gözdağı', 'Doğa', 'Algı', 'Hayatta Kalma'],
      skillCount: 2,
      features: {
        1: ['Öfke (Rage) — +2 hasar, fiziksel hasara direnç', 'Zırhsız Savunma (Unarmored Defense)'],
        2: ['Pervasız Saldırı (Reckless Attack)', 'Tehlike Algısı (Danger Sense)'],
        3: ['Primal Path'],
        5: ['Extra Attack, Fast Movement (+10ft)']
      },
      startingEquipment: ['Büyük Balta veya Savaş Silahı', 'El Baltası x2 veya Basit Silah', 'Explorer Pack, Cirit x4'],
      spellcaster: false,
      ragesPerDay: { 1: 2, 3: 3, 6: 4, 12: 5, 17: 6, 20: 999 }
    },
    ranger: {
      name: 'Avcı (Ranger)',
      icon: '🏹',
      desc: 'Doğanın koruyucusu. İz sürme ve av ustası.',
      hitDie: 10,
      primaryAbility: 'dex',
      savingThrows: ['str', 'dex'],
      armorProf: ['Hafif', 'Orta', 'Kalkan'],
      weaponProf: ['Basit', 'Savaş'],
      skills: ['Hayvan Bakımı', 'Atletizm', 'Kavrayış', 'Soruşturma', 'Doğa', 'Algı', 'Gizlenme', 'Hayatta Kalma'],
      skillCount: 3,
      features: {
        1: ['Favored Enemy', 'Natural Explorer'],
        2: ['Büyü Yapımı (Spellcasting)', 'Fighting Style'],
        3: ['Ranger Archetype', 'Primeval Awareness'],
        5: ['Extra Attack']
      },
      startingEquipment: ['Pullu Zırh veya Deri Zırh', 'Kısa Kılıç x2 veya Basit Silah x2', 'Dungeoneer Pack veya Explorer Pack', 'Uzun Yay + 20 Ok'],
      spellcaster: true,
      spellAbility: 'wis',
      spellsKnown: { 2: 2, 3: 3, 5: 4, 7: 5, 9: 6 },
      spellSlots: {
        2: [2,0,0,0,0],
        3: [3,0,0,0,0],
        5: [4,2,0,0,0]
      }
    },
    paladin: {
      name: 'Paladin',
      icon: '🛡️',
      desc: 'Kutsal yeminle bağlı savaşçı. Ilahi güç ve kılıç.',
      hitDie: 10,
      primaryAbility: 'str',
      savingThrows: ['wis', 'cha'],
      armorProf: ['Hafif', 'Orta', 'Ağır', 'Kalkan'],
      weaponProf: ['Basit', 'Savaş'],
      skills: ['Atletizm', 'Kavrayış', 'Gözdağı', 'Tıp', 'İkna', 'Din'],
      skillCount: 2,
      features: {
        1: ['İlahi His (Divine Sense)', 'Ellerin Şifası (Lay on Hands)'],
        2: ['Büyü Yapımı (Spellcasting)', 'Fighting Style', 'İlahi Vuruş (Divine Smite)'],
        3: ['İlahi Sağlık (Divine Health)', 'Kutsal Yemin (Sacred Oath)'],
        5: ['Extra Attack'],
        6: ['Koruyucu Aura (Aura of Protection)']
      },
      startingEquipment: ['Savaş Silahı + Kalkan veya 2 Savaş Silahı', 'Cirit x5 veya Basit Yakın Silah', 'Priest Pack veya Explorer Pack', 'Zincir Zırh, Kutsal Sembol'],
      spellcaster: true,
      spellAbility: 'cha',
      spellSlots: {
        2: [2,0,0,0,0],
        5: [4,2,0,0,0],
        9: [4,3,2,0,0]
      }
    },
    warlock: {
      name: 'Warlock',
      icon: '🔮',
      desc: 'Güçlü bir varlıkla pakt yapan büyücü. Eldritch güçler.',
      hitDie: 8,
      primaryAbility: 'cha',
      savingThrows: ['wis', 'cha'],
      armorProf: ['Hafif'],
      weaponProf: ['Basit'],
      skills: ['Arcana', 'Aldatma', 'Tarih', 'Gözdağı', 'Soruşturma', 'Doğa', 'Din'],
      skillCount: 2,
      features: {
        1: ['Otherworldly Patron', 'Pact Magic'],
        2: ['Eldritch Invocations'],
        3: ['Pact Boon'],
        11: ['Mystic Arcanum (6th level)']
      },
      startingEquipment: ['Hafif Arbalet + 20 Cıvata veya Basit Silah', 'Component Pouch veya Arcane Focus', 'Scholar Pack veya Dungeoneer Pack', 'Deri Zırh, Basit Silah, 2 Hançer'],
      spellcaster: true,
      spellAbility: 'cha',
      cantripsKnown: { 1: 2, 4: 3, 10: 4 },
      pactSlots: { 1: 1, 2: 2, 11: 3, 17: 4 },
      pactSlotLevel: { 1: 1, 3: 2, 5: 3, 7: 4, 9: 5 }
    },
    bard: {
      name: 'Ozan (Bard)',
      icon: '🎵',
      desc: 'Müzik ve sözlerle büyü yapan karizmatik sanatçı.',
      hitDie: 8,
      primaryAbility: 'cha',
      savingThrows: ['dex', 'cha'],
      armorProf: ['Hafif'],
      weaponProf: ['Basit', 'El Arbalet', 'Uzun Kılıç', 'Rapier', 'Kısa Kılıç'],
      skills: ['Herhangi 3 beceri'],
      skillCount: 3,
      features: {
        1: ['Büyü Yapımı (Spellcasting)', 'Bardik İlham (Bardic Inspiration) d6'],
        2: ['Herşeyin Ustası (Jack of All Trades)', 'Dinlenme Şarkısı (Song of Rest) d6'],
        3: ['Bard Koleji', 'Uzmanlık (Expertise)'],
        5: ['İlham Kaynağı (Font of Inspiration)']
      },
      startingEquipment: ['Rapier / Uzun Kılıç / Basit Silah', 'Diplomat Pack veya Entertainer Pack', 'Lute veya Müzik Aleti', 'Deri Zırh, Hançer'],
      spellcaster: true,
      spellAbility: 'cha',
      cantripsKnown: { 1: 2, 4: 3, 10: 4 },
      spellsKnown: { 1: 4, 2: 5, 3: 6, 4: 7, 5: 8 },
      spellSlots: {
        1: [2,0,0,0,0,0,0,0,0],
        2: [3,0,0,0,0,0,0,0,0],
        3: [4,2,0,0,0,0,0,0,0],
        4: [4,3,0,0,0,0,0,0,0],
        5: [4,3,2,0,0,0,0,0,0]
      }
    }
  },

  // ===== YETENEK PUANLARI =====
  abilities: {
    str: { name: 'Güç (STR)', icon: '💪', desc: 'Fiziksel güç, yakın dövüş' },
    dex: { name: 'Çeviklik (DEX)', icon: '🏃', desc: 'Refleks, denge, hız' },
    con: { name: 'Dayanıklılık (CON)', icon: '🛡️', desc: 'Sağlık, tahammül' },
    int: { name: 'Zeka (INT)', icon: '🧠', desc: 'Mantık, hafıza, öğrenme' },
    wis: { name: 'Bilgelik (WIS)', icon: '👁️', desc: 'Sezgi, algı, irade' },
    cha: { name: 'Karizma (CHA)', icon: '✨', desc: 'Etkileme, liderlik' }
  },

  standardArray: [15, 14, 13, 12, 10, 8],
  pointBuyDefault: 8,
  pointBuyMax: 15,
  pointBuyBudget: 27,
  pointBuyCost: { 8:0, 9:1, 10:2, 11:3, 12:4, 13:5, 14:7, 15:9 },

  // ===== HESAPLAMALAR =====
  getModifier(score) {
    return Math.floor((score - 10) / 2);
  },

  getModifierStr(score) {
    const mod = this.getModifier(score);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  },

  getProficiencyBonus(level) {
    if (level <= 4) return 2;
    if (level <= 8) return 3;
    if (level <= 12) return 4;
    if (level <= 16) return 5;
    return 6;
  },

  getMaxHP(classKey, level, conMod) {
    const cls = this.classes[classKey];
    if (!cls) return 10;
    // Level 1: max hit die + CON mod
    // Level 2+: average hit die + CON mod per level
    const firstLevel = cls.hitDie + conMod;
    const perLevel = Math.floor(cls.hitDie / 2) + 1 + conMod;
    return firstLevel + (Math.max(0, level - 1) * perLevel);
  },

  getAC(dexMod, armorType = 'none', hasShield = false) {
    let ac = 10 + dexMod; // Unarmored
    switch (armorType) {
      case 'padded': case 'leather': ac = 11 + dexMod; break;
      case 'studded': ac = 12 + dexMod; break;
      case 'hide': ac = 12 + Math.min(dexMod, 2); break;
      case 'chain_shirt': ac = 13 + Math.min(dexMod, 2); break;
      case 'scale': ac = 14 + Math.min(dexMod, 2); break;
      case 'breastplate': ac = 14 + Math.min(dexMod, 2); break;
      case 'half_plate': ac = 15 + Math.min(dexMod, 2); break;
      case 'ring': ac = 14; break;
      case 'chain': ac = 16; break;
      case 'splint': ac = 17; break;
      case 'plate': ac = 18; break;
    }
    if (hasShield) ac += 2;
    return ac;
  },

  // XP tablosu
  xpTable: {
    1: 0, 2: 300, 3: 900, 4: 2700, 5: 6500,
    6: 14000, 7: 23000, 8: 34000, 9: 48000, 10: 64000,
    11: 85000, 12: 100000, 13: 120000, 14: 140000, 15: 165000,
    16: 195000, 17: 225000, 18: 265000, 19: 305000, 20: 355000
  },

  getLevelFromXP(xp) {
    for (let lvl = 20; lvl >= 1; lvl--) {
      if (xp >= this.xpTable[lvl]) return lvl;
    }
    return 1;
  },

  // ===== BÜYÜLER (TEMEL) =====
  spells: {
    // Cantrips (Level 0)
    fire_bolt: { name: 'Fire Bolt', level: 0, school: 'Evocation', castTime: '1 Action', range: '120ft', damage: '1d10 ateş', desc: 'Hedefe bir ateş mermisi fırlat.' },
    mage_hand: { name: 'Mage Hand', level: 0, school: 'Conjuration', castTime: '1 Action', range: '30ft', desc: 'Görünmez bir el oluştur.' },
    prestidigitation: { name: 'Prestidigitation', level: 0, school: 'Transmutation', castTime: '1 Action', range: '10ft', desc: 'Küçük büyülü efektler oluştur.' },
    sacred_flame: { name: 'Sacred Flame', level: 0, school: 'Evocation', castTime: '1 Action', range: '60ft', damage: '1d8 radiant', desc: 'Alev benzeri parıltı hedefe iner.' },
    eldritch_blast: { name: 'Eldritch Blast', level: 0, school: 'Evocation', castTime: '1 Action', range: '120ft', damage: '1d10 force', desc: 'Çatlayan enerji ışını. Warlock imzası.' },
    vicious_mockery: { name: 'Vicious Mockery', level: 0, school: 'Enchantment', castTime: '1 Action', range: '60ft', damage: '1d4 psychic', desc: 'Büyülü hakaretlerle zarar ver.' },

    // Level 1
    magic_missile: { name: 'Magic Missile', level: 1, school: 'Evocation', castTime: '1 Action', range: '120ft', damage: '3x 1d4+1 force', desc: '3 adet otomatik isabet eden enerji oku.' },
    shield: { name: 'Shield', level: 1, school: 'Abjuration', castTime: '1 Reaction', range: 'Self', desc: '+5 AC bir tur boyunca.' },
    cure_wounds: { name: 'Cure Wounds', level: 1, school: 'Evocation', castTime: '1 Action', range: 'Dokunma', desc: '1d8 + büyü modifier kadar iyileştir.' },
    healing_word: { name: 'Healing Word', level: 1, school: 'Evocation', castTime: '1 Bonus Action', range: '60ft', desc: '1d4 + büyü modifier kadar iyileştir.' },
    thunderwave: { name: 'Thunderwave', level: 1, school: 'Evocation', castTime: '1 Action', range: 'Self (15ft cube)', damage: '2d8 thunder', desc: 'Gök gürültüsü dalgası yayar.' },
    detect_magic: { name: 'Detect Magic', level: 1, school: 'Divination', castTime: '1 Action', range: 'Self (30ft)', desc: '30ft içindeki büyüleri algıla.' },
    sleep: { name: 'Sleep', level: 1, school: 'Enchantment', castTime: '1 Action', range: '90ft', desc: '5d8 HP değerinde yaratıkları uyut.' }
  },

  // ===== SİLAHLAR =====
  weapons: {
    // Basit Yakın
    club: { name: 'Topuz', damage: '1d4', type: 'bludgeoning', properties: ['Hafif'], category: 'simple_melee' },
    dagger: { name: 'Hançer', damage: '1d4', type: 'piercing', properties: ['Finesse', 'Hafif', 'Fırlatılabilir (20/60)'], category: 'simple_melee' },
    handaxe: { name: 'El Baltası', damage: '1d6', type: 'slashing', properties: ['Hafif', 'Fırlatılabilir (20/60)'], category: 'simple_melee' },
    mace: { name: 'Gürz', damage: '1d6', type: 'bludgeoning', properties: [], category: 'simple_melee' },
    quarterstaff: { name: 'Asa', damage: '1d6', type: 'bludgeoning', properties: ['Çok Yönlü (1d8)'], category: 'simple_melee' },
    spear: { name: 'Mızrak', damage: '1d6', type: 'piercing', properties: ['Fırlatılabilir (20/60)', 'Çok Yönlü (1d8)'], category: 'simple_melee' },
    // Savaş Yakın
    battleaxe: { name: 'Savaş Baltası', damage: '1d8', type: 'slashing', properties: ['Çok Yönlü (1d10)'], category: 'martial_melee' },
    greatsword: { name: 'Büyük Kılıç', damage: '2d6', type: 'slashing', properties: ['Ağır', 'İki El'], category: 'martial_melee' },
    longsword: { name: 'Uzun Kılıç', damage: '1d8', type: 'slashing', properties: ['Çok Yönlü (1d10)'], category: 'martial_melee' },
    rapier: { name: 'Rapier', damage: '1d8', type: 'piercing', properties: ['Finesse'], category: 'martial_melee' },
    shortsword: { name: 'Kısa Kılıç', damage: '1d6', type: 'piercing', properties: ['Finesse', 'Hafif'], category: 'martial_melee' },
    warhammer: { name: 'Savaş Çekici', damage: '1d8', type: 'bludgeoning', properties: ['Çok Yönlü (1d10)'], category: 'martial_melee' },
    greataxe: { name: 'Büyük Balta', damage: '1d12', type: 'slashing', properties: ['Ağır', 'İki El'], category: 'martial_melee' },
    // Uzak menzilli
    shortbow: { name: 'Kısa Yay', damage: '1d6', type: 'piercing', properties: ['İki El', 'Menzil (80/320)'], category: 'simple_ranged' },
    longbow: { name: 'Uzun Yay', damage: '1d8', type: 'piercing', properties: ['Ağır', 'İki El', 'Menzil (150/600)'], category: 'martial_ranged' },
    light_crossbow: { name: 'Hafif Arbalet', damage: '1d8', type: 'piercing', properties: ['Yükleme', 'İki El', 'Menzil (80/320)'], category: 'simple_ranged' }
  },

  // ===== CONDITIONS =====
  conditions: {
    blinded: { name: 'Kör', effects: ['Saldırı atışlarında dezavantaj', 'Sana karşı saldırılar avantajlı'] },
    charmed: { name: 'Büyülenmiş', effects: ['Büyüleyene saldıramaz', 'Büyüleyen sosyal yeteneklerde avantaj'] },
    deafened: { name: 'Sağır', effects: ['İşitme gerektiren algı kontrollerinde otomatik başarısız'] },
    frightened: { name: 'Korkmuş', effects: ['Korku kaynağı görüş alanındayken dezavantaj', 'Kaynağa yaklaşamaz'] },
    grappled: { name: 'Yakalanmış', effects: ['Hız 0', 'Etkiden kurtulmak için Athletics/Acrobatics vs Athletics'] },
    incapacitated: { name: 'Etkisiz', effects: ['Aksiyon veya tepki alamaz'] },
    invisible: { name: 'Görünmez', effects: ['Saldırılarda avantaj', 'Sana karşı saldırılarda dezavantaj'] },
    paralyzed: { name: 'Felçli', effects: ['Etkisiz', 'STR/DEX saving throw otomatik başarısız', '5ft içinden vuruş = otomatik critical'] },
    poisoned: { name: 'Zehirlenmiş', effects: ['Saldırı ve yetenek kontrollerinde dezavantaj'] },
    prone: { name: 'Yerde', effects: ['Sadece sürünerek hareket', 'Yakın saldırılar avantajlı, uzak dezavantajlı'] },
    stunned: { name: 'Sersemletilmiş', effects: ['Etkisiz', 'STR/DEX saving throw otomatik başarısız', 'Saldırılar avantajlı'] },
    unconscious: { name: 'Bilinçsiz', effects: ['Yerde', 'Saldırılar avantajlı + 5ft crit', 'STR/DEX auto fail'] }
  }
};
