/* ===================================
   AI ENGINE MODULE (V3)
   - Güçlendirilmiş Hata Yönetimi & Akıllı Yerel DM Yedek Motoru (Fallback)
   - Doğrudan Zar İsteme Protokolü [ZAR İSTEĞİ: Oyuncu | Zar | DC | Sebep]
   - Gemini, OpenRouter & OpenAI Desteği
   =================================== */

const AIEngine = {
  getDMPrompt(character, campaignSettings = {}) {
    const theme = campaignSettings.theme || 'grimdark';
    const customHook = campaignSettings.customHook || '';
    const party = Multiplayer.party || [];

    let partyInfo = '';
    if (party.length > 0) {
      partyInfo = `\nMACERA GRUBU (PARTY):\n` +
        party.map(p => `- ${p.name} (${p.race || ''} ${p.class || ''}) [HP: ${p.hp}/${p.maxHp}, AC: ${p.ac}]`).join('\n');
    }

    let toneGuidance = '';
    if (theme === 'grimdark') {
      toneGuidance = 'Üslup: Joe Abercrombie ve Marquis de Sade esintili; sert, karanlık, duyusal (kokular, soğuk metal, kan, çürümüş tahta), gerçekçi ve derin edebiyat.';
    } else if (theme === 'horror') {
      toneGuidance = 'Üslup: Gotik ve Lovecraftian tekinsizlik; fısıltılar, gölgeler, gerilim ve gizem.';
    } else if (theme === 'epic') {
      toneGuidance = 'Üslup: Yüksek epik fantezi; efsaneler, kadim büyüler ve kahramanlık.';
    } else {
      toneGuidance = 'Üslup: Klasik masaüstü D&D 5e; sürükleyici, dengeli ve zengin.';
    }

    return `Sen son derece yetenekli, kuralcı, edebi ve adil bir D&D 5e Dungeon Master'ısın.
${toneGuidance}

${partyInfo}

${customHook ? `ÖZEL HİKAYE ÇİZGİSİ:\n"${customHook}"\n(Bu hikayeyi temel alarak olayları geliştir!)` : ''}

ÇOK ÖNEMLİ D&D 5E KURALLARI VE HASAR PROTOKOLÜ:
1. Türkçe yaz. Edebi ve duyusal detayları zengin tut (kokular, karanlık, metal tıkırtısı, kan, soğuk taş).
2. HASAR VE KURAL AÇIKLAMASI (ÇOK ÖNEMLİ):
   Bir oyuncu veya grup hasar aldığında (düşman saldırısı, tuzak, düşme, asit, alev vb.):
   - Hangi D&D 5e kuralından dolayı hasar aldığını metinde açıkla:
     * Saldırı Zarı vs Zırh Sınıfı (AC): Düşmanın saldırı zarının oyuncunun AC'sini nasıl aştığını belirt.
     * Kurtarma Zarları (Saving Throws): İstenen DC zorluğu ve başarısızlık sebebini belirt.
     * Hasar zarı ve hasar tipini belirt (Örn: 1d8+2 Kesici Hasar, 2d6 Ateş Hasarı, 1d10 Delici Hasar).
     * Düşme varsa: Her 10 fit için 1d6 ezici hasar kuralını uygula.
   - Yanıtının içinde MUTLAKA şu formatta etiket üret:
     [HASAR: KarakterAdı | Miktar | Kural Gerekçesi | Sebep]
     Örnek: [HASAR: ALX | 7 | Goblin Pala Saldırısı (Saldırı: 16 vs AC 14, Hasar: 1d6+2 Kesici) | Goblin pususu]
3. ŞİFA VE İYİLEŞME:
   Karakter dinlendiğinde veya iksir/büyü ile can kazandığında:
   [İYİLEŞME: KarakterAdı | Miktar | Sebep]
   Örnek: [İYİLEŞME: ALX | 6 | Şifa İksiri (2d4+2)]
4. ZAR İSTEME PROTOKOLÜ:
   Bir eylem kural kontrolü gerektiriyorsa ve zar henüz atılmamışsa EN BAŞA şunu koy:
   [ZAR İSTEĞİ: OyuncuAdı | d20+Stat | DC X | Sebep]
   Örnek: [ZAR İSTEĞİ: ALX | d20+Atletizm | DC 13 | Ağır demir kapıyı kırma denemesi]
5. Eğer oyuncu zaten bir zar sonucu ilettiyse, DC kontrolünü yap ve başarıya ya da başarısızlığa göre sahneyi somut kural sonuçlarıyla ilerlet.
6. Yanıtını gereksiz uzatmadan, oyuncuların bir sonraki eylemini soran gerilimli bir sahneyle bitir.`;
  },

  getApiKey() {
    const settings = Storage.getSettings();
    return settings.apiKey || '';
  },

  async sendMessage(history, userMessage, character) {
    const settings = Storage.getSettings();
    const provider = settings.apiProvider || 'gemini';
    const apiKey = settings.apiKey || this.getApiKey();
    const campaignSettings = Storage.get('campaign_settings', { theme: 'grimdark', customHook: '' });

    // Eğer anahtar boşsa veya bariz hatalı bir token ise akıllı yerel motoru çağır
    if (!apiKey || apiKey.length < 15) {
      return this.localDMEngine(userMessage, character, campaignSettings);
    }

    try {
      if (provider === 'gemini') {
        return await this.callGemini(apiKey, settings.aiModel || 'gemini-2.5-flash', history, userMessage, character, campaignSettings);
      } else if (provider === 'openrouter') {
        return await this.callOpenRouter(apiKey, settings.aiModel || 'anthropic/claude-3.5-sonnet', history, userMessage, character, campaignSettings);
      } else {
        return await this.callOpenAI(apiKey, settings.aiModel || 'gpt-4o', history, userMessage, character, campaignSettings);
      }
    } catch (err) {
      console.warn("Harici AI API Hatası, Yerel DM Devreye Giriyor:", err);
      // Hata durumunda oyuncuyu yarı yolda bırakma! Yerel zeki DM yanıtı üret
      const localReply = this.localDMEngine(userMessage, character, campaignSettings, err.message);
      return localReply;
    }
  },

  // Gemini API
  async callGemini(apiKey, model, history, userMessage, character, campaignSettings) {
    let modelName = model || 'gemini-2.5-flash';
    if (!modelName.includes('gemini') || modelName.includes('1.5') || modelName.includes('2.0') || modelName.includes('2.5-pro')) {
      modelName = 'gemini-2.5-flash';
    }

    const cleanKey = (apiKey || '').trim();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(cleanKey)}`;
    const systemInstruction = this.getDMPrompt(character, campaignSettings);

    const contents = [];
    if (history && history.length > 0) {
      for (const msg of history.slice(-10)) {
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
        temperature: 0.88,
        topP: 0.95,
        maxOutputTokens: 1400
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': cleanKey
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const errMsg = errData.error?.message || response.statusText;

      // Spike / High Demand / Quota aşımında otomatik hafif modele geçiş
      if ((response.status === 503 || response.status === 429 || (errMsg && errMsg.toLowerCase().includes('demand'))) && modelName !== 'gemini-3.5-flash-lite') {
        console.warn(`[AIEngine] ${modelName} yoğunlukta (${response.status} - High Demand Spike). Kesintisiz oyun için otomatik gemini-3.5-flash-lite deneniyor...`);
        return await this.callGemini(apiKey, 'gemini-3.5-flash-lite', history, userMessage, character, campaignSettings);
      }

      throw new Error(`Google API: ${errMsg}`);
    }

    const data = await response.json();
    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!replyText) {
      throw new Error("Yapay zekadan yanıt metni alınamadı.");
    }

    return replyText;
  },

  // OpenRouter API
  async callOpenRouter(apiKey, model, history, userMessage, character, campaignSettings) {
    const url = 'https://openrouter.ai/api/v1/chat/completions';
    const messages = [{ role: 'system', content: this.getDMPrompt(character, campaignSettings) }];

    if (history && history.length > 0) {
      for (const msg of history.slice(-10)) {
        messages.push({ role: msg.role === 'dm' ? 'assistant' : msg.role, content: msg.text });
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
      throw new Error(`OpenRouter: ${errData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "Boş yanıt alındı.";
  },

  // OpenAI API
  async callOpenAI(apiKey, model, history, userMessage, character, campaignSettings) {
    const url = 'https://api.openai.com/v1/chat/completions';
    const messages = [{ role: 'system', content: this.getDMPrompt(character, campaignSettings) }];

    if (history && history.length > 0) {
      for (const msg of history.slice(-10)) {
        messages.push({ role: msg.role === 'dm' ? 'assistant' : msg.role, content: msg.text });
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
      throw new Error(`OpenAI: ${errData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "Boş yanıt alındı.";
  },

  // ==========================================
  // AKILLI YEREL DM MOTORU (LOCAL FALLBACK DM)
  // API key hatalı olsa dahi oyunu asla durdurmaz, kuralları ve zar isteklerini uygular!
  // ==========================================
  localDMEngine(userMessage, character, campaignSettings, errorNotice = '') {
    const charName = character?.name || 'Maceracı';
    const msg = userMessage.toLowerCase();

    let notice = '';
    if (errorNotice) {
      notice = `> *[Not: Yapay zeka yanıt veremedi veya bağlantı kesildi (${errorNotice}). Yerel DM motoru devreye girdi!]*\n\n`;
    }

    // Zar kontrolü gerekiyor mu?
    if (/kapı|kilit|sandık|kır|zorla/i.test(msg)) {
      return `${notice}[ZAR İSTEĞİ: ${charName} | d20+STR (Atletizm) | DC 13 | Engeli aşma denemesi]
Demir perçinli ahşap kapı nemden şişmiş durumda. Parmaklarını aralığa sokup tüm ağırlığını veriyorsun. Paslı menteşeler inliyor fakat açılması için kaslarının tüm gücüne ihtiyacın var!

Ne kadar güçlü asılıyorsun?`;
    }

    if (/gizlen|saklan|sessiz|çaktırmadan|gölge/i.test(msg)) {
      return `${notice}[ZAR İSTEĞİ: ${charName} | d20+DEX (Gizlenme) | DC 12 | Gölgelere sığınma]
Havanın soğuk nefesi tenine çarparken adımlarını parmak uçlarına topluyorsun. İleride paslı zırhlarının içinde homurdanan iki nöbetçi meşale ışığının altında duruyor. Gölgeler seni gizlemeye yetecek mi?`;
    }

    if (/araştır|incele|etraf|bak|gözetle|dinle/i.test(msg)) {
      return `${notice}[ZAR İSTEĞİ: ${charName} | d20+WIS (Algı) | DC 11 | Çevreyi sezme]
Taş duvarların arasından sızan rutubet ve hafif bir kükürt kokusu burnuna çalınıyor. Kulağını zemin taşlarına verip karanlığın ritmini dinliyorsun... Neler seziyorsun?`;
    }

    if (/zar sonucu|zar:\s*\d+/i.test(msg)) {
      return `${notice}Zar kaderini belirledi! Attığın zarın yankısı taş koridorlarda dağılırken hamlen hedefine ulaşıyor. 
Önündeki geçit gıcırdayarak açıldı; içeriden eski meşalelerin soluk ışığı ve soğuk bir hava akımı geliyor. Koridorun sonunda taştan oyulmuş kadim bir lahit yükseliyor.

Şimdi nereye yöneliyorsun?`;
    }

    return `${notice}**${charName}**, hareketin zindanın kadim sessizliğini bozuyor. Duvarlardaki sönük meşalelerin gölgeleri arkanda titreşirken adımların rutubetli taş zemin üzerinde yankılanıyor.

Havadaki pas ve kül kokusu giderek ağırlaşıyor. İlerideki koridordan metalin taşa sürtünme sesi geliyor... 

Ne yapmak istiyorsun?`;
  },

  // Prompt-to-Character (Yapay Zeka Destekli Karakter)
  async createCharacterFromPrompt(userPrompt) {
    const settings = Storage.getSettings();
    const apiKey = (settings.apiKey || this.getApiKey() || '').trim();

    if (!apiKey || apiKey.length < 15) {
      return this.fallbackCharacterParser(userPrompt);
    }

    try {
      const systemPrompt = `D&D 5e kurallarına uygun karakter sayfası oluştur. SADECE JSON formatında bir nesne döndür:
{
  "name": "İsim",
  "race": "human|elf|dwarf|halfling|dragonborn|tiefling|gnome|half_elf|half_orc",
  "raceName": "Türkçe Irk",
  "class": "fighter|wizard|rogue|cleric|barbarian|ranger|paladin|warlock|bard",
  "className": "Türkçe Sınıf",
  "stats": { "str": 15, "dex": 14, "con": 13, "int": 12, "wis": 10, "cha": 8 },
  "background": "soldier",
  "alignment": "CN",
  "backstory": "Özet hikaye",
  "inventory": ["Eşya 1", "Silah"],
  "spells": []
}`;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts: [{ text: userPrompt }] }],
          generationConfig: { response_mime_type: "application/json" }
        })
      });
      if (!res.ok) throw new Error("API call error: " + res.status);
      const d = await res.json();
      const rawText = d.candidates?.[0]?.content?.parts?.[0]?.text;
      return JSON.parse(rawText);
    } catch (e) {
      console.warn("AI Karakter üretimi fallback motoruna geçti:", e);
      return this.fallbackCharacterParser(userPrompt);
    }
  },

  fallbackCharacterParser(prompt) {
    const p = prompt.toLowerCase();
    let race = 'human'; let raceName = 'İnsan';
    if (p.includes('elf') || p.includes('drow')) { race = 'elf'; raceName = 'Elf'; }
    else if (p.includes('cüce') || p.includes('dwarf')) { race = 'dwarf'; raceName = 'Cüce'; }
    else if (p.includes('ejder') || p.includes('dragon')) { race = 'dragonborn'; raceName = 'Dragonborn'; }
    else if (p.includes('tiefling') || p.includes('iblis')) { race = 'tiefling'; raceName = 'Tiefling'; }
    else if (p.includes('ork') || p.includes('orc')) { race = 'half_orc'; raceName = 'Yarı Ork'; }

    let cls = 'fighter'; let className = 'Savaşçı';
    if (p.includes('büyü') || p.includes('wizard') || p.includes('mage')) { cls = 'wizard'; className = 'Büyücü'; }
    else if (p.includes('hırsız') || p.includes('rogue') || p.includes('suikast')) { cls = 'rogue'; className = 'Hırsız'; }
    else if (p.includes('barbar') || p.includes('öfke')) { cls = 'barbar'; className = 'Barbar'; }
    else if (p.includes('rahip') || p.includes('cleric')) { cls = 'cleric'; className = 'Rahip'; }
    else if (p.includes('paladin')) { cls = 'paladin'; className = 'Paladin'; }
    else if (p.includes('warlock')) { cls = 'warlock'; className = 'Warlock'; }

    const words = prompt.split(/\s+/);
    const name = words[0]?.length > 2 ? words[0].replace(/[^a-zA-ZğüşıöçĞÜŞİÖÇ]/g, '') : 'Gölge Avcısı';

    return {
      name: name || 'Maceracı',
      race, raceName,
      class: cls, className,
      stats: { str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 8 },
      background: 'outlander',
      alignment: 'CN',
      backstory: prompt,
      inventory: ['Karakter Silahı', 'Sırt Çantası', 'Maceracı Rasyonu'],
      spells: cls === 'wizard' ? ['fire_bolt', 'shield'] : []
    };
  },

  async testConnection(provider, apiKey, model) {
    if (!apiKey) throw new Error("API anahtarı boş olamaz.");
    const cleanKey = apiKey.trim();
    if (provider === 'gemini') {
      let modelName = model || 'gemini-2.5-flash';
      if (!modelName.includes('gemini') || modelName.includes('1.5') || modelName.includes('2.0') || modelName.includes('2.5-pro')) {
        modelName = 'gemini-2.5-flash';
      }
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(cleanKey)}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': cleanKey
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Selam! Tek cümleyle D&D için hazır olduğunu söyle.' }] }]
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `HTTP ${res.status}`);
      }
      const data = await res.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "Bağlantı kuruldu!";
    } else {
      return "Bağlantı testi tamamlandı.";
    }
  }
};
