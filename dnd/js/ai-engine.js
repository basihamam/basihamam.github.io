/* ===================================
   AI ENGINE MODULE
   Google Gemini API & OpenAI Entegrasyonu
   Dungeon Master Prompting & Yanıt Yönetimi
   =================================== */

const AIEngine = {
  // Varsayılan DM Sistem Prompt'u
  getDMPrompt(character) {
    return `Sen uzman, adil, son derece sürükleyici ve betimleyici bir Dungeons & Dragons (D&D 5e) Dungeon Master'ısın (DM).
Tüm D&D 5e kurallarını mükemmel bilir ve harfiyen uygularsın.

OYUNCU KARAKTERİ:
- İsim: ${character.name || 'Bilinmeyen Maceracı'}
- Irk: ${character.raceName || character.race || 'İnsan'}
- Sınıf: ${character.className || character.class || 'Savaşçı'} (Seviye ${character.level || 1})
- Can Puanı (HP): ${character.hp}/${character.maxHp}
- Zırh Sınıfı (AC): ${character.ac}
- Nitelikler (Stats): STR ${character.stats.str} (${Rules.getModifierStr(character.stats.str)}), DEX ${character.stats.dex} (${Rules.getModifierStr(character.stats.dex)}), CON ${character.stats.con} (${Rules.getModifierStr(character.stats.con)}), INT ${character.stats.int} (${Rules.getModifierStr(character.stats.int)}), WIS ${character.stats.wis} (${Rules.getModifierStr(character.stats.wis)}), CHA ${character.stats.cha} (${Rules.getModifierStr(character.stats.cha)})
- Arkaplan: ${character.background || 'Bilinmiyor'}
- Arkaplan Hikayesi: ${character.backstory || 'Yok'}

KURALLAR VE REHBER:
1. Türkçe konuş. Atmosferik, edebi, duyusal (koku, ses, ışık) ve zengin fantezi anlatımı yap.
2. D&D 5e mekaniklerini (DC kontrolleri, AC, Saving Throw, Inisiyatif, Spell Slots) aktif uygula.
3. Bir aksiyon riskliyse veya belirsizse oyuncudan zar atmasını iste (Örn: "[Zar Gerekli: d20 + Algı/Perception]").
4. Eğer oyuncu bir zar attıysa ve sonucunu bildirdiyse, o zarın sonucuna göre (DC'yi aşma durumuna göre) hikayeyi dramatik biçimde ilerlet. Doğal 20 (Critical Success) veya Doğal 1 (Critical Failure) durumlarına özel görkemli veya komik/tehlikeli sonuçlar yaz.
5. Savaş başladığında düşmanları net tanıt, inisiyatif sırasını ve mesafeleri belirt. Düşmanların HP'sini ve zırhını takip et.
6. Yanıtını gereksiz uzun tutma (ortalama 2-4 paragraf), oyuncuya daima eylem alanı bırak ve sahneyi "Ne yapıyorsun?" gibi bir eylem davetiyle veya gerilimli bir durumla bitir.`;
  },

  // API Anahtarını al
  getApiKey() {
    const settings = Storage.getSettings();
    return settings.apiKey || 'AQ.Ab8RN6J_dAmUGqARN0hKlfIGed6iBj0dQxEF1g_u0ATQNwWkA';
  },

  // AI Mesajı Gönder (Gemini veya OpenAI)
  async sendMessage(history, userMessage, character) {
    const settings = Storage.getSettings();
    const provider = settings.apiProvider || 'gemini';
    const apiKey = settings.apiKey || this.getApiKey();

    if (!apiKey) {
      throw new Error("Lütfen ayarlardan bir API Anahtarı girin!");
    }

    if (provider === 'gemini') {
      return await this.callGemini(apiKey, settings.aiModel || 'gemini-2.0-flash', history, userMessage, character);
    } else {
      return await this.callOpenAI(apiKey, settings.aiModel || 'gpt-4o-mini', history, userMessage, character);
    }
  },

  // Google Gemini API Çağrısı
  async callGemini(apiKey, model, history, userMessage, character) {
    // Model adı düzenleme
    let modelName = model || 'gemini-2.0-flash';
    if (!modelName.startsWith('gemini')) modelName = 'gemini-2.0-flash';

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const systemInstruction = this.getDMPrompt(character);

    // Gemini contents formatı
    const contents = [];

    // Önceki sohbet geçmişi
    if (history && history.length > 0) {
      for (const msg of history.slice(-10)) {
        contents.push({
          role: msg.role === 'assistant' || msg.role === 'dm' ? 'model' : 'user',
          parts: [{ text: msg.text }]
        });
      }
    }

    // Güncel kullanıcı mesajı
    contents.push({
      role: 'user',
      parts: [{ text: userMessage }]
    });

    const payload = {
      system_instruction: {
        parts: [{ text: systemInstruction }]
      },
      contents: contents,
      generationConfig: {
        temperature: 0.85,
        topP: 0.95,
        maxOutputTokens: 1200
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const errMsg = errData.error?.message || response.statusText || `HTTP ${response.status}`;
      throw new Error(`Gemini API Hatası: ${errMsg}`);
    }

    const data = await response.json();
    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!replyText) {
      throw new Error("Yapay zekadan yanıt alınamadı veya güvenlik filtresine takıldı.");
    }

    return replyText;
  },

  // OpenAI API Çağrısı
  async callOpenAI(apiKey, model, history, userMessage, character) {
    const url = 'https://api.openai.com/v1/chat/completions';
    const messages = [
      { role: 'system', content: this.getDMPrompt(character) }
    ];

    if (history && history.length > 0) {
      for (const msg of history.slice(-10)) {
        messages.push({
          role: msg.role === 'dm' ? 'assistant' : msg.role,
          content: msg.text
        });
      }
    }

    messages.push({
      role: 'user',
      content: userMessage
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model || 'gpt-4o-mini',
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

  // Backstory Üretici (AI Helper)
  async generateBackstory(race, cls, background, name) {
    const prompt = `D&D 5e oyunu için yaratıcı, kısa ve sürükleyici bir karakter geçmişi (backstory) yaz.
Karakter:
- İsim: ${name || 'İsimsiz'}
- Irk: ${race}
- Sınıf: ${cls}
- Arkaplan Türü: ${background}

Lütfen 2 paragrafta: karakterin nereden geldiğini, neden maceracı olduğunu ve gizemli bir motivasyonunu Türkçe olarak yaz.`;

    const settings = Storage.getSettings();
    const apiKey = settings.apiKey || this.getApiKey();

    if (!apiKey) {
      return "Sisli vadilerden gelen, kadim bir sırrın peşinde dolaşan cesur bir ruh...";
    }

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });
      if (!res.ok) throw new Error("API call failed");
      const d = await res.json();
      return d.candidates?.[0]?.content?.parts?.[0]?.text || "Gözü pek bir savaşçı!";
    } catch (e) {
      return `${race} soyundan gelen ${name || 'maceracı'}, ${cls} yolunu seçti. Geçmişindeki bir hesaplaşma onu bu diyarlara sürükledi.`;
    }
  },

  // API Bağlantı Testi
  async testConnection(provider, apiKey, model) {
    if (!apiKey) throw new Error("API anahtarı boş olamaz.");
    if (provider === 'gemini') {
      let modelName = model || 'gemini-2.0-flash';
      if (!modelName.startsWith('gemini')) modelName = 'gemini-2.0-flash';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Selam! D&D DM olarak 1 cümle ile hazır olduğunu söyle.' }] }]
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `HTTP ${res.status}`);
      }
      const data = await res.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "Bağlantı başarılı!";
    } else {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}`);
      return "OpenAI API anahtarı başarıyla doğrulandı!";
    }
  }
};
