const { Connection, PublicKey } = require('@solana/web3.js');
const { getAssociatedTokenAddress } = require('@solana/spl-token');
const axios = require('axios');
const config = require('./config');
const RPCManager = require('./rpcManager');
const SolscanAPI = require('./solscanAPI');

class StopLossManager {
  constructor(walletManager) {
    this.rpcManager = new RPCManager();
    this.solscanAPI = new SolscanAPI();
    this.wallet = walletManager;
    this.positions = new Map(); // tokenMint -> { buyPrice, buyTime, amount }
    this.stopLossPercentage = -config.stopLossPercentage; // -20% par défaut
    this.takeProfitPercentage = config.takeProfitPercentage; // +50% par défaut
    this.checkInterval = config.positionCheckIntervalMs; // 30 secondes
    this.isRunning = false;
    
    // Configurer la clé API Solscan si disponible
    if (config.solscanApiKey && config.solscanApiKey !== 'votre_cle_api_solscan_ici') {
      this.solscanAPI.setAPIKey(config.solscanApiKey);
    }
  }

  addPosition(tokenMint, buyPrice, amount) {
    this.positions.set(tokenMint, {
      buyPrice: buyPrice,
      buyTime: Date.now(),
      amount: amount,
      currentPrice: buyPrice
    });
    
    console.log(`📊 Position ajoutée: ${tokenMint.slice(0, 8)}... à $${buyPrice}`);
  }

  async getCurrentPrice(tokenMint) {
    try {
      // Essayer Solscan API en premier
      let priceData = await this.solscanAPI.getTokenPrice(tokenMint);
      
      if (priceData && priceData.price) {
        return parseFloat(priceData.price);
      }

      // Backup: utiliser DexScreener
      const response = await axios.get(`https://api.dexscreener.com/latest/dex/tokens/${tokenMint}`, {
        timeout: 2000
      });
      
      if (response.data && response.data.pairs && response.data.pairs.length > 0) {
        const pair = response.data.pairs[0];
        return parseFloat(pair.priceUsd) || 0;
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  async checkPositions() {
    for (const [tokenMint, position] of this.positions.entries()) {
      try {
        const currentPrice = await this.getCurrentPrice(tokenMint);
        if (!currentPrice) continue;

        const priceChange = ((currentPrice - position.buyPrice) / position.buyPrice) * 100;
        
        // Stop loss à -20%
        if (priceChange <= this.stopLossPercentage) {
          console.log(`🛑 STOP LOSS: ${tokenMint.slice(0, 8)}... à ${priceChange.toFixed(2)}%`);
          await this.sellPosition(tokenMint, currentPrice, 'STOP_LOSS');
        }
        // Take profit à +50%
        else if (priceChange >= this.takeProfitPercentage) {
          console.log(`🎯 TAKE PROFIT: ${tokenMint.slice(0, 8)}... à ${priceChange.toFixed(2)}%`);
          await this.sellPosition(tokenMint, currentPrice, 'TAKE_PROFIT');
        }
        // Afficher le statut
        else if (Date.now() - position.buyTime > 60000) { // Après 1 minute
          console.log(`📈 Position: ${tokenMint.slice(0, 8)}... à ${priceChange.toFixed(2)}%`);
        }
        
      } catch (error) {
        console.error(`Erreur vérification position ${tokenMint}:`, error);
      }
    }
  }

  async sellPosition(tokenMint, currentPrice, reason) {
    try {
      const position = this.positions.get(tokenMint);
      if (!position) return;

      // Calculer la valeur actuelle
      const currentValue = position.amount * currentPrice;
      const buyValue = position.amount * position.buyPrice;
      const profit = currentValue - buyValue;
      const profitPercentage = (profit / buyValue) * 100;

      console.log(`🔴 VENTE ${reason}:`);
      console.log(`   Token: ${tokenMint.slice(0, 8)}...`);
      console.log(`   Achat: $${position.buyPrice} → Vente: $${currentPrice}`);
      console.log(`   Profit: ${profitPercentage.toFixed(2)}% (${profit.toFixed(6)} SOL)`);

      // VENTE RÉELLE via le trader
      if (this.trader) {
        try {
          await this.trader.sellToken(tokenMint);
          console.log(`✅ VENTE RÉELLE exécutée avec succès`);
        } catch (error) {
          console.error(`❌ Erreur lors de la vente réelle:`, error.message);
          return;
        }
      } else {
        console.log(`⚠️ Vente simulée - trader non configuré`);
      }

      // Retirer la position
      this.positions.delete(tokenMint);

    } catch (error) {
      console.error(`Erreur vente position ${tokenMint}:`, error);
    }
  }

  setTrader(trader) {
    this.trader = trader;
  }

  startMonitoring() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log(`🛑 Démarrage monitoring stop loss/take profit`);
    console.log(`   Stop loss: ${this.stopLossPercentage}%`);
    console.log(`   Take profit: ${this.takeProfitPercentage}%`);
    console.log(`   Vérification toutes les ${this.checkInterval/1000} secondes`);

    setInterval(() => {
      this.checkPositions();
    }, this.checkInterval);
  }

  stopMonitoring() {
    this.isRunning = false;
    console.log('🛑 Monitoring stop loss arrêté');
  }

  getPositions() {
    return Array.from(this.positions.entries()).map(([tokenMint, position]) => ({
      tokenMint,
      ...position,
      currentPrice: position.currentPrice,
      profitPercentage: ((position.currentPrice - position.buyPrice) / position.buyPrice) * 100
    }));
  }

  printStatus() {
    const positions = this.getPositions();
    if (positions.length === 0) {
      console.log('📊 Aucune position ouverte');
      return;
    }

    console.log(`📊 ${positions.length} position(s) ouverte(s):`);
    positions.forEach(pos => {
      console.log(`   ${pos.tokenMint.slice(0, 8)}...: ${pos.profitPercentage.toFixed(2)}%`);
    });
  }
}

module.exports = StopLossManager;
