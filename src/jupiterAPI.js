const { Connection, PublicKey, Keypair, Transaction, sendAndConfirmTransaction } = require('@solana/web3.js');
const axios = require('axios');
const config = require('./config');

class JupiterAPI {
  constructor(connection, wallet) {
    this.connection = connection;
    this.wallet = wallet;
    this.jupiterAPI = 'https://quote-api.jup.ag/v6';
  }

  async initialize() {
    try {
      console.log('🪐 Jupiter API initialisée avec succès (mode HTTP)');
    } catch (error) {
      console.error('❌ Erreur initialisation Jupiter:', error.message);
      throw error;
    }
  }

  async getQuote(inputMint, outputMint, inputAmount) {
    try {
      const response = await axios.get(`${this.jupiterAPI}/quote`, {
        params: {
          inputMint: inputMint,
          outputMint: outputMint,
          inputAmount: inputAmount,
          slippage: config.slippagePercentage,
          feeBps: 100, // 0.1% fee
        },
        timeout: 10000
      });

      if (response.data && response.data.data) {
        return response.data.data;
      }
      return null;
    } catch (error) {
      console.error('❌ Erreur récupération quote Jupiter:', error.message);
      return null;
    }
  }

  async getSwapTransaction(quoteResponse) {
    try {
      const response = await axios.post(`${this.jupiterAPI}/swap`, {
        quoteResponse: quoteResponse,
        userPublicKey: this.wallet.publicKey.toBase58(),
        wrapAndUnwrapSol: true,
        useSharedAccounts: true,
        feeAccount: null
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      if (response.data && response.data.swapTransaction) {
        return response.data.swapTransaction;
      }
      return null;
    } catch (error) {
      console.error('❌ Erreur récupération transaction Jupiter:', error.message);
      return null;
    }
  }

  async executeSwap(routeInfo) {
    try {
      if (!routeInfo) {
        throw new Error('Route info invalide');
      }

      // Obtenir la transaction de swap
      const swapTransaction = await this.getSwapTransaction(routeInfo);
      
      if (!swapTransaction) {
        throw new Error('Impossible d\'obtenir la transaction de swap');
      }

      // Décoder et signer la transaction
      const transaction = Transaction.from(Buffer.from(swapTransaction, 'base64'));
      transaction.sign(this.wallet);

      // Envoyer la transaction
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [this.wallet],
        {
          commitment: 'confirmed',
          preflightCommitment: 'confirmed',
          maxRetries: 3,
        }
      );

      console.log(`✅ Swap Jupiter réussi: ${signature}`);
      return signature;

    } catch (error) {
      console.error('❌ Erreur exécution swap Jupiter:', error.message);
      throw error;
    }
  }

  async buyToken(tokenMint, solAmount) {
    try {
      console.log(`🛒 Achat de ${solAmount} SOL du token ${tokenMint.slice(0, 8)}... via Jupiter`);

      // SOL mint address
      const SOL_MINT = 'So11111111111111111111111111111111111111112';
      
      // Convertir SOL en lamports
      const inputAmount = Math.floor(solAmount * 1e9);

      // Obtenir la meilleure route
      const routeInfo = await this.getQuote(SOL_MINT, tokenMint, inputAmount);
      
      if (!routeInfo) {
        throw new Error('Aucune route trouvée pour ce swap');
      }

      console.log(`📊 Route trouvée: ${routeInfo.outAmount} tokens attendus`);
      console.log(`💰 Impact prix: ${routeInfo.priceImpactPct}%`);

      // Exécuter le swap
      const signature = await this.executeSwap(routeInfo);
      
      return {
        signature,
        inputAmount: solAmount,
        outputAmount: routeInfo.outAmount,
        priceImpact: routeInfo.priceImpactPct,
      };

    } catch (error) {
      console.error(`❌ Erreur achat token ${tokenMint}:`, error.message);
      throw error;
    }
  }

  async sellToken(tokenMint, tokenAmount) {
    try {
      console.log(`💰 Vente de ${tokenAmount} tokens ${tokenMint.slice(0, 8)}... via Jupiter`);

      // SOL mint address
      const SOL_MINT = 'So11111111111111111111111111111111111111112';
      
      // Obtenir la meilleure route
      const routeInfo = await this.getQuote(tokenMint, SOL_MINT, tokenAmount);
      
      if (!routeInfo) {
        throw new Error('Aucune route trouvée pour ce swap');
      }

      console.log(`📊 Route trouvée: ${routeInfo.outAmount / 1e9} SOL attendus`);
      console.log(`💰 Impact prix: ${routeInfo.priceImpactPct}%`);

      // Exécuter le swap
      const signature = await this.executeSwap(routeInfo);
      
      return {
        signature,
        inputAmount: tokenAmount,
        outputAmount: routeInfo.outAmount,
        priceImpact: routeInfo.priceImpactPct,
      };

    } catch (error) {
      console.error(`❌ Erreur vente token ${tokenMint}:`, error.message);
      throw error;
    }
  }

  async getTokenPrice(tokenMint) {
    try {
      const SOL_MINT = 'So11111111111111111111111111111111111111112';
      const inputAmount = 1e9; // 1 SOL
      
      const routeInfo = await this.getQuote(SOL_MINT, tokenMint, inputAmount);
      
      if (routeInfo) {
        return {
          price: routeInfo.outAmount,
          priceInSOL: 1 / (routeInfo.outAmount / 1e9)
        };
      }
      
      return null;
    } catch (error) {
      console.error(`❌ Erreur prix token ${tokenMint}:`, error.message);
      return null;
    }
  }
}

module.exports = JupiterAPI;
