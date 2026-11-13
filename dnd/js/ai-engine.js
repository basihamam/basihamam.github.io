/* ===================================
   AI ENGINE MODULE (V2 - UPGRADED)
   Google Gemini (1.5 Pro / 2.0 Pro), OpenAI & OpenRouter Entegrasyonu
   Kişiselleştirilmiş Hikaye, Özel Kampanya & AI Karakter Yaratımı
   =================================== */

const AIEngine = {
  // Varsayılan DM Sistem Prompt'u (Özelleştirilebilir Hikaye ve Derin Anlatım)
  getDMPrompt(character, campaignSettings = {}) {
    const theme = campaignSettings.theme || 'grimdark';
    const customHook = campaignSettings.customHook || '';
    const party = Multiplayer.party || [];

    let partyInfo = '';
    if (party.length > 1) {
      partyInfo = `\nMACERA GRUBU (PARTY - ${party.length} KİŞİ):` +
        party.map(p => `\n- ${p.name} (${p.race} ${p.class}) [HP: ${p.hp}/${p.maxHp}, AC: ${p.ac}]`).join('');
    }

    let toneGuidance = '';
    if (theme === 'grimdark') {
      toneGuidance = 'Üslup: Joe Abercrombie ve Marquis de Sade karışımı; sert, gerçekçi, kokuları (demir, kan, ıslak taş, tütsü), soğuğu, gölgeleri ve visceral detayları hissettiren, sansürsüz ve derin edebiyat.';
    } else if (theme === 'horror') {
      toneGuidance = 'Üslup: Lovecraftian ve Gotik korku; tekinsiz fısıltılar, akıl almaz gölgeler, gerilim, delilik ve yabancılaşma hissi.';
    } else if (theme === 'epic') {
      toneGuidance = 'Üslup: Yüksek epik fantezi, Tolkien ve Brandon Sanderson esintili; kadim efsaneler, görkemli büyüler ve kahramanlık.';
    } else {
      toneGuidance = 'Üslup: Klasik masaüstü D&D 5e; macera dolu, merak uyandırıcı ve dinamik.';
    }

    return `Sen son derece yetenekli, kuralcı ama hikayeyi oyuncunun arzusuna göre ilmek ilmek işleyen bir D&D 5e Dungeon Master'ısın.
Asla basmakalıp, yapay veya çocukça konuşmazsın. Oyuncunun zihninde bir roman sahnesi gibi canlanacak canlılıkta yazarsın.

${toneGuidance}

AKTİF OYUNCU:
- İsim: ${character.name}
- Irk: ${character.raceName || character.race}
- Sınıf: ${character.className || character.class} (Lv ${character.level || 1})
- Statlar: STR ${character.stats.str}, DEX ${character.stats.dex}, CON ${character.stats.con}, INT ${character.stats.int}, WIS ${character.stats.wis}, CHA ${character.stats.cha}
- HP: ${character.hp}/${character.maxHp} | AC: ${character.ac}
- Arkaplan & Kişilik: ${character.backstory || 'Maceracı'}
${partyInfo}

${customHook ? `OYUNCUNUN SEÇTİĞİ ÖZEL HİKAYE VE BAŞLANGIÇ ÇİZGİSİ:\n"${customHook}"\n(Bu hikaye çizgisine sadık kal ve olayları bu doğrultuda geliştir!)` : ''}

TEMEL DM KURALLARI:
1. Türkçe yaz. Duyusal tasvirleri (kokular, soğuk metal, nefes sesleri, ışık oyunları) sahneye ustalıkla yedir.
2. D&D 5e kurallarını işlet: Zorlu aksiyonlarda oyuncudan açıkça zar iste (örn: "[Zar Gerekli: d20 + Çeviklik/Gizlenme (DC 13)]").
3. Oyuncu bir zar sonucu paylaştığında, zarın başarısına veya başarısızlığına göre sahneyi somut sonuçlarla ilerlet.
4. Karakterleri "evet efendim" diyen kuklalar yapma; NPC'lerin kendi çıkarları, korkuları ve gizli ajandaları olsun.
5. Asla tek taraflı hikaye anlatıp oyunu bitirme; her paragraf grubunun sonunda oyuncuya ne yapmak istediğini soran gerilimli veya merak uyandırıcı bir son bırak.`;
  },

  getApiKey() {
    const settings = Storage.getSettings();
    return settings.apiKey || 'AQ.Ab8RN6J_dAmUGqARN0hKlfIGed6iBj0dQxEF1g_u0ATQNwWkA';
  },

  // Ana Mesaj Gönderme Metodu
  async sendMessage(history, userMessage, character) {
    const settings = Storage.getSettings();
    const provider = settings.apiProvider || 'gemini';
    const apiKey = settings.apiKey || this.getApiKey();
    const campaignSettings = Storage.get('campaign_settings', { theme: 'grimdark', customHook: '' });

    if (!apiKey) {
      throw new Error("Lütfen ayarlardan bir API Anahtarı girin!");
    }

    if (provider === 'gemini') {
      return await this.callGemini(apiKey, settings.aiModel || 'gemini-1.5-pro', history, userMessage, character, campaignSettings);
    } else if (provider === 'openrouter') {
      return await this.callOpenRouter(apiKey, settings.aiModel || 'anthropic/claude-3.5-sonnet', history, userMessage, character, campaignSettings);
    } else {
      return await this.callOpenAI(apiKey, settings.aiModel || 'gpt-4o', history, userMessage, character, campaignSettings);
    }
  },

  // Gemini API Çağrısı (Hem 1.5 Pro hem 2.0 Pro destekli)
  async callGemini(apiKey, model, history, userMessage, character, campaignSettings) {
    let modelName = model || 'gemini-1.5-pro';
    if (!modelName.includes('gemini')) modelName = 'gemini-1.5-pro';

    const isStandardKey = apiKey.startsWith('AIza');
    const url = isStandardKey 
      ? `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`
      : `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;

    const systemInstruction = this.getDMPrompt(character, campaignSettings);

    const contents = [];
    if (history && history.length > 0) {
      for (const msg of history.slice(-12)) {
        contents.push({
          role: msg.role === 'assistant' || msg.role === 'dm' ? 'model' : 'user',
          parts: [{ text: msg.text }]
        });
      }
    }

    contents.push({
      role: 'user',
      parts: [{ text: userMessage }]
    });

    const payload = {
      system_instruction: { parts: [{ text: systemInstruction }] },
      contents: contents,
      generationConfig: {
        temperature: 0.9,
        topP: 0.95,
        maxOutputTokens: 1500
      }
    };

    const headers = { 'Content-Type': 'application/json' };
    if (!isStandardKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const errMsg = errData.error?.message || response.statusText || `HTTP ${response.status}`;
      throw new Error(`Gemini (${modelName}) Hatası: ${errMsg}`);
    }

    const data = await response.json();
    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!replyText) {
      throw new Error("Yapay zekadan yanıt alınamadı. Filtreye takılmış olabilir.");
    }

    return replyText;
  },

  // OpenRouter API
  async callOpenRouter(apiKey, model, history, userMessage, character, campaignSettings) {
    const url = 'https://openrouter.ai/api/v1/chat/completions';
    const messages = [
      { role: 'system', content: this.getDMPrompt(character, campaignSettings) }
    ];

    if (history && history.length > 0) {
      for (const msg of history.slice(-12)) {
        messages.push({
          role: msg.role === 'dm' ? 'assistant' : msg.role,
          content: msg.text
        });
      }
    }

    messages.push({ role: 'user', content: userMessage });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://basihamam.github.io/dnd/',
        'X-Title': 'DnD AI Dungeon Master'
      },
      body: JSON.stringify({
        model: model || 'anthropic/claude-3.5-sonnet',
        messages: messages,
        temperature: 0.9
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(`OpenRouter Hatası: ${errData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "Boş yanıt alındı.";
  },

  // OpenAI API
  async callOpenAI(apiKey, model, history, userMessage, character, campaignSettings) {
    const url = 'https://api.openai.com/v1/chat/completions';
    const messages = [
      { role: 'system', content: this.getDMPrompt(character, campaignSettings) }
    ];

    if (history && history.length > 0) {
      for (const msg of history.slice(-12)) {
        messages.push({
          role: msg.role === 'dm' ? 'assistant' : msg.role,
          content: msg.text
        });
      }
    }

    messages.push({ role: 'user', content: userMessage });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model || 'gpt-4o',
        messages: messages,
        temperature: 0.85
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI Hatası: ${errData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "Boş yanıt alındı.";
  },

  // SERBEST METİNDEN KARAKTER OLUŞTURUCU (AI)
  async createCharacterFromPrompt(userPrompt) {
    const systemPrompt = `Verilen serbest metin açıklamasından D&D 5e kurallarına uygun tam bir karakter sayfası oluştur.
Yanıtını SADECE geçerli bir JSON objesi olarak döndür (başka hiçbir metin veya markdown code block ekleme).

JSON Formatı:
{
  "name": "Karakter Adı",
  "race": "human|elf|dwarf|halfling|dragonborn|tiefling|gnome|half_elf|half_orc",
  "raceName": "Irkın Türkçe Adı",
  "class": "fighter|wizard|rogue|cleric|barbarian|ranger|paladin|warlock|bard",
  "className": "Sınıfın Türkçe Adı",
  "stats": {
    "str": 15,
    "dex": 14,
    "con": 13,
    "int": 12,
    "wis": 10,
    "cha": 8
  },
  "background": "soldier|criminal|sage|folk-hero|noble|outlander|acolyte|urchin",
  "alignment": "LG|NG|CG|LN|TN|CN|LE|NE|CE",
  "backstory": "2-3 cümlelik derin arkaplan özeti",
  "inventory": ["Eşya 1", "Eşya 2", "Silah"],
  "spells": ["fire_bolt", "shield"]
}`;

    const settings = Storage.getSettings();
    const apiKey = settings.apiKey || this.getApiKey();

    if (!apiKey) {
      return this.fallbackCharacterParser(userPrompt);
    }

    try {
      const model = settings.aiModel || 'gemini-1.5-pro';
      const isStandardKey = apiKey.startsWith('AIza');
      const url = isStandardKey
        ? `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
        : `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

      const headers = { 'Content-Type': 'application/json' };
      if (!isStandardKey) headers['Authorization'] = `Bearer ${apiKey}`;

      const res = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts: [{ text: `Kullanıcının Karakter Tanımı:\n${userPrompt}` }] }],
          generationConfig: { response_mime_type: "application/json", temperature: 0.7 }
        })
      });

      if (!res.ok) throw new Error("API call failed");
      const d = await res.json();
      const rawText = d.candidates?.[0]?.content?.parts?.[0]?.text;
      const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanJson);
    } catch (e) {
      console.warn("AI Karakter üretimi fallback'e düştü:", e);
      return this.fallbackCharacterParser(userPrompt);
    }
  },

  // Fallback Karakter Çıkarıcı
  fallbackCharacterParser(prompt) {
    const p = prompt.toLowerCase();
    let race = 'human';
    let raceName = 'İnsan';
    if (p.includes('elf') || p.includes('drow')) { race = 'elf'; raceName = 'Elf'; }
    else if (p.includes('cüce') || p.includes('dwarf')) { race = 'dwarf'; raceName = 'Cüce'; }
    else if (p.includes('ejder') || p.includes('dragon')) { race = 'dragonborn'; raceName = 'Dragonborn'; }
    else if (p.includes('tiefling') || p.includes('iblis') || p.includes('boynuz')) { race = 'tiefling'; raceName = 'Tiefling'; }
    else if (p.includes('ork') || p.includes('orc')) { race = 'half_orc'; raceName = 'Yarı Ork'; }
    else if (p.includes('buçukluk') || p.includes('halfling')) { race = 'halfling'; raceName = 'Halfling'; }

    let cls = 'fighter';
    let className = 'Savaşçı';
    if (p.includes('büyü') || p.includes('wizard') || p.includes('mage') || p.includes('arkanas')) { cls = 'wizard'; className = 'Büyücü'; }
    else if (p.includes('hırsız') || p.includes('rogue') || p.includes('suikast') || p.includes('gölge')) { cls = 'rogue'; className = 'Hırsız'; }
    else if (p.includes('barbar') || p.includes('öfke') || p.includes('balta') || p.includes('vahşi')) { cls = 'barbar'; className = 'Barbar'; }
    else if (p.includes('rahip') || p.includes('cleric') || p.includes('şifa') || p.includes('kutsal')) { cls = 'cleric'; className = 'Rahip'; }
    else if (p.includes('paladin') || p.includes('şövalye') || p.includes('yemin')) { cls = 'paladin'; className = 'Paladin'; }
    else if (p.includes('avcı') || p.includes('ranger') || p.includes('okçu') || p.includes('izci')) { cls = 'ranger'; className = 'Avcı'; }
    else if (p.includes('warlock') || p.includes('pakt') || p.includes('karanlık güç')) { cls = 'warlock'; className = 'Warlock'; }
    else if (p.includes('ozan') || p.includes('bard') || p.includes('şarkı')) { cls = 'bard'; className = 'Ozan'; }

    const words = prompt.split(/\s+/);
    const name = words[0]?.length > 2 ? words[0].replace(/[^a-zA-ZğüşıöçĞÜŞİÖÇ]/g, '') : 'Gölge Avcısı';

    return {
      name: name || 'Bilinmeyen Maceracı',
      race: race,
      raceName: raceName,
      class: cls,
      className: className,
      stats: { str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 8 },
      background: 'outlander',
      alignment: 'CN',
      backstory: prompt,
      inventory: ['Karakter Ekipmanı', 'Sırt Çantası', 'Maceracı Rasyonu'],
      spells: cls === 'wizard' ? ['fire_bolt', 'shield'] : []
    };
  },

  // API Bağlantı Testi
  async testConnection(provider, apiKey, model) {
    if (!apiKey) throw new Error("API anahtarı boş olamaz.");
    if (provider === 'gemini') {
      const isStandardKey = apiKey.startsWith('AIza');
      const url = isStandardKey
        ? `https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-1.5-pro'}:generateContent?key=${apiKey}`
        : `https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-1.5-pro'}:generateContent`;

      const headers = { 'Content-Type': 'application/json' };
      if (!isStandardKey) headers['Authorization'] = `Bearer ${apiKey}`;

      const res = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Selam DM! Hazır mısın? Tek cümleyle yanıtla.' }] }]
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `HTTP ${res.status}`);
      }
      const data = await res.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "Bağlantı kuruldu!";
    } else if (provider === 'openrouter') {
      const res = await fetch('https://openrouter.ai/api/v1/auth/key', {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      if (!res.ok) throw new Error(`OpenRouter HTTP ${res.status}`);
      return "OpenRouter API anahtarı başarıyla doğrulandı!";
    } else {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}`);
      return "OpenAI API anahtarı başarıyla doğrulandı!";
    }
  }
};
