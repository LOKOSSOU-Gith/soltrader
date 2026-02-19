# 🚀 Déploiement Render - Guide Complet

## ✅ Solution au problème de déploiement

Le problème était que Render attend un serveur web qui écoute sur le port `PORT`, mais le bot seul ne fournit pas de serveur HTTP.

## 🔧 Modifications apportées

### 1. **Nouveau fichier `src/server.js`**
- Combine le bot + dashboard web
- Sert le dashboard sur le port Render
- API endpoints pour monitoring

### 2. **Script `npm start` modifié**
- Avant: `node src/index.js` (bot seul)
- Maintenant: `node src/server.js` (bot + dashboard)

### 3. **Variables d'environnement requises**

Ajoutez ces variables dans votre service Render :

```
NODE_ENV=production
PORT=3000
PRIVATE_KEY=3V7Wv5KQpYsYFkgwEFYodtLC4d38iqQrhHHv2TJQu3tVzcFgw8mkrV3xhvc8Z7Nb4fA5sASApBRNb5WQ17N5UasH
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

## 🎯 Étapes de déploiement

1. **Configurez les variables** ci-dessus dans Render
2. **Redémarrez le service** (Manual Deploy)
3. **Vérifiez les logs** - vous devriez voir :
   ```
   🌐 Dashboard ready on port 3000
   ✅ Bot Micro-Sniper démarré avec succès!
   ```
4. **Accédez au dashboard** : `https://votre-app.onrender.com`

## 📊 Avantages de cette solution

- ✅ **Déploiement réussi** : Serveur web détecté par Render
- ✅ **Dashboard accessible** : Interface web complète
- ✅ **Bot fonctionnel** : Trading automatique actif
- ✅ **Monitoring temps réel** : API endpoints disponibles
- ✅ **Logs unifiés** : Tout dans les logs Render

## 🔍 Vérification

Après déploiement, testez :
- Dashboard: `https://votre-app.onrender.com`
- API: `https://votre-app.onrender.com/api/status`
- Bot: Vérifiez les logs pour "Bot Micro-Sniper démarré"

Le bot devrait maintenant fonctionner parfaitement sur Render ! 🚀
