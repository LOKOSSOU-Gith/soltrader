const { Connection, PublicKey, Keypair, Transaction, sendAndConfirmTransaction } = require('@solana/web3.js');
const axios = require('axios');
const config = require('./config');

class SafeTrader {
  constructor(walletManager) {
    this.wallet = walletManager;
    this.connection = walletManager.connection;
    this.testMode = process.env.TEST_MODE === 'true' || true; // MODE TEST PAR DÉFAUT
  }

  async buyToken(tokenMintAddress, amountInSol) {
    try {
      console.log(`🛡️  ACHAT SÉCURISÉ: ${amountInSol} SOL du token ${tokenMintAddress.slice(0, 8)}...`);
      
      // MODE TEST - PAS DE VRAIE TRANSACTION
      if (this.testMode) {
        console.log('🧪 MODE TEST: Simulation uniquement');
        return await this.simulateBuy(tokenMintAddress, amountInSol);
      }

      // VALIDATIONS SÉCURITÉ
      await this.validateBuy(tokenMintAddress, amountInSol);
      
      // OBTENIR LA TRANSACTION JUPITER
      const transaction = await this.getJupiterTransaction(tokenMintAddress, amountInSol);
      
      // VALIDER LA TRANSACTION
      await this.validateTransaction(transaction, tokenMintAddress);
      
      // SIMULER AVANT ENVOI
      await this.simulateTransaction(transaction);
      
      // ENVOYER LA TRANSACTION
      const signature = await this.executeTransaction(transaction);
      
      console.log(`✅ ACHAT SÉCURISÉ RÉUSSI: ${signature}`);
      return signature;

    } catch (error) {
      console.error(`❌ Erreur achat sécurisé:`, error.message);
      throw error;
    }
  }

  async simulateBuy(tokenMintAddress, amountInSol) {
    console.log(`🧪 Simulation d'achat: ${amountInSol} SOL → ${tokenMintAddress.slice(0, 8)}...`);
    
    // Simuler un délai
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Signature de test
    const testSignature = 'test_' + Date.now();
    console.log(`✅ Simulation réussie: ${testSignature}`);
    
    return {
      signature: testSignature,
      inputAmount: amountInSol,
      outputAmount: '1000000', // Simulation
      priceImpact: '2.5',
      testMode: true
    };
  }

  async validateBuy(tokenMintAddress, amountInSol) {
    console.log('🔍 Validation des paramètres...');
    
    // Valider le montant
    if (amountInSol > 0.001) {
      throw new Error(`Montant trop élevé: ${amountInSol} SOL (max: 0.001 SOL)`);
    }
    
    if (amountInSol < 0.0001) {
      throw new Error(`Montant trop faible: ${amountInSol} SOL (min: 0.0001 SOL)`);
    }
    
    // Valider le token mint
    if (!tokenMintAddress || tokenMintAddress.length !== 44) {
      throw new Error('Token mint invalide');
    }
    
    // Valider le solde
    const balance = await this.wallet.getBalance();
    if (balance < amountInSol + 0.0001) { // +0.0001 pour les frais
      throw new Error(`Solde insuffisant: ${balance} SOL disponible`);
    }
    
    console.log('✅ Validation réussie');
  }

  async getJupiterTransaction(tokenMintAddress, amountInSol) {
    console.log('🪐 Obtention transaction Jupiter...');
    
    try {
      // Obtenir le quote
      const quoteResponse = await axios.get(`https://quote-api.jup.ag/v6/quote`, {
        params: {
          inputMint: 'So11111111111111111111111111111111111111112',
          outputMint: tokenMintAddress,
          amount: Math.floor(amountInSol * 1e9).toString(),
          slippageBps: config.slippagePercentage * 100,
          onlyDirectRoutes: false, // Autoriser les routes indirectes
          asLegacyTransaction: false
        },
        timeout: 10000
      });

      if (!quoteResponse.data) {
        throw new Error('Pas de réponse Jupiter');
      }

      console.log(`📊 Quote reçu: ${quoteResponse.data.outAmount} tokens attendus`);

      // Obtenir la transaction
      const swapResponse = await axios.post(`https://quote-api.jup.ag/v6/swap`, {
        quoteResponse: quoteResponse.data,
        userPublicKey: this.wallet.getPublicKey(),
        wrapAndUnwrapSol: true,
        useSharedAccounts: false, // Désactiver pour plus de sécurité
        feeAccount: null
      }, { timeout: 10000 });

      if (!swapResponse.data || !swapResponse.data.swapTransaction) {
        throw new Error('Transaction Jupiter invalide');
      }

      // Désérialiser la transaction
      const transaction = Transaction.from(Buffer.from(swapResponse.data.swapTransaction, 'base64'));
      
      return transaction;

    } catch (error) {
      console.error('❌ Erreur Jupiter:', error.message);
      throw new Error(`Erreur Jupiter: ${error.message}`);
    }
  }

  async validateTransaction(transaction, expectedTokenMint) {
    console.log('🔍 Validation de la transaction...');
    
    // Vérifier que c'est bien une transaction Jupiter
    const hasJupiterInstruction = transaction.message.instructions.some(instruction => 
      instruction.programId.toString() === 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4'
    );

    if (!hasJupiterInstruction) {
      throw new Error('La transaction ne contient pas d\'instruction Jupiter valide!');
    }

    // Vérifier qu'il n'y a pas de transfert SOL direct
    const hasDirectTransfer = transaction.message.instructions.some(instruction => 
      instruction.programId.toString() === '11111111111111111111111111111111'
    );

    if (hasDirectTransfer) {
      throw new Error('La transaction contient un transfert SOL direct non autorisé!');
    }

    console.log('✅ Transaction validée');
  }

  async simulateTransaction(transaction) {
    console.log('🧪 Simulation de la transaction...');
    
    try {
      const simulation = await this.connection.simulateTransaction(transaction);
      
      if (simulation.value.err) {
        throw new Error(`Simulation échouée: ${JSON.stringify(simulation.value.err)}`);
      }
      
      console.log(`✅ Simulation réussie - Units: ${simulation.value.unitsConsumed}`);
      
    } catch (error) {
      console.error('❌ Erreur simulation:', error.message);
      throw error;
    }
  }

  async executeTransaction(transaction) {
    console.log('📤 Envoi de la transaction...');
    
    try {
      // Signer la transaction
      const keypair = this.wallet.getKeypair();
      transaction.sign(keypair);

      // Envoyer avec confirmation
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [keypair],
        {
          commitment: 'confirmed',
          preflightCommitment: 'confirmed',
          maxRetries: 3
        }
      );

      console.log(`✅ Transaction confirmée: ${signature}`);
      return signature;

    } catch (error) {
      console.error('❌ Erreur exécution:', error.message);
      throw error;
    }
  }
}

module.exports = SafeTrader;
