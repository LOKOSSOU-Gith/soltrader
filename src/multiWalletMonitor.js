const { PublicKey } = require('@solana/web3.js');
const TransactionMonitor = require('./transactionMonitor');
const SolscanAPI = require('./solscanAPI');
const config = require('./config');

class MultiWalletMonitor {
  constructor() {
    this.monitors = [];
    this.solscanAPI = new SolscanAPI();
    this.isMonitoring = false;
    this.purchasedTokens = new Set(); // Éviter les achats en double
    
    // Configurer la clé API Solscan si disponible
    if (config.solscanApiKey && config.solscanApiKey !== 'votre_cle_api_solscan_ici') {
      this.solscanAPI.setAPIKey(config.solscanApiKey);
    }
  }

  async initialize() {
    // Créer un monitor pour chaque wallet cible
    for (const walletAddress of config.targetWallets) {
      try {
        const monitor = new TransactionMonitor(null, walletAddress);
        this.monitors.push({
          address: walletAddress,
          monitor: monitor,
          lastCheck: Date.now()
        });
        console.log(`✅ Monitor initialisé pour: ${walletAddress}`);
      } catch (error) {
        console.error(`❌ Erreur initialisation monitor pour ${walletAddress}:`, error.message);
      }
    }
  }

  async startMonitoring(onTokenPurchase) {
    if (this.isMonitoring) {
      console.log('⚠️ Le monitoring multi-wallets est déjà en cours...');
      return;
    }

    this.isMonitoring = true;
    console.log(`🚀 Démarrage du monitoring MULTI-WALLETS (${this.monitors.length} wallets)`);
    console.log(`⚡ Vitesse de monitoring: ${config.monitorIntervalMs}ms`);
    console.log(`🔍 Utilisation: Solscan API + RPC backup`);
    
    // Afficher tous les wallets surveillés
    config.targetWallets.forEach((wallet, index) => {
      console.log(`🎯 Wallet ${index + 1}: ${wallet}`);
    });

    // Afficher le statut de l'API Solscan
    if (config.solscanApiKey && config.solscanApiKey !== 'votre_cle_api_solscan_ici') {
      console.log(`🔑 Clé API Solscan configurée`);
      const rateLimit = this.solscanAPI.getRateLimitStatus();
      console.log(`📊 Limites: ${rateLimit.remaining}/${rateLimit.maxRequests} requêtes restantes`);
    } else {
      console.log(`⚠️ Clé API Solscan non configurée - utilisation des limites gratuites`);
    }

    const monitor = async () => {
      if (!this.isMonitoring) return;

      try {
        // Monitor chaque wallet en parallèle avec Solscan API (maintenant disponible)
        const promises = this.monitors.map(async ({ address, monitor }) => {
          try {
            // Utiliser Solscan API pour les transactions récentes (avec clé API configurée)
            const purchases = await this.solscanAPI.getLatestTokenPurchases(address, 3);
            
            for (const purchase of purchases) {
              const tokenKey = `${purchase.tokenMint}-${purchase.amount}`;
              
              // Éviter les achats en double
              if (!this.purchasedTokens.has(tokenKey)) {
                this.purchasedTokens.add(tokenKey);
                
                console.log(`⚡ Achat détecté via Solscan sur ${address.slice(0, 8)}...: ${purchase.amount} ${purchase.symbol || 'tokens'} (${purchase.tokenMint.slice(0, 8)}...)`);
                
                setTimeout(() => {
                  onTokenPurchase(purchase, address);
                }, config.delayMs);
                
                // Nettoyer le cache après 30 secondes
                setTimeout(() => {
                  this.purchasedTokens.delete(tokenKey);
                }, 30000);
              }
            }

            // En backup, utiliser le monitor RPC traditionnel
            const transactions = await monitor.getLatestTransactions(2);
            
            for (const transaction of transactions) {
              const transfers = monitor.extractTokenTransfers(transaction);

              for (const transfer of transfers) {
                const tokenKey = `${transfer.tokenMint}-${transfer.amount}`;
                
                if (!this.purchasedTokens.has(tokenKey)) {
                  this.purchasedTokens.add(tokenKey);
                  
                  console.log(`⚡ Achat détecté via RPC sur ${address.slice(0, 8)}...: ${transfer.amount} tokens (${transfer.tokenMint.slice(0, 8)}...)`);
                  
                  setTimeout(() => {
                    onTokenPurchase(transfer, address);
                  }, config.delayMs);
                  
                  setTimeout(() => {
                    this.purchasedTokens.delete(tokenKey);
                  }, 30000);
                }
              }
            }
            
          } catch (error) {
            console.error(`Erreur monitoring wallet ${address.slice(0, 8)}...:`, error.message);
          }
        });

        await Promise.all(promises);

      } catch (error) {
        console.error('Erreur lors du monitoring multi-wallets:', error);
      }

      setTimeout(monitor, config.monitorIntervalMs);
    };

    monitor();
  }

  stopMonitoring() {
    this.isMonitoring = false;
    this.monitors.forEach(({ monitor }) => {
      monitor.stopMonitoring();
    });
    console.log('🛑 Monitoring multi-wallets arrêté');
  }

  getTargetWallets() {
    return config.targetWallets;
  }

  getMonitorCount() {
    return this.monitors.length;
  }

  getStatus() {
    return {
      isMonitoring: this.isMonitoring,
      walletCount: this.monitors.length,
      wallets: config.targetWallets,
      purchasedTokensCount: this.purchasedTokens.size
    };
  }
}

module.exports = MultiWalletMonitor;
