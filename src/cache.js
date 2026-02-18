class CacheManager {
  constructor(ttlMs = 30000) { // TTL par défaut 30 secondes
    this.cache = new Map();
    this.ttlMs = ttlMs;
  }

  set(key, value) {
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  has(key) {
    return this.get(key) !== null;
  }

  delete(key) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  // Nettoyage automatique des entrées expirées
  cleanup() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > this.ttlMs) {
        this.cache.delete(key);
      }
    }
  }
}

module.exports = CacheManager;
