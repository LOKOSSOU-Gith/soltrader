const axios = require('axios');
const config = require('./config');

class SolscanAPI {
  constructor() {
    this.baseURL = 'https://api.solscan.io';
    this.apiKey = process.env.SOLSCAN_API_KEY || null;
    this.rateLimit = {
      requests: 0,
      windowStart: Date.now(),
      maxRequests: 20, // Réduit à 20 requêtes par minute pour éviter les blocages
      windowMs: 60000
    };
  }

  async checkRateLimit() {
    const now = Date.now();
    if (now - this.rateLimit.windowStart > this.rateLimit.windowMs) {
      this.rateLimit.requests = 0;
      this.rateLimit.windowStart = now;
    }

    if (this.rateLimit.requests >= this.rateLimit.maxRequests) {
      const waitTime = this.rateLimit.windowMs - (now - this.rateLimit.windowStart);
      console.log(`⏳ Rate limit Solscan atteint, attente ${waitTime/1000}s...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.rateLimit.requests = 0;
      this.rateLimit.windowStart = Date.now();
    }

    this.rateLimit.requests++;
  }

  async makeRequest(endpoint, params = {}) {
    await this.checkRateLimit();

    const maxRetries = 3;
    const baseDelay = 1000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const headers = {
          'User-Agent': 'Solana-Memecoin-Bot/1.0',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        };

        if (this.apiKey) {
          headers['Authorization'] = `Bearer ${this.apiKey}`;
        }

        const response = await axios.get(`${this.baseURL}${endpoint}`, {
          params,
          headers,
          timeout: 10000,
          validateStatus: (status) => status < 500
        });

        if (response.status === 403) {
          console.log(`🚫 Accès refusé par Cloudflare (403), tentative ${attempt}/${maxRetries}`);
          if (attempt === maxRetries) {
            throw new Error('Accès bloqué par Cloudflare après plusieurs tentatives');
          }
          await new Promise(resolve => setTimeout(resolve, baseDelay * Math.pow(2, attempt)));
          continue;
        }

        if (response.status === 429) {
          const retryAfter = response.headers['retry-after'] || 5;
          console.log(`⏳ Rate limit 429, attente ${retryAfter}s (tentative ${attempt}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          continue;
        }

        return response.data;

      } catch (error) {
        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
          console.log(`⏱️ Timeout Solscan API, tentative ${attempt}/${maxRetries}`);
          if (attempt === maxRetries) throw error;
          await new Promise(resolve => setTimeout(resolve, baseDelay * Math.pow(2, attempt)));
          continue;
        }
        
        if (attempt === maxRetries) {
          console.error(`❌ Erreur Solscan API ${endpoint} après ${maxRetries} tentatives:`, error.message);
          throw error;
        }
        
        console.log(`🔄 Erreur Solscan API, tentative ${attempt}/${maxRetries}:`, error.message);
        await new Promise(resolve => setTimeout(resolve, baseDelay * Math.pow(2, attempt)));
      }
    }
  }

  async getAccountTransactions(accountAddress, limit = 10, before = null) {
    try {
      const params = {
        account: accountAddress,
        limit: limit
      };

      if (before) {
        params.before = before;
      }

      const data = await this.makeRequest('/account/transactions', params);
      
      if (data.success && data.data) {
        return data.data.map(tx => ({
          signature: tx.txHash,
          blockTime: tx.blockTime,
          slot: tx.slot,
          status: tx.status,
          fee: tx.fee,
          parsedInstruction: tx.parsedInstruction
        }));
      }

      return [];

    } catch (error) {
      console.error(`Erreur récupération transactions Solscan pour ${accountAddress}:`, error);
      return [];
    }
  }

  async getTokenTransfers(accountAddress, limit = 10) {
    try {
      const params = {
        account: accountAddress,
        limit: limit
      };

      const data = await this.makeRequest('/account/tokenTransfers', params);
      
      if (data.success && data.data) {
        return data.data.map(transfer => ({
          signature: transfer.txHash,
          blockTime: transfer.blockTime,
          tokenAddress: transfer.tokenAddress,
          tokenSymbol: transfer.tokenSymbol,
          from: transfer.from,
          to: transfer.to,
          amount: transfer.amount,
          decimals: transfer.decimals,
          type: transfer.type // 'in' ou 'out'
        }));
      }

      return [];

    } catch (error) {
      console.error(`Erreur récupération token transfers Solscan pour ${accountAddress}:`, error);
      return [];
    }
  }

  async getTokenInfo(tokenAddress) {
    try {
      const data = await this.makeRequest('/token/meta', {
        tokenAddress: tokenAddress
      });
      
      if (data.success && data.data) {
        return {
          symbol: data.data.symbol,
          name: data.data.name,
          decimals: data.data.decimals,
          supply: data.data.supply,
          icon: data.data.icon,
          price: data.data.price || 0,
          marketCap: data.data.marketCap || 0,
          volume24h: data.data.volume24h || 0
        };
      }

      return null;

    } catch (error) {
      console.error(`Erreur récupération infos token Solscan ${tokenAddress}:`, error);
      return null;
    }
  }

  async getAccountTokens(accountAddress) {
    try {
      const data = await this.makeRequest('/account/tokens', {
        account: accountAddress
      });
      
      if (data.success && data.data) {
        return data.data.map(token => ({
          tokenAddress: token.tokenAddress,
          tokenAccount: token.tokenAccount,
          tokenSymbol: token.tokenSymbol,
          tokenName: token.tokenName,
          amount: token.amount,
          decimals: token.decimals,
          price: token.price || 0,
          value: token.value || 0
        }));
      }

      return [];

    } catch (error) {
      console.error(`Erreur récupération tokens du compte Solscan ${accountAddress}:`, error);
      return [];
    }
  }

  async getTokenPrice(tokenAddress) {
    try {
      const data = await this.makeRequest('/token/price', {
        tokenAddress: tokenAddress
      });
      
      if (data.success && data.data) {
        return {
          price: data.data.price,
          priceChange24h: data.data.priceChange24h || 0,
          volume24h: data.data.volume24h || 0,
          marketCap: data.data.marketCap || 0
        };
      }

      return null;

    } catch (error) {
      console.error(`Erreur récupération prix token Solscan ${tokenAddress}:`, error);
      return null;
    }
  }

  async getTransactionDetails(signature) {
    try {
      const data = await this.makeRequest('/transaction', {
        tx: signature
      });
      
      if (data.success && data.data) {
        return {
          signature: data.data.txHash,
          blockTime: data.data.blockTime,
          slot: data.data.slot,
          status: data.data.status,
          fee: data.data.fee,
          instructions: data.data.parsedInstruction || [],
          tokenTransfers: data.data.tokenTransfers || [],
          solTransfers: data.data.solTransfers || []
        };
      }

      return null;

    } catch (error) {
      console.error(`Erreur détails transaction Solscan ${signature}:`, error);
      return null;
    }
  }

  async isTokenTransfer(transaction, targetAddress) {
    try {
      // Vérifier si c'est un transfert de token vers l'adresse cible
      if (transaction.tokenTransfers && transaction.tokenTransfers.length > 0) {
        for (const transfer of transaction.tokenTransfers) {
          if (transfer.to === targetAddress && transfer.type === 'in') {
            return {
              tokenMint: transfer.tokenAddress,
              amount: transfer.amount,
              decimals: transfer.decimals,
              symbol: transfer.tokenSymbol,
              signature: transaction.signature,
              blockTime: transaction.blockTime
            };
          }
        }
      }

      return null;

    } catch (error) {
      console.error('Erreur vérification transfert token:', error);
      return null;
    }
  }

  async getLatestTokenPurchases(accountAddress, limit = 5) {
    try {
      // Récupérer les transactions récentes
      const transactions = await this.getAccountTransactions(accountAddress, limit);
      const purchases = [];

      for (const tx of transactions) {
        if (tx.status !== 'Success') continue;

        // Récupérer les détails complets de la transaction
        const details = await this.getTransactionDetails(tx.signature);
        if (!details) continue;

        // Vérifier si c'est un achat de token
        const transfer = await this.isTokenTransfer(details, accountAddress);
        if (transfer) {
          purchases.push(transfer);
        }
      }

      return purchases;

    } catch (error) {
      console.error(`Erreur récupération achats de tokens Solscan ${accountAddress}:`, error);
      return [];
    }
  }

  setAPIKey(apiKey) {
    this.apiKey = apiKey;
    console.log('🔑 Clé API Solscan configurée');
  }

  getRateLimitStatus() {
    return {
      requests: this.rateLimit.requests,
      windowStart: this.rateLimit.windowStart,
      maxRequests: this.rateLimit.maxRequests,
      windowMs: this.rateLimit.windowMs,
      remaining: this.rateLimit.maxRequests - this.rateLimit.requests
    };
  }
}

module.exports = SolscanAPI;
