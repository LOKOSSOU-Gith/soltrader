require('dotenv').config();

const config = {
  // Configuration RPC
  // RPC endpoints (séparés par des virgules)
  rpcUrl: process.env.RPC_URL || 'https://api.mainnet-beta.solana.com',
  
  // Configuration wallet
  privateKey: process.env.PRIVATE_KEY,
  targetWallets: process.env.TARGET_WALLETS ? process.env.TARGET_WALLETS.split(',').map(w => w.trim()) : [process.env.TARGET_WALLET],
  
  // Configuration API
  solscanApiKey: process.env.SOLSCAN_API_KEY,
  
  // Configuration trading - Micro-Sniper Strategy 0.0015 SOL
  buyAmountSol: parseFloat(process.env.BUY_AMOUNT_SOL) || 0.0004, // Position 0.0003-0.0005 SOL
  maxBuyAmountSol: parseFloat(process.env.MAX_BUY_AMOUNT_SOL) || 0.0005,
  minBuyAmountSol: parseFloat(process.env.MIN_BUY_AMOUNT_SOL) || 0.0003,
  slippagePercentage: parseFloat(process.env.SLIPPAGE_PERCENTAGE) || 10,
  delayMs: parseInt(process.env.DELAY_MS) || 200, // Ultra-réactif
  monitorIntervalMs: parseInt(process.env.MONITOR_INTERVAL_MS) || 1000,
  transactionPriorityMicrolamports: parseInt(process.env.TRANSACTION_PRIORITY_MICROLAMPORTS) || 100000,
  computeUnitLimit: parseInt(process.env.COMPUTE_UNIT_LIMIT) || 200000,
  stopLossPercentage: parseFloat(process.env.STOP_LOSS_PERCENTAGE) || 15, // -15% dur
  takeProfitPercentage: parseFloat(process.env.TAKE_PROFIT_PERCENTAGE) || 20, // +20% rapide
  positionCheckIntervalMs: parseInt(process.env.POSITION_CHECK_INTERVAL_MS) || 1000,
  
  // Filtres Micro-Sniper
  maxMarketCap: parseFloat(process.env.MAX_MARKET_CAP) || 15000, // < 15k$ (plus sélectif)
  minHolders: parseInt(process.env.MIN_HOLDERS) || 5,
  maxHolders: parseInt(process.env.MAX_HOLDERS) || 10,
  minVolume5min: parseFloat(process.env.MIN_VOLUME_5MIN) || 8000, // > 8k$
  maxTokenAgeSeconds: parseInt(process.env.MAX_TOKEN_AGE_SECONDS) || 60, // < 60 secondes
  maxMarketCapHard: parseFloat(process.env.MAX_MARKET_CAP_HARD) || 300000, // < 300k$ (safeguard)
  
  // Adresses importantes sur Solana
  SERUM_PROGRAM_ID: '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin',
  RAYDIUM_PROGRAM_ID: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
  
  // Validation
  validate() {
    if (!this.privateKey) {
      throw new Error('PRIVATE_KEY est requis dans le fichier .env');
    }
    if (!this.targetWallets || this.targetWallets.length === 0) {
      throw new Error('TARGET_WALLETS est requis dans le fichier .env');
    }
    if (this.targetWallets.some(wallet => !wallet || wallet === 'WALLET3' || wallet === 'WALLET4' || wallet === 'WALLET5')) {
      console.warn('⚠️ Certains wallets cibles sont des placeholders. Remplacez-les par de vraies adresses.');
    }
    if (this.buyAmountSol <= 0 || this.buyAmountSol > this.maxBuyAmountSol) {
      throw new Error(`BUY_AMOUNT_SOL doit être entre ${this.minBuyAmountSol} et ${this.maxBuyAmountSol} SOL`);
    }
  }
};

module.exports = config;
