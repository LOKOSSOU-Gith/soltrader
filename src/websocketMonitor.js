const { Connection, PublicKey, Keypair } = require('@solana/web3.js');
const config = require('./config');

class WebSocketMonitor {
  constructor(connection, wallet) {
    this.connection = connection;
    this.wallet = wallet;
    this.isMonitoring = false;
    this.subscriptions = new Map();
    
    // Program IDs importants pour memecoins
    this.RAYDIUM_PROGRAM_ID = new PublicKey('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8');
    this.PUMP_FUN_PROGRAM_ID = new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P');
    this.JUPITER_PROGRAM_ID = new PublicKey('JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4');
    
    // Wallets à surveiller (backup)
    this.targetWallets = config.targetWallets.map(w => new PublicKey(w));
  }

  async initialize() {
    try {
      console.log('🔌 WebSocket Monitor initialisé');
      console.log('🎯 Program IDs surveillés:');
      console.log(`   🌊 Raydium: ${this.RAYDIUM_PROGRAM_ID.toBase58()}`);
      console.log(`   🚀 Pump.fun: ${this.PUMP_FUN_PROGRAM_ID.toBase58()}`);
      console.log(`   🪐 Jupiter: ${this.JUPITER_PROGRAM_ID.toBase58()}`);
      console.log(`   👥 Wallets: ${this.targetWallets.length} surveillés`);
    } catch (error) {
      console.error('❌ Erreur initialisation WebSocket:', error.message);
      throw error;
    }
  }

  async startMonitoring(onTokenDetected) {
    if (this.isMonitoring) {
      console.log('⚠️ WebSocket monitoring déjà en cours');
      return;
    }

    this.isMonitoring = true;
    console.log('🚀 Démarrage du monitoring WebSocket temps réel...');
    console.log('⚡ Vitesse: ~100ms (temps réel)');

    // 1. Surveiller les transactions Raydium (swaps)
    await this.monitorRaydiumSwaps(onTokenDetected);
    
    // 2. Surveiller les transactions Pump.fun (créations de tokens)
    await this.monitorPumpFunTokens(onTokenDetected);
    
    // 3. Surveiller les transactions Jupiter (swaps)
    await this.monitorJupiterSwaps(onTokenDetected);
    
    // 4. Surveiller les wallets cibles (backup)
    await this.monitorTargetWallets(onTokenDetected);

    console.log('✅ Toutes les subscriptions WebSocket actives');
  }

  async monitorRaydiumSwaps(onTokenDetected) {
    try {
      console.log('🌊 Surveillance des swaps Raydium...');
      
      const subscriptionId = this.connection.onLogs(
        this.RAYDIUM_PROGRAM_ID,
        (logs, ctx) => {
          this.handleRaydiumTransaction(logs, ctx, onTokenDetected);
        },
        'confirmed'
      );

      this.subscriptions.set('raydium', subscriptionId);
      console.log('✅ Subscription Raydium active');

    } catch (error) {
      console.error('❌ Erreur surveillance Raydium:', error.message);
    }
  }

  async monitorPumpFunTokens(onTokenDetected) {
    try {
      console.log('🚀 Surveillance des tokens Pump.fun...');
      
      const subscriptionId = this.connection.onLogs(
        this.PUMP_FUN_PROGRAM_ID,
        (logs, ctx) => {
          this.handlePumpFunTransaction(logs, ctx, onTokenDetected);
        },
        'confirmed'
      );

      this.subscriptions.set('pumpfun', subscriptionId);
      console.log('✅ Subscription Pump.fun active');

    } catch (error) {
      console.error('❌ Erreur surveillance Pump.fun:', error.message);
    }
  }

  async monitorJupiterSwaps(onTokenDetected) {
    try {
      console.log('🪐 Surveillance des swaps Jupiter...');
      
      const subscriptionId = this.connection.onLogs(
        this.JUPITER_PROGRAM_ID,
        (logs, ctx) => {
          this.handleJupiterTransaction(logs, ctx, onTokenDetected);
        },
        'confirmed'
      );

      this.subscriptions.set('jupiter', subscriptionId);
      console.log('✅ Subscription Jupiter active');

    } catch (error) {
      console.error('❌ Erreur surveillance Jupiter:', error.message);
    }
  }

  async monitorTargetWallets(onTokenDetected) {
    try {
      console.log('👥 Surveillance des wallets cibles...');
      
      this.targetWallets.forEach((wallet, index) => {
        const subscriptionId = this.connection.onLogs(
          wallet,
          (logs, ctx) => {
            this.handleWalletTransaction(logs, ctx, wallet, onTokenDetected);
          },
          'confirmed'
        );

        this.subscriptions.set(`wallet_${index}`, subscriptionId);
        console.log(`✅ Wallet ${wallet.toBase58().slice(0, 8)}... surveillé`);
      });

    } catch (error) {
      console.error('❌ Erreur surveillance wallets:', error.message);
    }
  }

  handleRaydiumTransaction(logs, ctx, onTokenDetected) {
    try {
      if (!logs || !logs.signature) return;

      console.log(`🌊 Swap Raydium détecté: ${logs.signature.slice(0, 8)}...`);
      
      // Analyser les logs pour extraire les informations de swap
      const swapInfo = this.extractSwapInfo(logs, 'raydium');
      
      if (swapInfo && swapInfo.tokenMint) {
        onTokenDetected({
          type: 'raydium_swap',
          tokenMint: swapInfo.tokenMint,
          amount: swapInfo.amount,
          signature: logs.signature,
          slot: ctx.slot,
          blockTime: Date.now(),
          source: 'Raydium AMM',
          price: swapInfo.price,
          volume: swapInfo.volume
        });
      }

    } catch (error) {
      console.error('❌ Erreur traitement transaction Raydium:', error.message);
    }
  }

  handlePumpFunTransaction(logs, ctx, onTokenDetected) {
    try {
      if (!logs || !logs.signature) return;

      console.log(`🚀 Transaction Pump.fun détectée: ${logs.signature.slice(0, 8)}...`);
      
      // Analyser les logs pour détecter les créations de tokens
      const tokenInfo = this.extractTokenCreationInfo(logs);
      
      if (tokenInfo && tokenInfo.tokenMint) {
        onTokenDetected({
          type: 'pumpfun_creation',
          tokenMint: tokenInfo.tokenMint,
          amount: tokenInfo.initialSupply,
          signature: logs.signature,
          slot: ctx.slot,
          blockTime: Date.now(),
          source: 'Pump.fun',
          creator: tokenInfo.creator,
          liquidity: tokenInfo.liquidity
        });
      }

    } catch (error) {
      console.error('❌ Erreur traitement transaction Pump.fun:', error.message);
    }
  }

  handleJupiterTransaction(logs, ctx, onTokenDetected) {
    try {
      if (!logs || !logs.signature) return;

      console.log(`🪐 Swap Jupiter détecté: ${logs.signature.slice(0, 8)}...`);
      
      // Analyser les logs pour extraire les informations de swap
      const swapInfo = this.extractSwapInfo(logs, 'jupiter');
      
      if (swapInfo && swapInfo.tokenMint) {
        onTokenDetected({
          type: 'jupiter_swap',
          tokenMint: swapInfo.tokenMint,
          amount: swapInfo.amount,
          signature: logs.signature,
          slot: ctx.slot,
          blockTime: Date.now(),
          source: 'Jupiter Aggregator',
          price: swapInfo.price,
          volume: swapInfo.volume
        });
      }

    } catch (error) {
      console.error('❌ Erreur traitement transaction Jupiter:', error.message);
    }
  }

  handleWalletTransaction(logs, ctx, wallet, onTokenDetected) {
    try {
      if (!logs || !logs.signature) return;

      console.log(`👥 Transaction wallet ${wallet.toBase58().slice(0, 8)}...: ${logs.signature.slice(0, 8)}...`);
      
      // Analyser les logs pour détecter les achats de tokens
      const transferInfo = this.extractTokenTransfer(logs);
      
      if (transferInfo && transferInfo.tokenMint) {
        onTokenDetected({
          type: 'wallet_transfer',
          tokenMint: transferInfo.tokenMint,
          amount: transferInfo.amount,
          signature: logs.signature,
          slot: ctx.slot,
          blockTime: Date.now(),
          source: wallet.toBase58(),
          from: transferInfo.from,
          to: transferInfo.to
        });
      }

    } catch (error) {
      console.error('❌ Erreur traitement transaction wallet:', error.message);
    }
  }

  extractSwapInfo(logs, source) {
    try {
      // Parser les logs pour extraire les informations de swap
      // C'est une version simplifiée - en production il faudrait parser les instructions réelles
      
      if (!logs.logMessages || logs.logMessages.length === 0) {
        return null;
      }

      // Chercher des patterns dans les logs
      const logMessages = logs.logMessages.join(' ');
      
      // Pattern pour détecter les token mints dans les logs
      const tokenMintPattern = /([1-9A-HJ-NP-Za-km-z]{32,})/g;
      const matches = logMessages.match(tokenMintPattern);
      
      if (matches && matches.length > 0) {
        // Prendre le premier match qui ressemble à un token mint
        const tokenMint = matches.find(match => 
          match.length >= 32 && 
          match !== this.RAYDIUM_PROGRAM_ID.toBase58() &&
          match !== this.JUPITER_PROGRAM_ID.toBase58() &&
          match !== this.PUMP_FUN_PROGRAM_ID.toBase58()
        );

        if (tokenMint) {
          return {
            tokenMint: tokenMint,
            amount: this.extractAmountFromLogs(logMessages),
            price: this.extractPriceFromLogs(logMessages),
            volume: this.extractVolumeFromLogs(logMessages)
          };
        }
      }

      return null;
    } catch (error) {
      console.error('❌ Erreur extraction swap info:', error.message);
      return null;
    }
  }

  extractTokenCreationInfo(logs) {
    try {
      if (!logs.logMessages || logs.logMessages.length === 0) {
        return null;
      }

      const logMessages = logs.logMessages.join(' ');
      
      // Pattern pour détecter la création de token
      if (logMessages.includes('Initialize') || logMessages.includes('Create')) {
        const tokenMintPattern = /([1-9A-HJ-NP-Za-km-z]{32,})/g;
        const matches = logMessages.match(tokenMintPattern);
        
        if (matches && matches.length > 0) {
          const tokenMint = matches.find(match => 
            match.length >= 32 && 
            match !== this.PUMP_FUN_PROGRAM_ID.toBase58()
          );

          if (tokenMint) {
            return {
              tokenMint: tokenMint,
              initialSupply: this.extractAmountFromLogs(logMessages),
              creator: this.extractCreatorFromLogs(logMessages),
              liquidity: this.extractLiquidityFromLogs(logMessages)
            };
          }
        }
      }

      return null;
    } catch (error) {
      console.error('❌ Erreur extraction token creation:', error.message);
      return null;
    }
  }

  extractTokenTransfer(logs) {
    try {
      if (!logs.logMessages || logs.logMessages.length === 0) {
        return null;
      }

      const logMessages = logs.logMessages.join(' ');
      
      // Pattern pour détecter les transferts de tokens
      if (logMessages.includes('Transfer') || logMessages.includes('transfer')) {
        const tokenMintPattern = /([1-9A-HJ-NP-Za-km-z]{32,})/g;
        const matches = logMessages.match(tokenMintPattern);
        
        if (matches && matches.length > 0) {
          const tokenMint = matches.find(match => match.length >= 32);

          if (tokenMint) {
            return {
              tokenMint: tokenMint,
              amount: this.extractAmountFromLogs(logMessages),
              from: this.extractFromAddress(logMessages),
              to: this.extractToAddress(logMessages)
            };
          }
        }
      }

      return null;
    } catch (error) {
      console.error('❌ Erreur extraction token transfer:', error.message);
      return null;
    }
  }

  // Méthodes utilitaires pour extraire des informations des logs
  extractAmountFromLogs(logMessages) {
    const amountPattern = /(\d+\.?\d*)/g;
    const matches = logMessages.match(amountPattern);
    return matches && matches.length > 0 ? parseFloat(matches[0]) : 0;
  }

  extractPriceFromLogs(logMessages) {
    const pricePattern = /price[:\s]*(\d+\.?\d*)/i;
    const match = logMessages.match(pricePattern);
    return match && match[1] ? parseFloat(match[1]) : 0;
  }

  extractVolumeFromLogs(logMessages) {
    const volumePattern = /volume[:\s]*(\d+\.?\d*)/i;
    const match = logMessages.match(volumePattern);
    return match && match[1] ? parseFloat(match[1]) : 0;
  }

  extractCreatorFromLogs(logMessages) {
    const creatorPattern = /creator[:\s]*([1-9A-HJ-NP-Za-km-z]{32,})/i;
    const match = logMessages.match(creatorPattern);
    return match && match[1] ? match[1] : null;
  }

  extractLiquidityFromLogs(logMessages) {
    const liquidityPattern = /liquidity[:\s]*(\d+\.?\d*)/i;
    const match = logMessages.match(liquidityPattern);
    return match && match[1] ? parseFloat(match[1]) : 0;
  }

  extractFromAddress(logMessages) {
    const fromPattern = /from[:\s]*([1-9A-HJ-NP-Za-km-z]{32,})/i;
    const match = logMessages.match(fromPattern);
    return match && match[1] ? match[1] : null;
  }

  extractToAddress(logMessages) {
    const toPattern = /to[:\s]*([1-9A-HJ-NP-Za-km-z]{32,})/i;
    const match = logMessages.match(toPattern);
    return match && match[1] ? match[1] : null;
  }

  stopMonitoring() {
    console.log('🛑 Arrêt du monitoring WebSocket...');
    
    this.subscriptions.forEach((subscriptionId, key) => {
      try {
        this.connection.removeOnLogsListener(subscriptionId);
        console.log(`✅ Subscription ${key} arrêtée`);
      } catch (error) {
        console.error(`❌ Erreur arrêt subscription ${key}:`, error.message);
      }
    });

    this.subscriptions.clear();
    this.isMonitoring = false;
    console.log('✅ WebSocket monitoring arrêté');
  }

  getStatus() {
    return {
      isMonitoring: this.isMonitoring,
      activeSubscriptions: this.subscriptions.size,
      subscriptions: Array.from(this.subscriptions.keys())
    };
  }
}

module.exports = WebSocketMonitor;
