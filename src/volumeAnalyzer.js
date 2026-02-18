const axios = require('axios');
const config = require('./config');

class VolumeAnalyzer {
  constructor() {
    this.solscanAPI = new (require('./solscanAPI'))();
  }

  async analyzeToken(tokenMint) {
    try {
      console.log(`📊 Analyse du token ${tokenMint.slice(0, 8)}...`);
      
      const analysis = {
        tokenMint,
        volume5min: 0,
        holdersChange5min: 0,
        marketCap: 0,
        priceChange5min: 0,
        isValid: false
      };

      // Récupérer les infos du token
      const tokenInfo = await this.solscanAPI.getTokenInfo(tokenMint);
      if (!tokenInfo) {
        console.log(`❌ Token ${tokenMint.slice(0, 8)}... non trouvé`);
        return analysis;
      }

      // Récupérer le prix actuel
      const priceInfo = await this.solscanAPI.getTokenPrice(tokenMint);
      
      // Récupérer les transactions récentes (5 dernières minutes)
      const now = Math.floor(Date.now() / 1000);
      const fiveMinutesAgo = now - 300;
      
      const transactions = await this.solscanAPI.getAccountTransactions(tokenMint, 50);
      const recentTransactions = transactions.filter(tx => 
        tx.blockTime && tx.blockTime >= fiveMinutesAgo
      );

      // Calculer le volume sur 5 minutes
      let volume5min = 0;
      let buyTransactions = 0;
      let sellTransactions = 0;

      for (const tx of recentTransactions) {
        if (tx.status === 'Success') {
          const details = await this.solscanAPI.getTransactionDetails(tx.signature);
          if (details && details.tokenTransfers) {
            for (const transfer of details.tokenTransfers) {
              if (transfer.tokenAddress === tokenMint) {
                const amount = parseFloat(transfer.amount) || 0;
                volume5min += amount;
                
                // Détecter si c'est un achat ou une vente
                if (transfer.to !== transfer.from) {
                  if (transfer.type === 'in') {
                    buyTransactions++;
                  } else {
                    sellTransactions++;
                  }
                }
              }
            }
          }
        }
      }

      // Récupérer le nombre de holders
      const holders = await this.getTokenHolders(tokenMint);
      const holdersChange5min = await this.getHoldersChange(tokenMint, fiveMinutesAgo);

      // Calculer la market cap
      const currentPrice = priceInfo?.price || 0;
      const supply = tokenInfo.supply || 0;
      const marketCap = currentPrice * supply;

      // Déterminer si c'est une bougie verte forte
      const isGreenCandle = buyTransactions > sellTransactions * 1.5; // 50% plus d'achats que de ventes
      const strongMomentum = buyTransactions >= 10; // Au moins 10 transactions d'achat

      analysis.volume5min = volume5min;
      analysis.holdersChange5min = holdersChange5min;
      analysis.marketCap = marketCap;
      analysis.currentPrice = currentPrice;
      analysis.buyTransactions = buyTransactions;
      analysis.sellTransactions = sellTransactions;
      analysis.isGreenCandle = isGreenCandle;
      analysis.strongMomentum = strongMomentum;

      // Valider selon la stratégie Pump Volume Entry
      analysis.isValid = this.validatePumpVolumeEntry(analysis);

      console.log(`📈 Résultats analyse ${tokenMint.slice(0, 8)}...:`);
      console.log(`   💰 Volume 5min: $${volume5min.toLocaleString()}`);
      console.log(`   👥 Changement holders: +${holdersChange5min}`);
      console.log(`   📊 Market cap: $${marketCap.toLocaleString()}`);
      console.log(`   📈 Prix: $${currentPrice}`);
      console.log(`   🟢 Bougie verte: ${isGreenCandle ? 'OUI' : 'NON'}`);
      console.log(`   ⚡ Momentum: ${strongMomentum ? 'OUI' : 'NON'}`);
      console.log(`   ✅ Valide: ${analysis.isValid ? 'OUI' : 'NON'}`);

      return analysis;

    } catch (error) {
      console.error(`❌ Erreur analyse token ${tokenMint}:`, error.message);
      return {
        tokenMint,
        volume5min: 0,
        holdersChange5min: 0,
        marketCap: 0,
        isValid: false
      };
    }
  }

  validatePumpVolumeEntry(analysis) {
    const conditions = {
      volume: analysis.volume5min > 50000, // Volume 5min > 50k$
      holders: analysis.holdersChange5min > 30, // Augmentation holders > 30 en 5min
      marketCap: analysis.marketCap < 1000000, // Market cap < 1M
      greenCandle: analysis.isGreenCandle, // Bougie verte forte
      momentum: analysis.strongMomentum // Entrée momentum
    };

    console.log(`🔍 Conditions validation ${analysis.tokenMint.slice(0, 8)}...:`);
    console.log(`   💰 Volume > 50k$: ${conditions.volume ? '✅' : '❌'} ($${analysis.volume5min.toLocaleString()})`);
    console.log(`   👥 Holders +30: ${conditions.holders ? '✅' : '❌'} (+${analysis.holdersChange5min})`);
    console.log(`   📊 MC < 1M: ${conditions.marketCap ? '✅' : '❌'} ($${analysis.marketCap.toLocaleString()})`);
    console.log(`   🟢 Bougie verte: ${conditions.greenCandle ? '✅' : '❌'}`);
    console.log(`   ⚡ Momentum: ${conditions.momentum ? '✅' : '❌'}`);

    return Object.values(conditions).every(condition => condition === true);
  }

  async getTokenHolders(tokenMint) {
    try {
      // Utiliser Solscan API pour obtenir les holders
      const response = await axios.get(`https://api.solscan.io/token/holders?tokenAddress=${tokenMint}`, {
        headers: {
          'Authorization': `Bearer ${config.solscanApiKey}`,
          'User-Agent': 'Solana-Memecoin-Bot/1.0'
        },
        timeout: 10000
      });

      if (response.data && response.data.success && response.data.data) {
        return response.data.data.length || 0;
      }

      return 0;
    } catch (error) {
      console.error(`❌ Erreur récupération holders ${tokenMint}:`, error.message);
      return 0;
    }
  }

  async getHoldersChange(tokenMint, sinceTimestamp) {
    try {
      // Analyser les transactions récentes pour estimer le changement de holders
      const transactions = await this.solscanAPI.getAccountTransactions(tokenMint, 100);
      const recentTransactions = transactions.filter(tx => 
        tx.status === 'Success' && tx.blockTime && tx.blockTime >= sinceTimestamp
      );

      const newHolders = new Set();
      
      for (const tx of recentTransactions) {
        const details = await this.solscanAPI.getTransactionDetails(tx.signature);
        if (details && details.tokenTransfers) {
          for (const transfer of details.tokenTransfers) {
            if (transfer.tokenAddress === tokenMint && transfer.to) {
              newHolders.add(transfer.to);
            }
          }
        }
      }

      return newHolders.size;
    } catch (error) {
      console.error(`❌ Erreur calcul changement holders ${tokenMint}:`, error.message);
      return 0;
    }
  }

  async shouldEnterTrade(tokenMint) {
    const analysis = await this.analyzeToken(tokenMint);
    return analysis.isValid;
  }
}

module.exports = VolumeAnalyzer;
