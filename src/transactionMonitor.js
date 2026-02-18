const { Connection, PublicKey } = require('@solana/web3.js');
const { TOKEN_PROGRAM_ID } = require('@solana/spl-token');
const config = require('./config');
const RPCManager = require('./rpcManager');

class TransactionMonitor {
  constructor(rpcUrl = null, targetWallet = null) {
    this.rpcManager = new RPCManager();
    this.targetWallet = new PublicKey(targetWallet || config.targetWallet);
    this.isMonitoring = false;
    this.lastSignature = null;
  }

  async getLatestTransactions(limit = 10) {
    try {
      const signatures = await this.rpcManager.executeWithRetry(async (connection) => {
        return await connection.getSignaturesForAddress(
          this.targetWallet,
          { limit, before: this.lastSignature }
        );
      });

      if (signatures.length === 0) {
        return [];
      }

      this.lastSignature = signatures[signatures.length - 1].signature;
      
      const transactions = await Promise.all(
        signatures.map(async (sig) => {
          try {
            return await this.rpcManager.executeWithRetry(async (connection) => {
              return await connection.getTransaction(sig.signature, { maxSupportedTransactionVersion: 0 });
            });
          } catch (error) {
            console.error(`Erreur récupération transaction ${sig.signature}:`, error);
            return null;
          }
        })
      );

      return transactions.filter(tx => tx !== null);
    } catch (error) {
      console.error('Erreur lors de la récupération des transactions:', error);
      return [];
    }
  }

  extractTokenTransfers(transaction) {
    if (!transaction || !transaction.meta || !transaction.transaction) {
      return [];
    }

    const transfers = [];
    const postTokenBalances = transaction.meta.postTokenBalances || [];
    const preTokenBalances = transaction.meta.preTokenBalances || [];

    // Analyser les changements de solde de tokens
    for (let i = 0; i < postTokenBalances.length; i++) {
      const postBalance = postTokenBalances[i];
      const preBalance = preTokenBalances.find(b => b.accountIndex === postBalance.accountIndex);

      if (postBalance && preBalance) {
        const postAmount = parseFloat(postBalance.uiTokenAmount.amount) || 0;
        const preAmount = parseFloat(preBalance.uiTokenAmount.amount) || 0;
        const diff = postAmount - preAmount;

        // Si le wallet cible a acheté des tokens (solde positif)
        if (diff > 0 && postBalance.owner === config.targetWallet) {
          transfers.push({
            tokenMint: postBalance.mint,
            amount: diff,
            decimals: postBalance.uiTokenAmount.decimals,
            signature: transaction.signature,
            timestamp: transaction.blockTime * 1000
          });
        }
      }
    }

    return transfers;
  }

  async startMonitoring(onTokenPurchase) {
    if (this.isMonitoring) {
      console.log('Le monitoring est déjà en cours...');
      return;
    }

    this.isMonitoring = true;
    console.log(`🚀 Démarrage du monitoring ULTRA RAPIDE du wallet: ${this.targetWallet.toBase58()}`);
    console.log(`⚡ Vitesse de monitoring: ${config.monitorIntervalMs}ms`);
    console.log(`🔄 RPC endpoints: ${this.rpcManager.rpcUrls.length} disponibles`);

    const monitor = async () => {
      if (!this.isMonitoring) return;

      try {
        const [transactions] = await Promise.all([
          this.getLatestTransactions(5)
        ]);

        for (const transaction of transactions) {
          const transfers = this.extractTokenTransfers(transaction);

          for (const transfer of transfers) {
            console.log(`⚡ Achat détecté RAPIDE: ${transfer.amount} tokens (${transfer.tokenMint})`);

            setTimeout(() => {
              onTokenPurchase(transfer);
            }, config.delayMs);
          }
        }
      } catch (error) {
        console.error('Erreur lors du monitoring:', error);
        this.rpcManager.rotateConnection();
      }

      setTimeout(monitor, config.monitorIntervalMs);
    };

    monitor();
  }

  stopMonitoring() {
    this.isMonitoring = false;
    console.log('Monitoring arrêté');
  }

  getTargetWallet() {
    return this.targetWallet.toBase58();
  }

  getRPCManager() {
    return this.rpcManager;
  }
}

module.exports = TransactionMonitor;
