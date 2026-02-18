const config = require('./config');

class PositionManager {
  constructor() {
    this.positions = new Map(); // tokenMint -> position info
    this.dailyTrades = 0;
    this.dailyPnL = 0;
    this.lastResetDate = new Date().toDateString();
    this.maxDailyTrades = 10; // Limite de trades par jour pour petit solde
  }

  calculatePositionSize(tokenMint, marketData) {
    try {
      // Reset quotidien
      this.resetDailyIfNeeded();

      // Vérifier limite de trades journaliers
      if (this.dailyTrades >= this.maxDailyTrades) {
        console.log(`⚠️ Limite de trades journaliers atteinte: ${this.dailyTrades}/${this.maxDailyTrades}`);
        return null;
      }

      // Position de base selon la stratégie
      let positionSize = config.buyAmountSol;

      // Ajustement dynamique selon les conditions du marché
      if (marketData) {
        // Si market cap très bas (< 30k), réduire la position
        if (marketData.marketCap && marketData.marketCap < 30000) {
          positionSize = config.minBuyAmountSol;
          console.log(`📉 Market cap bas ($${marketData.marketCap.toLocaleString()}), position réduite à ${positionSize} SOL`);
        }

        // Si volume très élevé (> 20k), augmenter légèrement
        if (marketData.volume5m && marketData.volume5m > 20000) {
          positionSize = Math.min(positionSize * 1.2, config.maxBuyAmountSol);
          console.log(`📈 Volume élevé ($${marketData.volume5m.toLocaleString()}), position augmentée à ${positionSize} SOL`);
        }

        // Si liquidité très faible (< 2k), réduire la position
        if (marketData.liquidity && marketData.liquidity < 2000) {
          positionSize = config.minBuyAmountSol;
          console.log(`💧 Liquidité faible ($${marketData.liquidity.toLocaleString()}), position minimale à ${positionSize} SOL`);
        }
      }

      // Vérifier si on a déjà une position sur ce token
      if (this.positions.has(tokenMint)) {
        console.log(`⚠️ Position existante sur ${tokenMint.slice(0, 8)}..., pas de nouvelle position`);
        return null;
      }

      // Arrondir à 6 décimales pour éviter les problèmes de précision
      positionSize = Math.round(positionSize * 1000000) / 1000000;

      // Validation finale
      if (positionSize < config.minBuyAmountSol || positionSize > config.maxBuyAmountSol) {
        console.log(`❌ Position size invalide: ${positionSize} SOL (min: ${config.minBuyAmountSol}, max: ${config.maxBuyAmountSol})`);
        return null;
      }

      console.log(`💰 Position calculée: ${positionSize} SOL pour ${tokenMint.slice(0, 8)}...`);
      return positionSize;

    } catch (error) {
      console.error('Erreur calcul position size:', error);
      return null;
    }
  }

  openPosition(tokenMint, amount, entryPrice, tokenInfo) {
    try {
      const position = {
        tokenMint,
        amount,
        entryPrice,
        entryTime: Date.now(),
        entryValue: amount * entryPrice,
        currentPrice: entryPrice,
        currentValue: amount * entryPrice,
        pnl: 0,
        pnlPercentage: 0,
        status: 'open',
        tokenInfo,
        trades: []
      };

      this.positions.set(tokenMint, position);
      this.dailyTrades++;

      console.log(`📈 Position ouverte: ${tokenMint.slice(0, 8)}...`);
      console.log(`   💰 Montant: ${amount} SOL`);
      console.log(`   💵 Entry: $${entryPrice}`);
      console.log(`   📊 Valeur: $${position.entryValue.toFixed(4)}`);

      return position;

    } catch (error) {
      console.error('Erreur ouverture position:', error);
      return null;
    }
  }

  closePosition(tokenMint, exitPrice, reason = 'take_profit') {
    try {
      const position = this.positions.get(tokenMint);
      if (!position) {
        console.log(`⚠️ Aucune position trouvée pour ${tokenMint.slice(0, 8)}...`);
        return null;
      }

      // Calcul PnL final
      const exitValue = position.amount * exitPrice;
      const pnl = exitValue - position.entryValue;
      const pnlPercentage = ((exitPrice - position.entryPrice) / position.entryPrice) * 100;

      // Mettre à jour la position
      position.exitPrice = exitPrice;
      position.exitTime = Date.now();
      position.exitValue = exitValue;
      position.pnl = pnl;
      position.pnlPercentage = pnlPercentage;
      position.status = 'closed';
      position.closeReason = reason;

      // Mettre à jour PnL quotidien
      this.dailyPnL += pnl;

      console.log(`📉 Position fermée: ${tokenMint.slice(0, 8)}...`);
      console.log(`   💵 Exit: $${exitPrice}`);
      console.log(`   📊 PnL: $${pnl.toFixed(4)} (${pnlPercentage.toFixed(2)}%)`);
      console.log(`   📝 Raison: ${reason}`);

      // Garder en historique pendant 1h
      setTimeout(() => {
        this.positions.delete(tokenMint);
      }, 3600000);

      return position;

    } catch (error) {
      console.error('Erreur fermeture position:', error);
      return null;
    }
  }

  updatePositionPrice(tokenMint, currentPrice) {
    try {
      const position = this.positions.get(tokenMint);
      if (!position || position.status !== 'open') return null;

      position.currentPrice = currentPrice;
      position.currentValue = position.amount * currentPrice;
      position.pnl = position.currentValue - position.entryValue;
      position.pnlPercentage = ((currentPrice - position.entryPrice) / position.entryPrice) * 100;

      return position;

    } catch (error) {
      console.error('Erreur mise à jour position:', error);
      return null;
    }
  }

  checkExitConditions(tokenMint, currentPrice) {
    try {
      const position = this.positions.get(tokenMint);
      if (!position || position.status !== 'open') return null;

      const pnlPercentage = position.pnlPercentage;

      // Take profit rapide: +20%
      if (pnlPercentage >= config.takeProfitPercentage) {
        return {
          shouldExit: true,
          reason: 'take_profit',
          message: `🎯 Take profit: +${pnlPercentage.toFixed(2)}%`
        };
      }

      // Stop loss dur: -15%
      if (pnlPercentage <= -config.stopLossPercentage) {
        return {
          shouldExit: true,
          reason: 'stop_loss',
          message: `🛑 Stop loss: ${pnlPercentage.toFixed(2)}%`
        };
      }

      // Timeout après 30 minutes (sécurité)
      const positionAgeMinutes = (Date.now() - position.entryTime) / 60000;
      if (positionAgeMinutes > 30) {
        return {
          shouldExit: true,
          reason: 'timeout',
          message: `⏰ Timeout: ${positionAgeMinutes.toFixed(0)}min`
        };
      }

      return { shouldExit: false };

    } catch (error) {
      console.error('Erreur check exit conditions:', error);
      return null;
    }
  }

  getOpenPositions() {
    return Array.from(this.positions.values()).filter(p => p.status === 'open');
  }

  getClosedPositions() {
    return Array.from(this.positions.values()).filter(p => p.status === 'closed');
  }

  getDailyStats() {
    this.resetDailyIfNeeded();
    
    const openPositions = this.getOpenPositions();
    const totalValue = openPositions.reduce((sum, p) => sum + p.currentValue, 0);
    const unrealizedPnL = openPositions.reduce((sum, p) => sum + p.pnl, 0);

    return {
      dailyTrades: this.dailyTrades,
      dailyPnL: this.dailyPnL,
      openPositions: openPositions.length,
      totalValue,
      unrealizedPnL,
      maxDailyTrades: this.maxDailyTrades
    };
  }

  resetDailyIfNeeded() {
    const today = new Date().toDateString();
    if (today !== this.lastResetDate) {
      console.log('🔄 Reset quotidien des statistiques');
      this.dailyTrades = 0;
      this.dailyPnL = 0;
      this.lastResetDate = today;
    }
  }

  printSummary() {
    const stats = this.getDailyStats();
    const openPositions = this.getOpenPositions();

    console.log('\n📊 RÉSUMÉ MICRO-SNIPER:');
    console.log(`   💰 Trades aujourd'hui: ${stats.dailyTrades}/${stats.maxDailyTrades}`);
    console.log(`   📈 PnL quotidien: $${stats.dailyPnL.toFixed(4)}`);
    console.log(`   📂 Positions ouvertes: ${stats.openPositions}`);
    console.log(`   💵 Valeur totale: $${stats.totalValue.toFixed(4)}`);
    console.log(`   📊 PnL non réalisé: $${stats.unrealizedPnL.toFixed(4)}`);

    if (openPositions.length > 0) {
      console.log('\n📋 POSITIONS OUVERTES:');
      openPositions.forEach(pos => {
        console.log(`   ${pos.tokenMint.slice(0, 8)}...: ${pos.pnlPercentage.toFixed(2)}% ($${pos.pnl.toFixed(4)})`);
      });
    }
    console.log('');
  }
}

module.exports = PositionManager;
