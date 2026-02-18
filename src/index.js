const WalletManager = require('./wallet');
const WebSocketMonitor = require('./websocketMonitor');
const Trader = require('./trader');
const StopLossManager = require('./stopLossManager');
const TokenValidator = require('./tokenValidator');
const PositionManager = require('./positionManager');
const config = require('./config');

class MemecoinBot {
  constructor() {
    try {
      config.validate();
      
      this.wallet = new WalletManager();
      this.websocketMonitor = new WebSocketMonitor(this.wallet.connection, this.wallet.getKeypair());
      this.trader = new Trader(this.wallet);
      this.stopLossManager = new StopLossManager(this.wallet);
      this.tokenValidator = new TokenValidator();
      this.positionManager = new PositionManager();
      
      // Connecter les composants
      this.trader.setStopLossManager(this.stopLossManager);
      this.stopLossManager.setTrader(this.trader);
      
      this.purchasedTokens = new Set(); // Éviter les achats en double
      this.isRunning = false;
      
      console.log('🤖 Bot Solana Micro-Sniper 0.0015 SOL initialisé');
      console.log(`📍 Wallet public: ${this.wallet.getPublicKey()}`);
      console.log(`🎯 Wallets cibles (${config.targetWallets.length}):`);
      config.targetWallets.forEach((wallet, index) => {
        console.log(`   ${index + 1}. ${wallet}`);
      });
      console.log(`💰 Position size: ${config.minBuyAmountSol}-${config.maxBuyAmountSol} SOL`);
      console.log(`📊 Stratégie: Micro-Sniper adapté 0.0015 SOL`);
      console.log(`🎯 TP/SL: +${config.takeProfitPercentage}% / -${config.stopLossPercentage}%`);
      console.log(`⚡ Monitoring: WebSocket temps réel (~200ms)`);
      console.log(`🔍 Filtres: MC<${config.maxMarketCap}$, ${config.minHolders}-${config.maxHolders} holders, Vol5m>${config.minVolume5min}$`);
      
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation du bot:', error.message);
      process.exit(1);
    }
  }

  async start() {
    if (this.isRunning) {
      console.log('⚠️ Le bot est déjà en cours d\'exécution');
      return;
    }

    // Initialiser le WebSocket monitor
    await this.websocketMonitor.initialize();

    this.isRunning = true;
    console.log('🚀 Démarrage du bot Micro-Sniper 0.0015 SOL...');

    // Afficher le solde actuel
    const balance = await this.wallet.getBalance();
    console.log(`� Position size: ${config.minBuyAmountSol}-${config.maxBuyAmountSol} SOL`);
    console.log(`⚡ Délai de détection: ${config.delayMs}ms`);
    console.log(`⚡ Vitesse de monitoring: WebSocket temps réel`);
    console.log(`⚡ Priorité transaction: ${config.transactionPriorityMicrolamports} micro-lamports`);
    console.log(`🎯 Objectifs: 0.005 → 0.02 → 0.1 SOL`);

    // Démarrer le monitoring du stop loss (en backup)
    this.stopLossManager.startMonitoring();

    // Démarrer le monitoring des positions Micro-Sniper
    this.startPositionMonitoring();

    // Démarrer le monitoring WebSocket avec stratégie Micro-Sniper
    this.websocketMonitor.startMonitoring(async (tokenDetected) => {
      await this.handleTokenDetectionMicroSniper(tokenDetected);
    });

    // Gérer l'arrêt propre
    process.on('SIGINT', () => this.stop());
    process.on('SIGTERM', () => this.stop());
  }

  startPositionMonitoring() {
    const monitor = async () => {
      if (!this.isRunning) return;

      try {
        const openPositions = this.positionManager.getOpenPositions();
        
        for (const position of openPositions) {
          try {
            // Récupérer le prix actuel via le validator
            const validation = await this.tokenValidator.validateToken(position.tokenMint);
            
            if (validation.marketData?.price) {
              // Mettre à jour le prix de la position
              this.positionManager.updatePositionPrice(position.tokenMint, validation.marketData.price);
              
              // Vérifier les conditions de sortie
              const exitCheck = this.positionManager.checkExitConditions(position.tokenMint, validation.marketData.price);
              
              if (exitCheck.shouldExit) {
                console.log(exitCheck.message);
                
                // Exécuter la vente
                const sellResult = await this.trader.sellToken(position.tokenMint, position.amount);
                
                if (sellResult && sellResult.signature) {
                  this.positionManager.closePosition(position.tokenMint, validation.marketData.price, exitCheck.reason);
                  console.log(`📉 Vente exécutée: ${sellResult.signature}`);
                }
              }
            }
          } catch (error) {
            console.error(`Erreur monitoring position ${position.tokenMint.slice(0, 8)}...:`, error.message);
          }
        }
        
        // Afficher le résumé toutes les 5 minutes
        if (Date.now() % 300000 < 1000) { // Approximatif
          this.positionManager.printSummary();
        }
        
      } catch (error) {
        console.error('Erreur monitoring positions:', error);
      }

      setTimeout(monitor, config.positionCheckIntervalMs);
    };

    monitor();
  }

  async executeMicroSniperTrade(tokenMint, positionSize, validation) {
    try {
      console.log(`🎯 Exécution trade Micro-Sniper: ${positionSize} SOL sur ${tokenMint.slice(0, 8)}...`);
      
      // Utiliser le trader existant avec le montant calculé
      const result = await this.trader.buyToken(tokenMint, positionSize);
      
      if (result && result.signature) {
        console.log(`✅ Trade exécuté: ${result.signature}`);
        return {
          signature: result.signature,
          price: validation.marketData?.price || 0,
          amount: positionSize,
          tokenMint
        };
      }
      
      return null;
      
    } catch (error) {
      console.error(`❌ Erreur execution trade Micro-Sniper:`, error.message);
      return null;
    }
  }

  async handleTokenDetectionMicroSniper(tokenDetected) {
    try {
      const { type, tokenMint, amount, signature, source, blockTime } = tokenDetected;

      // Éviter les analyses en double
      if (this.purchasedTokens.has(tokenMint)) {
        console.log(`⚠️ Token ${tokenMint.slice(0, 8)}... déjà analysé récemment`);
        return;
      }

      this.purchasedTokens.add(tokenMint);
      
      console.log(`🟢 ${type.toUpperCase()} détecté sur ${source}:`);
      console.log(`   🪙 Token: ${tokenMint.slice(0, 8)}...`);
      console.log(`   💰 Amount: ${amount}`);
      console.log(`   📝 Transaction: ${signature}`);
      console.log(`   ⏰ Temps: ${new Date().toLocaleTimeString()}`);

      // Calculer l'âge du token
      const tokenAge = blockTime ? Math.floor((Date.now() / 1000) - blockTime) : 0;
      
      // Valider le token avec les filtres Micro-Sniper
      const validation = await this.tokenValidator.validateToken(tokenMint, tokenAge);
      
      if (!validation.isValid) {
        console.log(`❌ Token rejeté: ${tokenMint.slice(0, 8)}...`);
        validation.reasons.forEach(reason => console.log(`   - ${reason}`));
        return;
      }

      // Calculer la taille de position
      const positionSize = this.positionManager.calculatePositionSize(tokenMint, validation.marketData);
      
      if (!positionSize) {
        console.log(`❌ Impossible de calculer la position pour ${tokenMint.slice(0, 8)}...`);
        return;
      }

      // Exécuter le trade
      const tradeResult = await this.executeMicroSniperTrade(tokenMint, positionSize, validation);
      
      if (tradeResult) {
        console.log(`✅ TRADE MICRO-SNIPER EXÉCUTÉ: ${tradeResult.signature}`);
        
        // Ajouter au position manager
        this.positionManager.openPosition(
          tokenMint,
          positionSize,
          tradeResult.price || 0,
          validation.tokenInfo
        );
      } else {
        console.log(`❌ Trade non exécuté - erreur lors de l'exécution`);
      }
      
      // Nettoyer le cache après 30 secondes pour éviter les analyses répétées
      setTimeout(() => {
        this.purchasedTokens.delete(tokenMint);
      }, 30000);

    } catch (error) {
      console.error('❌ Erreur lors du traitement Micro-Sniper:', error.message);
    }
  }

  async stop() {
    if (!this.isRunning) {
      return;
    }

    console.log('\n🛑 Arrêt du bot Micro-Sniper...');
    this.isRunning = false;
    
    // Fermer toutes les positions ouvertes
    const openPositions = this.positionManager.getOpenPositions();
    for (const position of openPositions) {
      console.log(`📉 Fermeture position: ${position.tokenMint.slice(0, 8)}...`);
      await this.trader.sellToken(position.tokenMint, position.amount);
      this.positionManager.closePosition(position.tokenMint, position.currentPrice, 'Arrêt du bot');
    }
    
    this.websocketMonitor.stopMonitoring();
    this.stopLossManager.stopMonitoring();
    
    // Afficher le solde final
    const balance = await this.wallet.getBalance();
    console.log(`💳 Solde final: ${balance} SOL`);
    
    // Afficher les statistiques Micro-Sniper
    this.positionManager.printSummary();
    
    // Afficher les positions restantes du stop loss
    this.stopLossManager.printStatus();
    
    // Afficher le statut final
    const wsStatus = this.websocketMonitor.getStatus();
    console.log(`📊 Statut WebSocket: ${wsStatus.activeSubscriptions} subscriptions actives`);
    
    console.log('✅ Bot Micro-Sniper arrêté avec succès');
    process.exit(0);
  }

  async getStatus() {
    const balance = await this.wallet.getBalance();
    const wsStatus = this.websocketMonitor.getStatus();
    const microSniperStats = this.positionManager.getDailyStats();
    return {
      isRunning: this.isRunning,
      publicKey: this.wallet.getPublicKey(),
      targetWallets: config.targetWallets,
      balance: balance,
      purchasedTokensCount: this.purchasedTokens.size,
      stopLossPositions: this.stopLossManager.getPositions().length,
      microSniperPositions: microSniperStats.openPositions,
      strategy: 'Micro-Sniper 0.0015 SOL',
      monitoring: 'WebSocket temps réel',
      activeSubscriptions: wsStatus.activeSubscriptions,
      subscriptions: wsStatus.subscriptions,
      dailyStats: microSniperStats
    };
  }
}

// Démarrer le bot
if (require.main === module) {
  const bot = new MemecoinBot();
  bot.start().catch(error => {
    console.error('Erreur fatale:', error);
    process.exit(1);
  });
}

module.exports = MemecoinBot;
