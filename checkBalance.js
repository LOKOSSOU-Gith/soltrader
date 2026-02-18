const { Connection } = require('@solana/web3.js');

async function checkBalance() {
  try {
    // Essayer plusieurs endpoints RPC
    const endpoints = [
      'https://api.mainnet-beta.solana.com',
      'https://solana-api.projectserum.com',
      'https://rpc.ankr.com/solana'
    ];
    
    for (let i = 0; i < endpoints.length; i++) {
      try {
        console.log(`🔄 Test endpoint ${i + 1}: ${endpoints[i]}`);
        const connection = new Connection(endpoints[i], 'confirmed');
        
        const wallet = require('./src/wallet');
        const walletManager = new wallet();
        
        const balance = await walletManager.getBalance();
        console.log(`✅ Endpoint ${i + 1} fonctionnel!`);
        console.log(`💳 Solde actuel: ${balance} SOL`);
        console.log(`📍 Adresse du wallet: ${walletManager.getPublicKey()}`);
        return;
        
      } catch (error) {
        console.log(`❌ Endpoint ${i + 1} échoué: ${error.message}`);
        if (i === endpoints.length - 1) {
          console.log('💸 Aucun endpoint RPC fonctionnel');
          console.log('💰 Votre SOL ne sont pas visibles actuellement');
          console.log('🌐 Vérifiez sur Phantom Wallet directement');
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur générale:', error.message);
  }
}

checkBalance();
