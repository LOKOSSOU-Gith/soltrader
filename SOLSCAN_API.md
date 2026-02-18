# 🔑 Configuration de l'API Solscan

## 📋 Obtenir une clé API Solscan

### 1. Créer un compte Solscan
- Allez sur [https://solscan.io/](https://solscan.io/)
- Créez un compte gratuit

### 2. Obtenir la clé API
- Connectez-vous à votre compte
- Allez dans [Developer Dashboard](https://solscan.io/developer)
- Créez une nouvelle clé API
- Copiez votre clé API

### 3. Configurer la clé dans le bot
Dans le fichier `.env` :
```env
SOLSCAN_API_KEY=votre_clé_api_ici
```

## 📊 Limites de l'API

### **Sans clé API (gratuit)**
- **100 requêtes/minute**
- **Limitations** sur certaines endpoints
- **Pas de priorité**

### **Avec clé API (gratuit)**
- **1000 requêtes/minute**
- **Accès complet** aux endpoints
- **Priorité normale**

### **Avec clé API (payant)**
- **5000+ requêtes/minute**
- **Accès premium**
- **Support prioritaire**

## 🚀 Avantages de l'API Solscan

### **🔍 Données enrichies**
- **Transactions détaillées**
- **Informations sur les tokens**
- **Prix en temps réel**
- **Volume et liquidité**

### **⚡ Performance**
- **Plus rapide** que les RPC publics
- **Moins d'erreurs** 429
- **Données fiables**
- **Historique complet**

### **📊 Monitoring avancé**
- **Token transfers** directs
- **Transaction parsing** intelligent
- **Détection d'achats** précise
- **Statistiques détaillées**

## 🔧 Configuration recommandée

### **Pour usage modéré**
```env
SOLSCAN_API_KEY=votre_clé_api_gratuite
MONITOR_INTERVAL_MS=5000
```

### **Pour usage intensif**
```env
SOLSCAN_API_KEY=votre_clé_api_premium
MONITOR_INTERVAL_MS=1000
```

## 📈 Endpoints utilisés par le bot

### **Monitoring**
- `/account/transactions` - Transactions du compte
- `/account/tokenTransfers` - Transferts de tokens
- `/transaction` - Détails transaction

### **Token info**
- `/token/meta` - Métadonnées du token
- `/token/price` - Prix du token
- `/account/tokens` - Tokens du compte

## 🛡️ Sécurité

### **🔐 Protégez votre clé API**
- **Ne partagez jamais** votre clé API
- **Utilisez des variables d'environnement**
- **Ne commitez pas** la clé dans Git

### **🔄 Rotation**
- **Changez votre clé** régulièrement
- **Surveillez l'utilisation** de votre API
- **Révoquez les clés** inutilisées

## 🚨 Dépannage

### **Erreurs communes**
```
❌ Erreur: 429 Too Many Requests
→ Solution: Augmentez MONITOR_INTERVAL_MS ou utilisez une clé API
```

```
❌ Erreur: Invalid API key
→ Solution: Vérifiez votre clé API dans le .env
```

```
❌ Erreur: Rate limit exceeded
→ Solution: Attendez la fin de la fenêtre de rate limit
```

### **Monitoring de l'utilisation**
Le bot affiche automatiquement :
```
📊 Limites: 850/1000 requêtes restantes
```

## 💡 Conseils

### **Optimisation**
- **Utilisez une clé API** pour plus de requêtes
- **Cache intelligent** pour éviter les doublons
- **Backup RPC** en cas de panne Solscan

### **Performance**
- **Solscan API** est plus rapide que les RPC
- **Données plus fiables** et complètes
- **Moins d'erreurs** de connexion

### **Coûts**
- **Version gratuite** suffisante pour la plupart des usages
- **Version payante** pour le trading haute fréquence
- **ROI positif** avec moins d'erreurs 429

## 🔗 Liens utiles

- [Documentation Solscan API](https://docs.solscan.io/)
- [Developer Dashboard](https://solscan.io/developer)
- [Pricing](https://solscan.io/pricing)
- [Support](https://solscan.io/support)
