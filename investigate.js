const { Connection, PublicKey } = require('@solana/web3.js');

async function investigateDestination() {
  const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
  
  // Adresse destination complète (extraite de la transaction)
  const destinationAddress = 'Avdnjm8cQrL9ZJv6KqXfJ5YmN2d7pTqR8sW3vE4bX6nZ9';
  
  console.log(`🔍 Investigation du wallet destination: ${destinationAddress}`);
  
  try {
    // Vérifier le solde actuel
    const balance = await connection.getBalance(new PublicKey(destinationAddress));
    const balanceSol = balance / 1e9;
    
    console.log(`💰 Solde actuel: ${balanceSol} SOL`);
    
    // Obtenir les transactions récentes
    const signatures = await connection.getSignaturesForAddress(
      new PublicKey(destinationAddress), 
      { limit: 10 }
    );
    
    console.log(`📋 ${signatures.length} transactions récentes:`);
    
    for (let i = 0; i < Math.min(signatures.length, 5); i++) {
      const sig = signatures[i];
      console.log(`\n${i + 1}. ${sig.signature}`);
      console.log(`   Date: ${sig.blockTime ? new Date(sig.blockTime * 1000).toLocaleString() : 'N/A'}`);
      console.log(`   Statut: ${sig.confirmationStatus || 'N/A'}`);
      
      // Obtenir les détails
      try {
        const tx = await connection.getTransaction(sig.signature, {
          maxSupportedTransactionVersion: 0
        });
        
        if (tx && tx.meta) {
          // Vérifier si c'est un transfert sortant
          for (let j = 0; j < tx.meta.preBalances.length; j++) {
            const preBalance = tx.meta.preBalances[j];
            const postBalance = tx.meta.postBalances[j];
            const change = postBalance - preBalance;
            
            if (change < 0 && Math.abs(change) > 0.001 * 1e9) {
              console.log(`   ⚠️  Sortie: ${Math.abs(change) / 1e9} SOL`);
            }
          }
        }
      } catch (error) {
        console.log(`   Erreur détails: ${error.message}`);
      }
    }
    
    // Vérifier si c'est un wallet connu
    console.log(`\n🔍 Analyse du wallet:`);
    
    // Vérifier s'il y a des tokens
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      new PublicKey(destinationAddress),
      { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' }
    );
    
    console.log(`🪙 Nombre de comptes tokens: ${tokenAccounts.value.length}`);
    
    if (tokenAccounts.value.length > 0) {
      tokenAccounts.value.forEach((account, idx) => {
        const tokenInfo = account.account.data.parsed.info;
        console.log(`   ${idx + 1}. Token: ${tokenInfo.mint.slice(0, 8)}...`);
        console.log(`      Amount: ${tokenInfo.tokenAmount.uiString}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erreur investigation:', error.message);
  }
}

investigateDestination();
