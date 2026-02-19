const { Connection, PublicKey, LAMPORTS_PER_SOL, Keypair } = require('@solana/web3.js');
const bs58 = require('bs58');

// Charger les variables d'environnement
require('dotenv').config();

const config = {
  rpcUrl: process.env.RPC_URL || 'https://api.mainnet-beta.solana.com',
  privateKey: process.env.PRIVATE_KEY
};

async function checkWalletBalance() {
  try {
    // Créer la connexion avec RPC public
    const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
    
    // Créer le keypair depuis la clé privée
    const privateKeyBytes = bs58.decode(config.privateKey);
    const keypair = Keypair.fromSecretKey(privateKeyBytes);
    const publicKey = keypair.publicKey;
    
    console.log(`🔍 Analyse du wallet: ${publicKey.toBase58()}`);
    
    // Obtenir le solde avec retry
    let balance = 0;
    let retries = 3;
    
    while (retries > 0) {
      try {
        balance = await connection.getBalance(publicKey);
        break;
      } catch (error) {
        console.log(`⏳ Erreur RPC, tentative ${4 - retries}/3: ${error.message}`);
        retries--;
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          throw error;
        }
      }
    }
    
    const balanceSol = balance / LAMPORTS_PER_SOL;
    console.log(`💰 Solde actuel: ${balanceSol} SOL`);
    
    // Obtenir les transactions récentes avec retry
    let signatures = [];
    retries = 3;
    
    while (retries > 0) {
      try {
        signatures = await connection.getSignaturesForAddress(publicKey, {
          limit: 10
        });
        break;
      } catch (error) {
        console.log(`⏳ Erreur récupération transactions, tentative ${4 - retries}/3: ${error.message}`);
        retries--;
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          throw error;
        }
      }
    }
    
    console.log(`📋 ${signatures.length} transactions récentes trouvées`);
    
    for (let i = 0; i < Math.min(signatures.length, 5); i++) {
      const sig = signatures[i];
      console.log(`\n📝 Transaction ${i + 1}:`);
      console.log(`   Signature: ${sig.signature}`);
      console.log(`   Statut: ${sig.confirmationStatus || 'N/A'}`);
      console.log(`   Block Time: ${sig.blockTime ? new Date(sig.blockTime * 1000).toLocaleString() : 'N/A'}`);
      
      // Obtenir les détails de la transaction
      try {
        const tx = await connection.getTransaction(sig.signature, {
          maxSupportedTransactionVersion: 0
        });
        
        if (tx && tx.meta) {
          console.log(`   Fee: ${tx.meta.fee / LAMPORTS_PER_SOL} SOL`);
          
          if (tx.meta.preBalances && tx.meta.postBalances) {
            console.log(`   Pre-balance: ${tx.meta.preBalances[0] / LAMPORTS_PER_SOL} SOL`);
            console.log(`   Post-balance: ${tx.meta.postBalances[0] / LAMPORTS_PER_SOL} SOL`);
            
            const solChange = (tx.meta.postBalances[0] - tx.meta.preBalances[0]) / LAMPORTS_PER_SOL;
            console.log(`   Changement SOL: ${solChange >= 0 ? '+' : ''}${solChange} SOL`);
          }
          
          // Vérifier les transferts de tokens
          if (tx.meta.preTokenBalances && tx.meta.postTokenBalances) {
            const tokenTransfers = [];
            
            for (let j = 0; j < tx.meta.postTokenBalances.length; j++) {
              const postBalance = tx.meta.postTokenBalances[j];
              const preBalance = tx.meta.preTokenBalances[j];
              
              if (postBalance.mint !== 'So11111111111111111111111111111111111111112') {
                const preAmount = preBalance ? parseFloat(preBalance.uiTokenAmount.amount || 0) : 0;
                const postAmount = parseFloat(postBalance.uiTokenAmount.amount || 0);
                
                if (postAmount > preAmount) {
                  tokenTransfers.push({
                    mint: postBalance.mint,
                    amount: postAmount - preAmount,
                    decimals: postBalance.uiTokenAmount.decimals,
                    uiAmount: postBalance.uiTokenAmount.uiString
                  });
                }
              }
            }
            
            if (tokenTransfers.length > 0) {
              console.log(`   🪙 Tokens reçus: ${tokenTransfers.length}`);
              tokenTransfers.forEach((transfer, idx) => {
                console.log(`      ${idx + 1}. ${transfer.mint.slice(0, 8)}... (${transfer.uiAmount})`);
              });
            }
          }
        }
      } catch (error) {
        console.log(`   ❌ Erreur récupération détails: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur analyse wallet:', error.message);
  }
}

// Exécuter l'analyse
checkWalletBalance();
