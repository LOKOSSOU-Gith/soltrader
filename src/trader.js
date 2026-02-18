const { 
  Connection, 
  PublicKey, 
  Transaction, 
  ComputeBudgetProgram, 
  LAMPORTS_PER_SOL 
} = require('@solana/web3.js');
const { 
  getAssociatedTokenAddress, 
  createAssociatedTokenAccountInstruction 
} = require('@solana/spl-token');
const axios = require('axios');
const config = require('./config');
const RPCManager = require('./rpcManager');
const SolscanAPI = require('./solscanAPI');
const CacheManager = require('./cache');

class Trader {
  constructor(walletManager) {
    this.rpcManager = new RPCManager();
    this.solscanAPI = new SolscanAPI();
    this.wallet = walletManager;
    this.tokenInfoCache = new CacheManager(10000); // Cache 10s pour infos token
    this.poolCache = new CacheManager(30000); // Cache 30s pour pools
    
    // Configurer la clé API Solscan si disponible
    if (config.solscanApiKey && config.solscanApiKey !== 'votre_cle_api_solscan_ici') {
      this.solscanAPI.setAPIKey(config.solscanApiKey);
    }
  }

  async getTokenInfo(tokenMintAddress) {
    // Vérifier le cache d'abord
    const cached = this.tokenInfoCache.get(tokenMintAddress);
    if (cached) {
      return cached;
    }

    try {
      // Essayer Solscan API en premier
      let tokenInfo = await this.solscanAPI.getTokenInfo(tokenMintAddress);
      
      if (tokenInfo) {
        console.log(`📊 Infos token via Solscan: ${tokenInfo.symbol}`);
        this.tokenInfoCache.set(tokenMintAddress, tokenInfo);
        return tokenInfo;
      }

      // Backup: utiliser DexScreener
      const response = await axios.get(`https://api.dexscreener.com/latest/dex/tokens/${tokenMintAddress}`, {
        timeout: 2000
      });

      if (response.data && response.data.pairs && response.data.pairs.length > 0) {
        const pair = response.data.pairs[0];
        tokenInfo = {
          symbol: pair.baseToken.symbol,
          name: pair.baseToken.name,
          price: parseFloat(pair.priceUsd) || 0,
          liquidity: parseFloat(pair.liquidity?.usd) || 0,
          volume24h: parseFloat(pair.volume?.h24) || 0,
          marketCap: parseFloat(pair.fdv) || 0
        };

        console.log(`📊 Infos token via DexScreener: ${tokenInfo.symbol}`);
        this.tokenInfoCache.set(tokenMintAddress, tokenInfo);
        return tokenInfo;
      }

      return null;
      
    } catch (error) {
      console.error(`Erreur lors de la récupération des infos du token ${tokenMintAddress}:`, error);
      return null;
    }
  }

  async findRaydiumPool(tokenMintAddress) {
    // Vérifier le cache d'abord
    const cached = this.poolCache.get(tokenMintAddress);
    if (cached) {
      return cached;
    }

    try {
      // Chercher le pool Raydium pour ce token
      const response = await axios.get(`https://api.dexscreener.com/latest/dex/tokens/${tokenMintAddress}`, {
        timeout: 1500 // Timeout ultra-court
      });
      
      if (response.data && response.data.pairs) {
        const raydiumPool = response.data.pairs.find(pair => 
          pair.dexId === 'raydium' && pair.quoteToken.symbol === 'SOL'
        );
        
        if (raydiumPool) {
          const poolInfo = {
            address: raydiumPool.pairAddress,
            tokenMint: raydiumPool.baseToken.address,
            solMint: raydiumPool.quoteToken.address,
            liquidity: raydiumPool.liquidity?.usd || 0
          };
          
          // Mettre en cache
          this.poolCache.set(tokenMintAddress, poolInfo);
          return poolInfo;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Erreur lors de la recherche du pool Raydium:', error);
      return null;
    }
  }

  async buyToken(tokenMintAddress, amountInSol) {
    try {
      console.log(`🟢 TENTATIVE D'ACHAT RÉEL: ${amountInSol} SOL du token ${tokenMintAddress}`);
      
      // Vérifier le solde
      const balance = await this.wallet.getBalance();
      if (balance < amountInSol) {
        throw new Error(`Solde insuffisant: ${balance} SOL disponible, ${amountInSol} SOL requis`);
      }

      // Récupérer les infos du token
      const tokenInfo = await this.getTokenInfo(tokenMintAddress);
      if (!tokenInfo) {
        throw new Error('Impossible de récupérer les informations du token');
      }

      console.log(`Token: ${tokenInfo.symbol} (${tokenInfo.name})`);
      console.log(`Prix: $${tokenInfo.price}`);
      console.log(`Liquidité: $${tokenInfo.liquidity}`);

      // Vérifier la liquidité minimale
      if (tokenInfo.liquidity < 1000) {
        console.warn(`⚠️ Liquidité faible: $${tokenInfo.liquidity}`);
      }

      // Créer et exécuter la transaction d'achat réelle
      const signature = await this.executeRealBuy(tokenMintAddress, amountInSol);
      
      console.log(`✅ ACHAT RÉEL RÉUSSI! Signature: ${signature}`);
      
      // Ajouter la position pour le stop loss
      if (this.stopLossManager) {
        await this.stopLossManager.addPosition(tokenMintAddress, tokenInfo.price, amountInSol / tokenInfo.price);
      }
      
      return signature;

    } catch (error) {
      console.error(`❌ Erreur lors de l'achat réel du token ${tokenMintAddress}:`, error.message);
      throw error;
    }
  }

  async executeRealBuy(tokenMintAddress, amountInSol) {
    try {
      // Utiliser Jupiter API pour l'achat
      const quoteResponse = await axios.get(`https://quote-api.jup.ag/v6/quote`, {
        params: {
          inputMint: 'So11111111111111111111111111111111111111112', // SOL
          outputMint: tokenMintAddress,
          amount: (amountInSol * 1e9).toString(), // Convertir SOL en lamports
          slippageBps: config.slippagePercentage * 100,
          onlyDirectRoutes: true,
          asLegacyTransaction: false
        },
        timeout: 5000
      });

      const swapResponse = await axios.post(`https://quote-api.jup.ag/v6/swap`, {
        quoteResponse: quoteResponse.data,
        userPublicKey: this.wallet.getPublicKey(),
        wrapAndUnwrapSol: true,
        useSharedAccounts: true,
        computeUnitPriceMicroLamports: config.transactionPriorityMicrolamports
      }, { timeout: 5000 });

      // Désérialiser et signer la transaction
      const swapTransaction = swapResponse.data.swapTransaction;
      const transaction = Transaction.from(Buffer.from(swapTransaction, 'base64'));
      
      // Signer la transaction
      const keypair = this.wallet.getKeypair();
      transaction.sign(keypair);

      // Envoyer la transaction avec exécution ULTRA RAPIDE
      const signature = await this.rpcManager.executeWithRetry(async (connection) => {
        return await connection.sendRawTransaction(
          transaction.serialize(),
          {
            skipPreflight: true, // Sauter preflight pour vitesse maximale
            preflightCommitment: 'processed' // Commitment le plus rapide
          }
        );
      });

      // Confirmation rapide avec timeout court
      try {
        const confirmation = await Promise.race([
          this.rpcManager.executeWithRetry(async (connection) => {
            return await connection.confirmTransaction(signature, 'processed');
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout confirmation')), 2000)
          )
        ]);

        if (confirmation.value.err) {
          throw new Error(`Transaction échouée: ${confirmation.value.err}`);
        }

        console.log(`⚡ Transaction ultra-rapide confirmée: ${signature}`);
        return signature;
        
      } catch (error) {
        console.warn(`⚠️ Transaction envoyée mais confirmation timeout: ${signature}`);
        return signature; // Retourner même si timeout pour continuer
      }
    }

    catch (error) {
      console.error('Erreur lors de l\'achat réel:', error);
      throw error;
    }
  }

  async sellToken(tokenMintAddress, amount = null) {
    try {
      console.log(`🔴 TENTATIVE DE VENTE RÉELLE: ${tokenMintAddress}`);
      
      // Obtenir le solde du token
      const tokenBalance = await this.wallet.getTokenBalance(tokenMintAddress);
      if (tokenBalance <= 0) {
        throw new Error(`Aucun token à vendre. Solde: ${tokenBalance}`);
      }

      // Utiliser le montant spécifié ou tout vendre
      const sellAmount = amount || tokenBalance;
      
      // Obtenir le prix actuel
      const tokenInfo = await this.getTokenInfo(tokenMintAddress);
      if (!tokenInfo) {
        throw new Error('Impossible de récupérer le prix actuel du token');
      }

      console.log(`Vente de ${sellAmount} ${tokenInfo.symbol} au prix $${tokenInfo.price}`);

      // Exécuter la vente réelle
      const signature = await this.executeRealSell(tokenMintAddress, sellAmount);
      
      console.log(`✅ VENTE RÉELLE RÉUSSIE! Signature: ${signature}`);
      
      // Retirer la position du stop loss
      if (this.stopLossManager) {
        this.stopLossManager.positions.delete(tokenMintAddress);
      }
      
      return signature;

    } catch (error) {
      console.error(`❌ Erreur lors de la vente réelle du token ${tokenMintAddress}:`, error.message);
      throw error;
    }
  }

  async executeRealSell(tokenMintAddress, tokenAmount) {
    try {
      // Utiliser Jupiter API pour la vente
      const quoteResponse = await axios.get(`https://quote-api.jup.ag/v6/quote`, {
        params: {
          inputMint: tokenMintAddress,
          outputMint: 'So11111111111111111111111111111111111111112', // SOL
          amount: Math.floor(tokenAmount * 1e6).toString(), // Ajuster selon les décimales
          slippageBps: config.slippagePercentage * 100,
          onlyDirectRoutes: true,
          asLegacyTransaction: false
        },
        timeout: 5000
      });

      const swapResponse = await axios.post(`https://quote-api.jup.ag/v6/swap`, {
        quoteResponse: quoteResponse.data,
        userPublicKey: this.wallet.getPublicKey(),
        wrapAndUnwrapSol: true,
        useSharedAccounts: true,
        computeUnitPriceMicroLamports: config.transactionPriorityMicrolamports
      }, { timeout: 5000 });

      // Désérialiser et signer la transaction
      const swapTransaction = swapResponse.data.swapTransaction;
      const transaction = Transaction.from(Buffer.from(swapTransaction, 'base64'));
      
      // Signer la transaction
      const keypair = this.wallet.getKeypair();
      transaction.sign(keypair);

      // Envoyer la transaction avec exécution ULTRA RAPIDE
      const signature = await this.rpcManager.executeWithRetry(async (connection) => {
        return await connection.sendRawTransaction(
          transaction.serialize(),
          {
            skipPreflight: true, // Sauter preflight pour vitesse maximale
            preflightCommitment: 'processed' // Commitment le plus rapide
          }
        );
      });

      // Confirmation rapide avec timeout court
      try {
        const confirmation = await Promise.race([
          this.rpcManager.executeWithRetry(async (connection) => {
            return await connection.confirmTransaction(signature, 'processed');
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout confirmation')), 2000)
          )
        ]);

        if (confirmation.value.err) {
          throw new Error(`Transaction échouée: ${confirmation.value.err}`);
        }

        console.log(`⚡ Transaction ultra-rapide confirmée: ${signature}`);
        return signature;
        
      } catch (error) {
        console.warn(`⚠️ Transaction envoyée mais confirmation timeout: ${signature}`);
        return signature; // Retourner même si timeout pour continuer
      }

    } catch (error) {
      console.error('Erreur lors de la vente réelle:', error);
      throw error;
    }
  }

  setStopLossManager(stopLossManager) {
    this.stopLossManager = stopLossManager;
  }

  async createBuyTransaction(tokenMintAddress, amountInSol, pool) {
    const keypair = this.wallet.getKeypair();
    const tokenMint = new PublicKey(tokenMintAddress);
    
    // Calculer le montant en lamports
    const amountInLamports = amountInSol * LAMPORTS_PER_SOL;
    
    const transaction = new Transaction();
    
    // Instructions de priorité MAXIMALE pour exécution ultra-rapide
    transaction.add(
      ComputeBudgetProgram.setComputeUnitLimit({ 
        units: config.computeUnitLimit 
      }),
      ComputeBudgetProgram.setComputeUnitPrice({ 
        microLamports: config.transactionPriorityMicrolamports 
      })
    );

    // Créer le compte token associé si nécessaire (vérification parallèle)
    const [associatedTokenAddress, accountInfo] = await Promise.all([
      getAssociatedTokenAddress(tokenMint, keypair.publicKey),
      this.connection.getAccountInfo(
        await getAssociatedTokenAddress(tokenMint, keypair.publicKey)
      ).catch(() => null)
    ]);
    
    if (!accountInfo) {
      const createATAInstruction = createAssociatedTokenAccountInstruction(
        keypair.publicKey,
        associatedTokenAddress,
        keypair.publicKey,
        tokenMint
      );
      transaction.add(createATAInstruction);
    }

    // Utiliser Jupiter API pour swap ultra-rapide
    const swapInstruction = await this.createJupiterSwapInstruction(
      tokenMintAddress,
      amountInLamports,
      associatedTokenAddress
    );
    
    if (swapInstruction) {
      transaction.add(swapInstruction);
    }

    transaction.feePayer = keypair.publicKey;
    
    // Blockhash le plus récent pour vitesse maximale
    const { blockhash } = await this.connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;

    return transaction;
  }

  async createJupiterSwapInstruction(tokenMintAddress, amountInLamports, destinationAccount) {
    try {
      // Appel API Jupiter pour route optimale
      const quoteResponse = await axios.get(`https://quote-api.jup.ag/v6/quote`, {
        params: {
          inputMint: 'So11111111111111111111111111111111111111112', // SOL
          outputMint: tokenMintAddress,
          amount: amountInLamports.toString(),
          slippageBps: config.slippagePercentage * 100,
          onlyDirectRoutes: true, // Plus rapide
          asLegacyTransaction: false
        },
        timeout: 2000 // Timeout ultra-court
      });

      const swapResponse = await axios.post(`https://quote-api.jup.ag/v6/swap`, {
        quoteResponse: quoteResponse.data,
        userPublicKey: this.wallet.getPublicKey(),
        wrapAndUnwrapSol: true,
        useSharedAccounts: true, // Plus rapide
        computeUnitPriceMicroLamports: config.transactionPriorityMicrolamports
      }, { timeout: 2000 });

      // Désérialiser l'instruction de swap
      const swapTransaction = swapResponse.data.swapTransaction;
      const transaction = Transaction.from(Buffer.from(swapTransaction, 'base64'));
      
      // Retourner seulement l'instruction de swap
      return transaction.instructions[transaction.instructions.length - 1];
      
    } catch (error) {
      console.error('Erreur Jupiter, fallback vers Raydium:', error.message);
      return null;
    }
  }

  async executeTransaction(transaction) {
    const keypair = this.wallet.getKeypair();
    
    // Signer la transaction
    transaction.sign(keypair);
    
    // Envoyer avec paramètres ultra-rapides
    const signature = await this.connection.sendRawTransaction(
      transaction.serialize(),
      {
        skipPreflight: true, // Sauter preflight pour vitesse maximale
        preflightCommitment: 'processed' // Commitment le plus rapide
      }
    );

    // Confirmation rapide avec timeout court
    try {
      const confirmation = await Promise.race([
        this.connection.confirmTransaction(signature, 'processed'),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout confirmation')), 3000)
        )
      ]);

      if (confirmation.value.err) {
        throw new Error(`Transaction échouée: ${confirmation.value.err}`);
      }

      console.log(`⚡ Transaction ultra-rapide confirmée: ${signature}`);
      return signature;
      
    } catch (error) {
      console.warn(`⚠️ Transaction envoyée mais confirmation timeout: ${signature}`);
      return signature; // Retourner même si timeout pour continuer
    }
  }

  async getTokenBalance(tokenMintAddress) {
    return await this.wallet.getTokenBalance(tokenMintAddress);
  }
}

module.exports = Trader;
