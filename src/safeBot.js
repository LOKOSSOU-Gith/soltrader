const WalletManager = require('./wallet');
const WebSocketMonitor = require('./websocketMonitor');
const SafeTrader = require('./safeTrader');
const TokenValidator = require('./tokenValidator');
const PositionManager = require('./positionManager');
const config = require('./config');

class SafeMemecoinBot {
  constructor() {
    try {
      config.validate();
      
      this.wallet = new WalletManager();
      this.websocketMonitor = new WebSocketMonitor(this.wallet.connection, this.wallet.getKeypair());
      this.trader = new SafeTrader(this.wallet);
      this.tokenValidator = new TokenValidator();
      this.positionManager = new PositionManager();
      
      this.isRunning = false;
      
      console.log('🛡️  Bot Solana Micro-Sniper SÉCURISÉ initialisé');
      console.log(`📍 Wallet public: ${this.wallet.getPublicKey()}`);
      console.log(`🛡️  MODE SÉCURISÉ: ${process.env.TEST_MODE !== 'false' ? 'ACTIVÉ' : 'DÉSACTIVÉ'}`);
      
    } catch (error) {
      console.error('❌ Erreur initialisation bot sécurisé:', error.message);
      throw error;
    }
  }

  async start() {
    if (this.isRunning) {
      console.log('⚠️  Bot sécurisé déjà en cours d\'exécution');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Démarrage du bot Micro-Sniper SÉCURISÉ...');

    try {
      // Afficher la configuration sécurisée
      console.log(`\n📋 Configuration SÉCURISÉE:`);
      console.log(`💰 Capital total: ${await this.wallet.getBalance()} SOL`);
      console.log(`🎯 Position size: ${config.minBuyAmountSol}-${config.maxBuyAmountSol} SOL`);
      console.log(`📊 TP/SL: +${config.takeProfitPercentage}% / -${config.stopLossPercentage}%`);
      console.log(`🔍 Filtres: MC<${config.maxMarketCap}$, ${config.minHolders}-${config.maxHolders} holders`);
      console.log(`⏰ Token age: <${config.maxTokenAgeSeconds}s`);
      console.log(`🛡️  MODE TEST: ${process.env.TEST_MODE !== 'false' ? 'ACTIVÉ' : 'DÉSACTIVÉ'}`);
      console.log(`⚠️  LIMITE SÉCURITÉ: 0.001 SOL max par transaction`);

      // Démarrer le monitoring WebSocket sécurisé
      this.websocketMonitor.startMonitoring(async (tokenDetected) => {
        await this.handleTokenDetectionSafe(tokenDetected);
      });

      // Gérer l'arrêt propre
      process.on('SIGINT', () => this.stop());
      process.on('SIGTERM', () => this.stop());
      
      console.log('\n✅ Bot Micro-Sniper SÉCURISÉ démarré avec succès!');
      console.log('🛡️  Toutes les transactions sont validées et simulées');
      
    } catch (error) {
      console.error('❌ Erreur démarrage bot sécurisé:', error.message);
      this.isRunning = false;
      throw error;
    }
  }

  async handleTokenDetectionSafe(tokenDetected) {
    if (!this.isRunning) return;

    try {
      console.log(`\n🎯 Token détecté (MODE SÉCURISÉ): ${tokenDetected.tokenMint.slice(0, 8)}...`);
      console.log(`   Source: ${tokenDetected.source}`);
      console.log(`   Timestamp: ${new Date(tokenDetected.blockTime).toLocaleString()}`);

      // VALIDATION SÉCURISÉE
      const validation = await this.tokenValidator.validateToken(tokenDetected.tokenMint);
      
      if (!validation.isValid) {
        console.log(`❌ Token rejeté (sécurité): ${validation.reason}`);
        return;
      }

      console.log(`✅ Token validé (sécurité):`);
      console.log(`   Market Cap: $${validation.marketCap}`);
      console.log(`   Holders: ${validation.holders}`);
      console.log(`   Volume 5m: $${validation.volume5min}`);
      console.log(`   Score: ${validation.score}/100`);

      // VÉRIFICATION DES LIMITES
      const dailyStats = this.positionManager.getDailyStats();
      if (dailyStats.dailyTrades >= 5) { // LIMITE RÉDUITE
        console.log(`⚠️  Limite quotidienne atteinte: ${dailyStats.dailyTrades}/5 trades`);
        return;
      }

      // CALCUL DE POSITION SÉCURISÉ
      const positionSize = Math.min(
        config.maxBuyAmountSol,
        0.001, // LIMITE SÉCURITÉ MAX
        await this.wallet.getBalance() * 0.5 // MAX 50% du solde
      );

      if (positionSize < config.minBuyAmountSol) {
        console.log(`❌ Solde insuffisant pour position sécurisée: ${positionSize} SOL`);
        return;
      }

      // EXÉCUTION SÉCURISÉE
      const tradeResult = await this.executeSafeTrade(tokenDetected.tokenMint, positionSize, validation);
      
      if (tradeResult) {
        console.log(`✅ TRADE SÉCURISÉ EXÉCUTÉ: ${tradeResult.signature}`);
        
        if (!tradeResult.testMode) {
          await this.positionManager.addPosition({
            tokenMint: tokenDetected.tokenMint,
            amount: positionSize,
            entryPrice: validation.price,
            timestamp: Date.now(),
            signature: tradeResult.signature
          });
        }
      }

    } catch (error) {
      console.error('❌ Erreur gestion token sécurisé:', error.message);
    }
  }

  async executeSafeTrade(tokenMint, positionSize, validation) {
    try {
      console.log(`🛡️  Exécution trade SÉCURISÉ: ${positionSize} SOL sur ${tokenMint.slice(0, 8)}...`);
      
      // UTILISER LE TRADER SÉCURISÉ
      const result = await this.trader.buyToken(tokenMint, positionSize);
      
      if (result && result.signature) {
        console.log(`✅ Trade sécurisé exécuté: ${result.signature}`);
        return result;
      }
      
      return null;

    } catch (error) {
      console.error(`❌ Erreur trade sécurisé:`, error.message);
      return null;
    }
  }

  async stop() {
    if (!this.isRunning) return;

    console.log('\n🛑 Arrêt du bot sécurisé...');
    this.isRunning = false;

    // Afficher les statistiques finales
    const stats = this.positionManager.getDailyStats();
    console.log(`\n📊 Statistiques finales:`);
    console.log(`   Trades du jour: ${stats.dailyTrades}`);
    console.log(`   PnL du jour: ${stats.dailyPnL} SOL`);
    console.log(`   Positions ouvertes: ${stats.openPositions}`);

    console.log('✅ Bot sécurisé arrêté');
  }

  async getStatus() {
    try {
      const balance = await this.wallet.getBalance();
      const stats = this.positionManager.getDailyStats();
      
      return {
        isRunning: this.isRunning,
        balance: balance,
        dailyStats: stats,
        safeMode: process.env.TEST_MODE !== 'false',
        maxTradeAmount: Math.min(0.001, balance * 0.5)
      };
    } catch (error) {
      return {
        isRunning: false,
        error: error.message
      };
    }
  }
}

module.exports = SafeMemecoinBot;
