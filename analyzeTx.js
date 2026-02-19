const { Connection, PublicKey, LAMPORTS_PER_SOL, Keypair } = require('@solana/web3.js');
const bs58 = require('bs58');

// Charger les variables d'environnement
require('dotenv').config();

const config = {
  privateKey: process.env.PRIVATE_KEY
};

async function analyzeTransaction(signature) {
  try {
    const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
    
    console.log(`🔍 Analyse détaillée de la transaction: ${signature}`);
    
    // Obtenir les détails complets de la transaction
    const tx = await connection.getTransaction(signature, {
      maxSupportedTransactionVersion: 0,
      commitment: 'confirmed'
    });
    
    if (!tx) {
      console.log('❌ Transaction non trouvée');
      return;
    }
    
    console.log(`\n📋 Détails de la transaction:`);
    console.log(`   Block Time: ${new Date(tx.blockTime * 1000).toLocaleString()}`);
    console.log(`   Slot: ${tx.slot}`);
    console.log(`   Fee: ${tx.meta.fee / LAMPORTS_PER_SOL} SOL`);
    console.log(`   Compute Units Consumed: ${tx.meta.computeUnitsConsumed || 'N/A'}`);
    
    // Analyser les instructions
    console.log(`\n🔧 Instructions (${tx.transaction.message.instructions.length}):`);
    
    for (let i = 0; i < tx.transaction.message.instructions.length; i++) {
      const instruction = tx.transaction.message.instructions[i];
      console.log(`\n   Instruction ${i + 1}:`);
      console.log(`     Program ID: ${instruction.programId}`);
      
      // Identifier le type d'instruction
      const programId = instruction.programId;
      
      if (programId === '11111111111111111111111111111111') {
        console.log(`     Type: Transfer SOL`);
        
        // Décoder l'instruction de transfert SOL
        try {
          const data = Buffer.from(instruction.data);
          const fromPubkey = tx.transaction.message.accountKeys[instruction.accounts[0]];
          const toPubkey = tx.transaction.message.accountKeys[instruction.accounts[1]];
          const amount = Number(data.readBigUInt64LE(0));
          
          console.log(`     De: ${fromPubkey}`);
          console.log(`     Vers: ${toPubkey}`);
          console.log(`     Montant: ${amount / LAMPORTS_PER_SOL} SOL`);
          
          // Vérifier si c'est votre wallet
          const privateKeyBytes = bs58.decode(config.privateKey);
          const keypair = Keypair.fromSecretKey(privateKeyBytes);
          const myPublicKey = keypair.publicKey.toBase58();
          
          if (fromPubkey === myPublicKey) {
            console.log(`     ⚠️  VOS SOL ont été envoyés vers: ${toPubkey}`);
          }
        } catch (error) {
          console.log(`     Erreur décodage: ${error.message}`);
        }
      } else if (programId === 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') {
        console.log(`     Type: Token Operation`);
      } else if (programId === 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4') {
        console.log(`     Type: Jupiter Swap`);
      } else {
        console.log(`     Type: Autre programme`);
      }
    }
    
    // Analyser les changements de soldes
    console.log(`\n💰 Changements de soldes:`);
    
    for (let i = 0; i < tx.meta.preBalances.length; i++) {
      const account = tx.transaction.message.accountKeys[i];
      const preBalance = tx.meta.preBalances[i];
      const postBalance = tx.meta.postBalances[i];
      const change = postBalance - preBalance;
      
      if (change !== 0) {
        console.log(`   Compte: ${account.toBase58().slice(0, 8)}...`);
        console.log(`   Changement: ${change / LAMPORTS_PER_SOL} SOL`);
        
        if (change > 0) {
          console.log(`   ✅ Reçu: +${change / LAMPORTS_PER_SOL} SOL`);
        } else {
          console.log(`   ❌ Envoyé: ${change / LAMPORTS_PER_SOL} SOL`);
        }
      }
    }
    
    // Analyser les soldes de tokens
    console.log(`\n🪙 Changements de tokens:`);
    
    if (tx.meta.preTokenBalances && tx.meta.postTokenBalances) {
      for (let i = 0; i < Math.max(tx.meta.preTokenBalances.length, tx.meta.postTokenBalances.length); i++) {
        const preBalance = tx.meta.preTokenBalances[i];
        const postBalance = tx.meta.postTokenBalances[i];
        
        if (preBalance && postBalance) {
          const preAmount = parseFloat(preBalance.uiTokenAmount.amount || 0);
          const postAmount = parseFloat(postBalance.uiTokenAmount.amount || 0);
          const change = postAmount - preAmount;
          
          if (change !== 0) {
            console.log(`   Token: ${postBalance.mint.slice(0, 8)}...`);
            console.log(`   Changement: ${change} (${postBalance.uiTokenAmount.decimals} décimales)`);
            console.log(`   UI Amount: ${postBalance.uiTokenAmount.uiString}`);
          }
        }
      }
    }
    
    // Vérifier les logs
    if (tx.meta.logMessages && tx.meta.logMessages.length > 0) {
      console.log(`\n📋 Logs de la transaction:`);
      tx.meta.logMessages.forEach((log, index) => {
        console.log(`   ${index + 1}. ${log}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erreur analyse:', error.message);
  }
}

// Analyser la transaction suspecte
const suspiciousTx = '3avprkeskq5suDB1Skiz4rMdSDWUsy9dSkHqoU51ZsAv6tFSgFBHBxm7URXCCPeEENmTXvpNBP3Hq9FU2DAnfRpV';
analyzeTransaction(suspiciousTx);
