# 🔧 Configuration pour Render

Variables d'environnement requises pour le déploiement sur Render :

## 📋 Variables Essentielles

```env
# Clé privée de votre wallet (format base58)
PRIVATE_KEY=votre_clé_privée_ici

# RPC endpoint Solana
RPC_URL=https://api.mainnet-beta.solana.com

# Wallets cibles à surveiller (séparés par des virgules)
TARGET_WALLETS=J9iBfpASd7JN7EbgXV9Xy2uswjkrYdjbpLAcoEShZbKv,ES7SCKzTHLikrtMhbnESYEVrUfoMW7sCAnhHeowiWcaX

# Configuration Micro-Sniper
BUY_AMOUNT_SOL=0.0004
MAX_BUY_AMOUNT_SOL=0.0005
MIN_BUY_AMOUNT_SOL=0.0003
TAKE_PROFIT_PERCENTAGE=20
STOP_LOSS_PERCENTAGE=15

# Filtres Micro-Sniper
MAX_MARKET_CAP=15000
MIN_HOLDERS=5
MAX_HOLDERS=10
MIN_VOLUME_5MIN=8000
MAX_TOKEN_AGE_SECONDS=60
MAX_MARKET_CAP_HARD=300000

# Performance
SLIPPAGE_PERCENTAGE=10
DELAY_MS=200
MONITOR_INTERVAL_MS=1000
TRANSACTION_PRIORITY_MICROLAMPORTS=100000
POSITION_CHECK_INTERVAL_MS=1000

# API Optionnelle
SOLSCAN_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjcmVhdGVkQXQiOjE3NzEzMjk2NTA0MjAsImVtYWlsIjoicGVhbG1hbjE1M0BnbWFpbC5jb20iLCJhY3Rpb24iOiJ0b2tlbi1hcGkiLCJhcGlWZXJzaW9uIjoidjIiLCJpYXQiOjE3NzEzMjk2NTB9.P6xjMgo6uXnN28MgEAlxQRd2H-Abq9WoVyRUJAmC9oE
```

## 🚀 Déploiement sur Render

1. **Allez sur votre dashboard Render**
2. **Créez un nouveau Service**
3. **Connectez votre dépôt GitHub**
4. **Configurez les variables d'environnement** dans "Environment"
5. **Déployez** avec `npm start`

## ⚠️ Important

- **Ne jamais** partager votre `PRIVATE_KEY` publiquement
- **Utilisez** un wallet dédié avec peu de SOL
- **Testez** d'abord avec de petits montants
- **Surveillez** les logs en temps réel

## 🔍 Résolution des erreurs

Si vous avez l'erreur `PRIVATE_KEY est requis` :
1. Ajoutez la variable `PRIVATE_KEY` dans les settings Render
2. Redémarrez le service
3. Vérifiez les logs de build
