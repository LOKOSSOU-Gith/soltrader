const axios = require('axios');
const config = require('./config');

class TokenValidator {
  constructor() {
    this.dexScreenerAPI = 'https://api.dexscreener.com/latest/dex';
    this.solanaAPI = 'https://api.solana.com';
    this.cache = new Map();
    this.cacheTimeout = 30000; // 30 secondes cache
  }

  async validateToken(tokenMint, tokenAge = null) {
    try {
      const cacheKey = `validate-${tokenMint}`;
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          return cached.data;
        }
      }

      console.log(`🔍 Validation token: ${tokenMint.slice(0, 8)}...`);

      // Validation parallèle
      const [tokenInfo, marketData] = await Promise.all([
        this.getTokenInfo(tokenMint),
        this.getMarketData(tokenMint)
      ]);

      const validation = {
        isValid: false,
        reasons: [],
        tokenInfo,
        marketData,
        age: tokenAge
      };

      // 1. Vérifier l'âge du token (< 60 secondes)
      if (tokenAge && tokenAge > config.maxTokenAgeSeconds) {
        validation.reasons.push(`Token trop vieux: ${tokenAge}s > ${config.maxTokenAgeSeconds}s`);
      }

      // 2. Vérifier market cap (< 80k$)
      if (marketData.marketCap && marketData.marketCap > config.maxMarketCap) {
        validation.reasons.push(`Market cap trop élevé: $${marketData.marketCap.toLocaleString()} > $${config.maxMarketCap.toLocaleString()}`);
      }

      // 3. Safeguard: market cap hard limit (< 300k$)
      if (marketData.marketCap && marketData.marketCap > config.maxMarketCapHard) {
        validation.reasons.push(`Market cap exceeds hard limit: $${marketData.marketCap.toLocaleString()} > $${config.maxMarketCapHard.toLocaleString()}`);
      }

      // 4. Vérifier nombre de holders (5-10)
      if (marketData.holders) {
        if (marketData.holders < config.minHolders) {
          validation.reasons.push(`Pas assez de holders: ${marketData.holders} < ${config.minHolders}`);
        }
        if (marketData.holders > config.maxHolders) {
          validation.reasons.push(`Trop de holders: ${marketData.holders} > ${config.maxHolders}`);
        }
      }

      // 5. Vérifier volume 5min (> 8k$)
      if (marketData.volume5m && marketData.volume5m < config.minVolume5min) {
        validation.reasons.push(`Volume 5min trop bas: $${marketData.volume5m.toLocaleString()} < $${config.minVolume5min.toLocaleString()}`);
      }

      // 6. Vérifier si déjà sur homepage (DexScreener)
      if (marketData.isOnHomepage) {
        validation.reasons.push('Token déjà sur homepage - à éviter');
      }

      // 7. Vérifier distribution des holders (pas 1 seul whale dominant)
      if (marketData.holderDistribution) {
        const topHolderPercentage = marketData.holderDistribution[0]?.percentage || 0;
        if (topHolderPercentage > 50) {
          validation.reasons.push(`Whale dominant: ${topHolderPercentage}% du supply`);
        }
      }

      // 8. Vérifier si le token a déjà pumpé (+300%)
      if (marketData.priceChange24h && marketData.priceChange24h > 300) {
        validation.reasons.push(`Token déjà pumpé: +${marketData.priceChange24h}%`);
      }

      validation.isValid = validation.reasons.length === 0;

      // Mettre en cache
      this.cache.set(cacheKey, {
        data: validation,
        timestamp: Date.now()
      });

      if (validation.isValid) {
        console.log(`✅ Token validé: ${tokenMint.slice(0, 8)}...`);
        console.log(`   📊 MC: $${marketData.marketCap?.toLocaleString() || 'N/A'}`);
        console.log(`   👥 Holders: ${marketData.holders || 'N/A'}`);
        console.log(`   📈 Volume 5m: $${marketData.volume5m?.toLocaleString() || 'N/A'}`);
      } else {
        console.log(`❌ Token rejeté: ${tokenMint.slice(0, 8)}...`);
        validation.reasons.forEach(reason => console.log(`   - ${reason}`));
      }

      return validation;

    } catch (error) {
      console.error(`Erreur validation token ${tokenMint}:`, error.message);
      return {
        isValid: false,
        reasons: [`Erreur validation: ${error.message}`],
        tokenInfo: null,
        marketData: null,
        age: tokenAge
      };
    }
  }

  async getTokenInfo(tokenMint) {
    try {
      const response = await axios.get(`${this.solanaAPI}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        data: {
          jsonrpc: '2.0',
          id: 1,
          method: 'getAccountInfo',
          params: [tokenMint, { encoding: 'jsonParsed' }]
        },
        timeout: 5000
      });

      if (response.data.result?.value?.data?.parsed?.info) {
        const info = response.data.result.value.data.parsed.info;
        return {
          supply: info.supply,
          decimals: info.decimals,
          mintAuthority: info.mintAuthority,
          freezeAuthority: info.freezeAuthority,
          isInitialized: info.isInitialized
        };
      }

      return null;

    } catch (error) {
      console.error(`Erreur récupération info token ${tokenMint}:`, error.message);
      return null;
    }
  }

  async getMarketData(tokenMint) {
    try {
      // Utiliser DexScreener API
      const response = await axios.get(`${this.dexScreenerAPI}/search?q=${tokenMint}`, {
        timeout: 5000
      });

      if (response.data.pairs && response.data.pairs.length > 0) {
        const pair = response.data.pairs[0]; // Prendre la paire la plus liquide
        
        return {
          marketCap: pair.fdv || pair.marketCap,
          volume5m: pair.volume?.h5 || 0,
          volume24h: pair.volume?.h24 || 0,
          holders: pair.holders || 0,
          price: pair.priceUsd,
          priceChange24h: pair.priceChange?.h24 || 0,
          liquidity: pair.liquidity?.usd || 0,
          isOnHomepage: pair.boosts?.boosted || false,
          holderDistribution: await this.getHolderDistribution(tokenMint),
          pairAddress: pair.pairAddress,
          dexId: pair.dexId
        };
      }

      return {
        marketCap: 0,
        volume5m: 0,
        volume24h: 0,
        holders: 0,
        price: 0,
        priceChange24h: 0,
        liquidity: 0,
        isOnHomepage: false,
        holderDistribution: null
      };

    } catch (error) {
      console.error(`Erreur récupération market data ${tokenMint}:`, error.message);
      return null;
    }
  }

  async getHolderDistribution(tokenMint) {
    try {
      // Simulation - dans une vraie implémentation, utiliser Solscan API ou autre
      // Pour l'instant, retourner null pour éviter les erreurs
      return null;
    } catch (error) {
      return null;
    }
  }

  clearCache() {
    this.cache.clear();
    console.log('🗑️ Cache token validation vidé');
  }

  getCacheSize() {
    return this.cache.size;
  }
}

module.exports = TokenValidator;
