# 🔧 Configuration pour Render

Variables d'environnement requises pour le déploiement sur Render :

## 📋 Variables Essentielles

Copiez-collez ces variables directement dans les **Environment Variables** de votre service Render :

```
NODE_ENV=production
PRIVATE_KEY=votre_clé_privée_ici
TARGET_WALLETS=J9iBfpASd7JN7EbgXV9Xy2uswjkrYdjbpLAcoEShZbKv,ES7SCKzTHLikrtMhbnESYEVrUfoMW7sCAnhHeowiWcaX
BUY_AMOUNT_SOL=0.0004
MAX_BUY_AMOUNT_SOL=0.0005
MIN_BUY_AMOUNT_SOL=0.0003
TAKE_PROFIT_PERCENTAGE=20
STOP_LOSS_PERCENTAGE=15
MAX_MARKET_CAP=15000
MIN_HOLDERS=5
MAX_HOLDERS=10
MIN_VOLUME_5MIN=8000
MAX_TOKEN_AGE_SECONDS=60
MAX_MARKET_CAP_HARD=300000
SLIPPAGE_PERCENTAGE=10
DELAY_MS=200
MONITOR_INTERVAL_MS=1000
TRANSACTION_PRIORITY_MICROLAMPORTS=100000
POSITION_CHECK_INTERVAL_MS=1000
SOLSCAN_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjcmVhdGVkQXQiOjE3NzEzMjk2NTA0MjAsImVtYWlsIjoicGVhbG1hbjE1M0BnbWFpbC5jb20iLCJhY3Rpb24iOiJ0b2tlbi1hcGkiLCJhcGlWZXJzaW9uIjoidjIiLCJpYXQiOjE3NzEzMjk2NTB9.P6xjMgo6uXnN28MgEAlxQRd2H-Abq9WoVyRUJAmC9oE
```

## 🚀 Déploiement sur Render

1. **Allez sur votre dashboard Render**
2. **Ouvrez votre service soltrader**
3. **Section "Environment"**
4. **Ajoutez toutes les variables** ci-dessus
5. **Redémarrez le service**

## ⚠️ TRÈS IMPORTANT

- **NODE_ENV=production** est OBLIGATOIRE
- **PRIVATE_KEY** doit être votre vraie clé privée
- **Ne jamais** partager votre clé privée publiquement
- **Utilisez** un wallet dédié avec peu de SOL

## 🔍 Résolution des erreurs

Si vous avez encore l'erreur `PRIVATE_KEY est requis` :
1. Vérifiez que `NODE_ENV=production` est bien configuré
2. Vérifiez que `PRIVATE_KEY` est correctement configuré
3. Redémarrez complètement le service Render
4. Vérifiez les logs en temps réel
