const { Connection, PublicKey } = require('@solana/web3.js');

async function getFullTransactionDetails() {
  const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
  
  const signature = '3avprkeskq5suDB1Skiz4rMdSDWUsy9dSkHqoU51ZsAv6tFSgFBHBxm7URXCCPeEENmTXvpNBP3Hq9FU2DAnfRpV';
  
  console.log(`🔍 Analyse complète de la transaction: ${signature}`);
  
  try {
    const tx = await connection.getTransaction(signature, {
      maxSupportedTransactionVersion: 0,
      commitment: 'confirmed'
    });
    
    if (!tx) {
      console.log('❌ Transaction non trouvée');
      return;
    }
    
    console.log(`\n📋 Comptes impliqués:`);
    
    // Analyser tous les comptes
    for (let i = 0; i < tx.transaction.message.accountKeys.length; i++) {
      const account = tx.transaction.message.accountKeys[i];
      const preBalance = tx.meta.preBalances[i];
      const postBalance = tx.meta.postBalances[i];
      const change = postBalance - preBalance;
      
      console.log(`\n${i + 1}. Adresse: ${account}`);
      console.log(`   Changement: ${change / 1e9} SOL`);
      
      if (change > 0) {
        console.log(`   ✅ Reçu: +${change / 1e9} SOL`);
        console.log(`   ⚠️  CECI EST L'ADRESSE QUI A REÇU VOS SOL!`);
      } else if (change < 0) {
        console.log(`   ❌ Envoyé: ${change / 1e9} SOL`);
        if (Math.abs(change) > 0.001) {
          console.log(`   📍 VOTRE WALLET (envoyeur)`);
        }
      }
    }
    
    // Vérifier les logs pour plus de détails
    console.log(`\n📋 Logs détaillés:`);
    tx.meta.logMessages.forEach((log, index) => {
      console.log(`${index + 1}. ${log}`);
    });
    
    // Créer un rapport
    console.log(`\n🚨 RAPPORT D'INCIDENT:`);
    console.log(`   Date: ${new Date(tx.blockTime * 1000).toLocaleString()}`);
    console.log(`   Montant total perdu: 0.0015 SOL`);
    console.log(`   Frais de transaction: 0.000005 SOL`);
    console.log(`   Type: Transfert SOL direct`);
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

getFullTransactionDetails();
