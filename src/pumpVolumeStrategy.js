const JupiterAPI = require('./jupiterAPI');
const VolumeAnalyzer = require('./volumeAnalyzer');
const config = require('./config');

class PumpVolumeStrategy {
  constructor(wallet, connection) {
    this.wallet = wallet;
    this.connection = connection;
    this.jupiter = new JupiterAPI(connection, wallet);
    this.analyzer = new VolumeAnalyzer();
    this.positions = new Map(); // Suivi des positions ouvertes
    this.isRunning = false;
  }

  async initialize() {
    try {
      await this.jupiter.initialize();
      console.log('🚀 Stratégie Micro-Sniper initialisée');
      console.log('🎯 Mode: Agressif contrôlé pour 0.0015 SOL');
      console.log('📊 Conditions d\'entrée MICRO-SNIPER:');
      console.log('   ⏰ Token < 60 secondes');
      console.log('   💰 Market cap < 80k$');
      console.log('   👥 5-10 holders minimum');
      console.log('   📊 Volume 5min > 8k$');
      console.log('   � Liquidity locked');
      console.log('   🚫 Dev pas encore dump');
      console.log('💰 Mise: 0.0003-0.0005 SOL max par trade');
      console.log('🎯 TP rapide: +20%');
      console.log('🛑 Stop loss dur: -15%');
      console.log('📈 Objectif: 0.005 → 0.02 → 0.1 SOL');
    } catch (error) {
      console.error('❌ Erreur initialisation stratégie:', error.message);
      throw error;
    }
  }

  async analyzeAndTrade(tokenMint, source) {
    try {
      console.log(`🔍 Analyse MICRO-SNIPER du token ${tokenMint.slice(0, 8)}... détecté sur ${source}`);

      // Vérifier si nous avons déjà une position
      if (this.positions.has(tokenMint)) {
        console.log(`⚠️ Position déjà existante pour ${tokenMint.slice(0, 8)}...`);
        return null;
      }

      // Analyser le token selon la stratégie Micro-Sniper
      const analysis = await this.analyzer.analyzeTokenMicroSniper(tokenMint);
      
      if (!analysis.isValid) {
        console.log(`❌ Token ${tokenMint.slice(0, 8)}... ne remplit pas les conditions MICRO-SNIPER:`);
        console.log(`   ${analysis.reason}`);
        return null;
      }

      // Calculer la mise adaptée (0.0003-0.0005 SOL max)
      const tradeAmount = this.calculateMicroTradeAmount(analysis);
      
      if (tradeAmount < 0.0001) {
        console.log(`❌ Mise trop faible: ${tradeAmount} SOL`);
        return null;
      }

      console.log(`✅ Token validé pour MICRO-SNIPER:`);
      console.log(`   💰 Mise: ${tradeAmount} SOL`);
      console.log(`   📊 Market cap: ${analysis.marketCap}$`);
      console.log(`   👥 Holders: ${analysis.holders}`);
      console.log(`   📈 Volume 5min: ${analysis.volume5min}$`);
      console.log(`   ⏰ Âge: ${analysis.age} secondes`);

      // Exécuter l'achat
      return await this.executeEntry(tokenMint, analysis);

    } catch (error) {
      console.error(`❌ Erreur analyse/trade ${tokenMint}:`, error.message);
      return null;
    }
  }

  async executeEntry(tokenMint, analysis) {
    try {
      console.log(`🚀 Entrée en position sur ${tokenMint.slice(0, 8)}...`);
      console.log(`💰 Montant d'achat: ${config.buyAmountSol} SOL`);

      // Acheter le token via Jupiter
      const tradeResult = await this.jupiter.buyToken(tokenMint, config.buyAmountSol);
      
      if (!tradeResult) {
        throw new Error('Échec de l\'achat via Jupiter');
      }

      // Enregistrer la position
      const position = {
        tokenMint,
        entryPrice: analysis.currentPrice,
        entryAmount: tradeResult.outputAmount,
        entrySol: config.buyAmountSol,
        entryTime: Date.now(),
        signature: tradeResult.signature,
        takeProfitPrice: analysis.currentPrice * 1.15, // +15%
        stopLossPrice: analysis.currentPrice * 0.95, // -5%
        maxHoldTime: 5 * 60 * 1000, // 5 minutes maximum
        sourceWallet: analysis.sourceWallet
      };

      this.positions.set(tokenMint, position);

      console.log(`✅ Position ouverte sur ${tokenMint.slice(0, 8)}...:`);
      console.log(`   💰 Prix d'entrée: $${position.entryPrice}`);
      console.log(`   📊 Quantité: ${position.entryAmount} tokens`);
      console.log(`   🎯 Take profit: $${position.takeProfitPrice} (+15%)`);
      console.log(`   🛑 Stop loss: $${position.stopLossPrice} (-5%)`);
      console.log(`   ⏰ Max hold time: 5 minutes`);

      // Démarrer le monitoring de cette position
      this.startPositionMonitoring(tokenMint);

      return tradeResult;

    } catch (error) {
      console.error(`❌ Erreur exécution entrée ${tokenMint}:`, error.message);
      return null;
    }
  }

  startPositionMonitoring(tokenMint) {
    const position = this.positions.get(tokenMint);
    if (!position) return;

    const monitor = async () => {
      if (!this.positions.has(tokenMint)) return;

      try {
        // Vérifier le prix actuel
        const currentPrice = await this.getCurrentPrice(tokenMint);
        if (!currentPrice) {
          console.log(`⚠️ Impossible d'obtenir le prix pour ${tokenMint.slice(0, 8)}...`);
          setTimeout(monitor, 5000);
          return;
        }

        const profitPercent = ((currentPrice - position.entryPrice) / position.entryPrice) * 100;
        const timeHeld = Date.now() - position.entryTime;

        console.log(`📊 Position ${tokenMint.slice(0, 8)}...: P/L ${profitPercent.toFixed(2)}% | Temps: ${Math.floor(timeHeld / 1000)}s`);

        // Conditions de sortie
        let shouldExit = false;
        let exitReason = '';

        // Take profit 15%
        if (currentPrice >= position.takeProfitPrice) {
          shouldExit = true;
          exitReason = 'Take profit 15% atteint';
        }
        // Stop loss 5%
        else if (currentPrice <= position.stopLossPrice) {
          shouldExit = true;
          exitReason = 'Stop loss 5% atteint';
        }
        // Sortie rapide 10-20% (si profit entre 10% et 20%)
        else if (profitPercent >= 10 && profitPercent <= 20) {
          shouldExit = true;
          exitReason = `Sortie rapide à ${profitPercent.toFixed(1)}%`;
        }
        // Timeout après 5 minutes
        else if (timeHeld >= position.maxHoldTime) {
          shouldExit = true;
          exitReason = 'Timeout 5 minutes';
        }

        if (shouldExit) {
          await this.executeExit(tokenMint, exitReason);
        } else {
          setTimeout(monitor, 2000); // Vérifier toutes les 2 secondes
        }

      } catch (error) {
        console.error(`❌ Erreur monitoring position ${tokenMint}:`, error.message);
        setTimeout(monitor, 5000);
      }
    };

    // Démarrer le monitoring après 2 secondes
    setTimeout(monitor, 2000);
  }

  async executeExit(tokenMint, reason) {
    try {
      const position = this.positions.get(tokenMint);
      if (!position) return;

      console.log(`🚤 Sortie de position sur ${tokenMint.slice(0, 8)}... - ${reason}`);

      // Vendre tous les tokens via Jupiter
      const sellResult = await this.jupiter.sellToken(tokenMint, position.entryAmount);
      
      if (sellResult) {
        const currentPrice = await this.getCurrentPrice(tokenMint);
        const profitPercent = ((currentPrice - position.entryPrice) / position.entryPrice) * 100;
        
        console.log(`✅ Position fermée sur ${tokenMint.slice(0, 8)}...:`);
        console.log(`   🎯 Raison: ${reason}`);
        console.log(`   💰 Prix sortie: $${currentPrice}`);
        console.log(`   📊 P/L: ${profitPercent.toFixed(2)}%`);
        console.log(`   ⏰ Durée: ${Math.floor((Date.now() - position.entryTime) / 1000)}s`);
        console.log(`   📝 Transaction: ${sellResult.signature}`);
      }

      // Supprimer la position
      this.positions.delete(tokenMint);

    } catch (error) {
      console.error(`❌ Erreur sortie position ${tokenMint}:`, error.message);
    }
  }

  async getCurrentPrice(tokenMint) {
    try {
      const priceInfo = await this.jupiter.getTokenPrice(tokenMint);
      return priceInfo ? priceInfo.price : null;
    } catch (error) {
      console.error(`❌ Erreur prix actuel ${tokenMint}:`, error.message);
      return null;
    }
  }

  getPositions() {
    return Array.from(this.positions.values());
  }

  getPositionCount() {
    return this.positions.size;
  }

  async closeAllPositions(reason = 'Arrêt du bot') {
    console.log(`🛑 Fermeture de toutes les positions - ${reason}`);
    
    const positions = Array.from(this.positions.keys());
    for (const tokenMint of positions) {
      await this.executeExit(tokenMint, reason);
    }
  }

  stop() {
    this.isRunning = false;
    this.closeAllPositions('Arrêt de la stratégie');
  }
}

module.exports = PumpVolumeStrategy;
