const { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } = require('@solana/spl-token');
const bs58 = require('bs58');
const config = require('./config');

class WalletManager {
  constructor() {
    this.rpcUrls = config.rpcUrl.split(',').map(url => url.trim());
    this.currentRpcIndex = 0;
    this.connection = this.createConnection();
    this.keypair = this.createKeypairFromPrivateKey();
    this.publicKey = this.keypair.publicKey;
  }

  createConnection() {
    const rpcUrl = this.rpcUrls[this.currentRpcIndex];
    console.log(`🔗 Utilisation RPC: ${rpcUrl}`);
    return new Connection(rpcUrl, 'confirmed');
  }

  rotateRpc() {
    this.currentRpcIndex = (this.currentRpcIndex + 1) % this.rpcUrls.length;
    console.log(`🔄 Rotation RPC vers: ${this.rpcUrls[this.currentRpcIndex]}`);
    this.connection = this.createConnection();
  }

  async executeWithRetry(operation, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (error.message.includes('429') || error.message.includes('Too many requests')) {
          console.log(`⏳ Rate limit RPC, tentative ${attempt}/${maxRetries}`);
          if (attempt < maxRetries) {
            this.rotateRpc();
            await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
            continue;
          }
        }
        if (attempt === maxRetries) {
          throw error;
        }
        console.log(`🔄 Erreur RPC, tentative ${attempt}/${maxRetries}:`, error.message);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  createKeypairFromPrivateKey() {
    try {
      const privateKeyBytes = bs58.decode(config.privateKey);
      return Keypair.fromSecretKey(privateKeyBytes);
    } catch (error) {
      throw new Error(`Erreur lors de la création du keypair: ${error.message}`);
    }
  }

  async getBalance() {
    try {
      return await this.executeWithRetry(async () => {
        const balance = await this.connection.getBalance(this.publicKey);
        return balance / LAMPORTS_PER_SOL;
      });
    } catch (error) {
      console.error('Erreur lors de la récupération du solde:', error);
      return 0;
    }
  }

  async getTokenBalance(tokenMintAddress) {
    try {
      return await this.executeWithRetry(async () => {
        const tokenMint = new PublicKey(tokenMintAddress);
        const associatedTokenAddress = await getAssociatedTokenAddress(tokenMint, this.publicKey);
        
        const accountInfo = await this.connection.getAccountInfo(associatedTokenAddress);
        if (!accountInfo) {
          return 0;
        }

        const accountData = await this.connection.getTokenAccountBalance(associatedTokenAddress);
        return parseFloat(accountData.value.amount);
      });
    } catch (error) {
      console.error(`Erreur lors de la récupération du solde du token ${tokenMintAddress}:`, error);
      return 0;
    }
  }

  async createTokenAccountIfNotExists(tokenMintAddress) {
    try {
      return await this.executeWithRetry(async () => {
        const tokenMint = new PublicKey(tokenMintAddress);
        const associatedTokenAddress = await getAssociatedTokenAddress(tokenMint, this.publicKey);
        
        const accountInfo = await this.connection.getAccountInfo(associatedTokenAddress);
        if (accountInfo) {
          return associatedTokenAddress;
        }

        const instruction = createAssociatedTokenAccountInstruction(
          this.publicKey,
          associatedTokenAddress,
          this.publicKey,
          tokenMint
        );

        return { instruction, associatedTokenAddress };
      });
    } catch (error) {
      console.error(`Erreur lors de la création du compte token ${tokenMintAddress}:`, error);
      throw error;
    }
  }

  getPublicKey() {
    return this.publicKey.toBase58();
  }

  getKeypair() {
    return this.keypair;
  }
}

module.exports = WalletManager;
