# 🤖 Bot Solana Memecoin Trader

Bot de trading automatique pour Solana qui surveille un wallet cible et achète automatiquement les mêmes memecoins.

## ⚠️ AVERTISSEMENT

Ce bot est à des fins éducatives uniquement. Le trading de cryptomonnaies comporte des risques élevés. Ne tradez jamais avec de l'argent que vous ne pouvez pas vous permettre de perdre.

## 🚀 Fonctionnalités

- **Surveillance en temps réel**: Monitor les transactions d'un wallet spécifique
- **Achat automatique**: Achète automatiquement les tokens achetés par le wallet cible
- **Gestion des erreurs**: Robuste gestion des erreurs et retries
- **Configuration flexible**: Paramètres configurables via fichier .env
- **Sécurité**: Protection contre les achats en double

## 📋 Prérequis

- Node.js 16+
- Un wallet Solana avec des SOL
- Clé RPC (optionnel, pour de meilleures performances)

## 🛠️ Installation

1. **Cloner le projet**
```bash
git clone <repository-url>
cd solana-memecoin-bot
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configurer le bot**
```bash
cp .env.example .env
```

4. **Éditer le fichier `.env`**
```env
# Clé privée de votre wallet (format base58)
PRIVATE_KEY=votre_clé_privée_ici

# RPC endpoint (utilisez un endpoint rapide pour de meilleures performances)
RPC_URL=https://api.mainnet-beta.solana.com

# Wallet cible à surveiller
TARGET_WALLET=adresse_du_wallet_cible

# Montant d'achat en SOL
BUY_AMOUNT_SOL=0.01

# Slippage tolerance en pourcentage
SLIPPAGE_PERCENTAGE=10

# Délai après détection (ms)
DELAY_MS=1000
```

## 🎯 Utilisation

### Démarrer le bot
```bash
npm start
```

### Mode développement
```bash
npm run dev
```

### Arrêter le bot
Utilisez `Ctrl+C` pour arrêter proprement le bot.

## ⚙️ Configuration

### Variables d'environnement

| Variable | Description | Défaut |
|----------|-------------|--------|
| `PRIVATE_KEY` | Clé privée de votre wallet Solana | Requis |
| `TARGET_WALLET` | Adresse du wallet à surveiller | Requis |
| `BUY_AMOUNT_SOL` | Montant en SOL à acheter par transaction | 0.01 |
| `SLIPPAGE_PERCENTAGE` | Tolérance de slippage en % | 10 |
| `DELAY_MS` | Délai après détection avant achat | 1000 |
| `RPC_URL` | Endpoint RPC Solana | Mainnet public |

## 🔧 Fonctionnement

1. **Surveillance**: Le bot surveille en continu les transactions du wallet cible
2. **Détection**: Lorsqu'un achat de token est détecté, le bot analyse la transaction
3. **Analyse**: Vérification de la liquidité et des informations du token
4. **Achat**: Exécute un achat automatique du même token
5. **Confirmation**: Vérifie la transaction et affiche le résultat

## 🛡️ Sécurité

- **Jamais partager votre clé privée**
- **Utiliser un wallet dédié** avec seulement les fonds nécessaires
- **Tester sur mainnet avec de petits montants**
- **Surveiller les transactions** régulièrement

## 📊 Exemples de sortie

```
🤖 Bot Solana initialisé avec succès
📍 Wallet public: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
🎯 Wallet cible: 9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM
💰 Montant d'achat: 0.01 SOL
💳 Solde actuel: 1.5 SOL
🚀 Démarrage du bot de trading...

🎯 Achat détecté: 1000000 tokens (EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v)
📝 Transaction: 5KJp7z3Qf7Qf8Qf7Qf8Qf7Qf8Qf7Qf8Qf7Qf8Qf7Qf8Qf7Qf8Qf7Qf8Qf7Qf8
✅ Achat réussi! Signature: 3LmN9p4Rg8Rg8Rg8Rg8Rg8Rg8Rg8Rg8Rg8Rg8Rg8Rg8Rg8Rg8Rg8
💰 Nouveau solde token: 1000000
```

## 🐛 Dépannage

### Erreurs communes

1. **"PRIVATE_KEY est requis"**
   - Vérifiez que votre fichier .env contient bien votre clé privée

2. **"Solde insuffisant"**
   - Vérifiez que votre wallet a assez de SOL pour les achats

3. **"Pool Raydium non trouvé"**
   - Le token n'est peut-être pas disponible sur Raydium

4. **Connexion RPC lente**
   - Utilisez un endpoint RPC privé pour de meilleures performances

## 📝 Notes importantes

- Le bot utilise actuellement Raydium comme DEX principal
- L'intégration avec Jupiter aggregator peut améliorer les taux d'échange
- Les transactions peuvent échouer en raison de la volatilité ou du manque de liquidité

## 🤝 Contribuer

Les contributions sont les bienvenues! N'hésitez pas à ouvrir des issues ou des pull requests.

## 📄 Licence

MIT License - voir le fichier LICENSE pour les détails.

## ⚠️ Disclaimer

Ce logiciel est fourni "en l'état", sans aucune garantie. L'utilisation de ce bot pour le trading de cryptomonnaies comporte des risques financiers importants. Vous êtes seul responsable de vos pertes éventuelles.
