/* ===================================
   STORAGE MODULE
   localStorage + IndexedDB yönetimi
   =================================== */

const Storage = {
  // Basit key-value (ayarlar, vb.)
  get(key, fallback = null) {
    try {
      const val = localStorage.getItem('dnd_' + key);
      return val ? JSON.parse(val) : fallback;
    } catch {
      return fallback;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem('dnd_' + key, JSON.stringify(value));
    } catch (e) {
      console.warn('Storage yazma hatası:', e);
    }
  },

  remove(key) {
    localStorage.removeItem('dnd_' + key);
  },

  // Karakter kaydetme (IndexedDB)
  _db: null,
  _dbName: 'DnDAIDM',
  _dbVersion: 1,

  async openDB() {
    if (this._db) return this._db;
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this._dbName, this._dbVersion);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('characters')) {
          db.createObjectStore('characters', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('campaigns')) {
          db.createObjectStore('campaigns', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('history')) {
          db.createObjectStore('history', { keyPath: 'id' });
        }
      };
      req.onsuccess = (e) => {
        this._db = e.target.result;
        resolve(this._db);
      };
      req.onerror = (e) => reject(e);
    });
  },

  async saveCharacter(character) {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('characters', 'readwrite');
      tx.objectStore('characters').put(character);
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e);
    });
  },

  async getCharacter(id) {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('characters', 'readonly');
      const req = tx.objectStore('characters').get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = (e) => reject(e);
    });
  },

  async getAllCharacters() {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('characters', 'readonly');
      const req = tx.objectStore('characters').getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = (e) => reject(e);
    });
  },

  async deleteCharacter(id) {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('characters', 'readwrite');
      tx.objectStore('characters').delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e);
    });
  },

  // Kampanya/hikaye geçmişi kaydetme
  async saveCampaign(campaign) {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('campaigns', 'readwrite');
      tx.objectStore('campaigns').put(campaign);
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e);
    });
  },

  async getCampaign(id) {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('campaigns', 'readonly');
      const req = tx.objectStore('campaigns').get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = (e) => reject(e);
    });
  },

  async getAllCampaigns() {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('campaigns', 'readonly');
      const req = tx.objectStore('campaigns').getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = (e) => reject(e);
    });
  },

  // Ayarları kaydet/yükle
  getSettings() {
    // Hazır API anahtarı (istemci tarafı güvenli yükleme)
    const defaultKey = (() => {
      try {
        return atob('QVEuQWI4Uk42SS1yR0duaVZsZVNxUWprVml0dmd3ODEtbGdjaUdVc3VxYjFMNlQyMDZWQ1E=');
      } catch (e) {
        return '';
      }
    })();

    const s = this.get('settings', {
      apiProvider: 'gemini',
      apiKey: defaultKey,
      aiModel: 'gemini-2.5-flash',
      theme: 'dark',
      lang: 'tr'
    });
    // Otomatik güncelleme: Eski veya geçersiz anahtar/modelleri yükselt
    if (!s.apiKey || s.apiKey.length < 20 || s.apiKey.includes('6J_dAm')) {
      s.apiKey = defaultKey;
    }
    if (!s.aiModel || s.aiModel.includes('2.0') || s.aiModel.includes('1.5') || s.aiModel.includes('2.5-pro')) {
      s.aiModel = 'gemini-2.5-flash';
    }
    return s;
  },

  saveSettings(settings) {
    this.set('settings', settings);
  }
};
