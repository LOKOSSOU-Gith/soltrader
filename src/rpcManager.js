const { Connection } = require('@solana/web3.js');
const config = require('./config');

class RPCManager {
  constructor() {
    this.rpcUrls = config.rpcUrl.split(',').map(url => url.trim());
    this.currentIndex = 0;
    this.connections = this.rpcUrls.map(url => new Connection(url, 'confirmed'));
  }

  async executeWithRetry(fn, maxRetries = 3) {
    let lastError;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      for (let i = 0; i < this.rpcUrls.length; i++) {
        const connection = this.connections[this.currentIndex];
        
        try {
          const result = await fn(connection);
          return result;
        } catch (error) {
          lastError = error;
          console.warn(`RPC ${this.currentIndex} failed: ${error.message}`);
          
          // Passer à l'endpoint suivant
          this.currentIndex = (this.currentIndex + 1) % this.rpcUrls.length;
          
          // Attendre un peu avant de réessayer
          if (attempt < maxRetries - 1) {
            const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
    }
    
    throw lastError;
  }

  getCurrentConnection() {
    return this.connections[this.currentIndex];
  }

  rotateConnection() {
    this.currentIndex = (this.currentIndex + 1) % this.rpcUrls.length;
    console.log(`🔄 Rotation vers RPC ${this.currentIndex}: ${this.rpcUrls[this.currentIndex]}`);
  }
}

module.exports = RPCManager;
