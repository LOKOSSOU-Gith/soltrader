# 🔐 Configuration Phantom Wallet

## Étapes pour exporter votre clé privée depuis Phantom

### 1. Ouvrir Phantom Wallet
- Cliquez sur l'extension Phantom dans votre navigateur
- Déverrouillez votre wallet avec votre mot de passe

### 2. Exporter la clé privée
- Cliquez sur les trois points (⋮) en haut à droite
- Sélectionnez "Account Details"
- Cliquez sur "Export private key"
- Entrez votre mot de passe Phantom
- **Copiez la clé privée affichée**

### 3. Format correct de la clé privée
La clé privée doit être au format base58, comme :
```
PRIVATE_KEY=5KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXp2d7P8V8E
```

### 4. Configurer le fichier .env
Créez votre fichier `.env` :
```bash
cp .env.example .env
```

Éditez `.env` avec VRAIES valeurs :
```env
# Votre vraie clé privée Phantom (format base58)
PRIVATE_KEY=votre_clé_privée_phantom_ici

# RPC endpoint
RPC_URL=https://rpc.ankr.com/solana

# Wallet cible à surveiller
TARGET_WALLET=ES7SCKzTHLikrtMhbnESYEVrUfoMW7sCAnhHeowiWcaX

# Montant d'achat en SOL
BUY_AMOUNT_SOL=0.01

# Autres paramètres...
SLIPPAGE_PERCENTAGE=10
DELAY_MS=100
MONITOR_INTERVAL_MS=500
TRANSACTION_PRIORITY_MICROLAMPORTS=50000
COMPUTE_UNIT_LIMIT=200000
```

## ⚠️ SÉCURITÉ IMPORTANTE

- **NE PARTAGEZ JAMAIS votre clé privée**
- Utilisez un **wallet dédié** avec seulement les fonds nécessaires
- **Testez avec de petits montants** d'abord
- Gardez votre clé privée **en sécurité**

## 🔍 Vérification du format

Une clé privée valide :
- Commence par `5`, `K`, ou `L`
- Contient uniquement des caractères alphanumériques
- Longueur d'environ 88 caractères

**Exemple valide** (NE PAS UTILISER) :
```
5KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXp2d7P8V8E
```

**Exemples invalides** :
```
your_private_key_here          # ❌ Texte placeholder
[1,2,3,4,5]               # ❌ Format tableau
0x1234...                   # ❌ Format Ethereum
```

## 🚀 Lancement du bot

Après configuration :
```bash
npm start
```

Le bot devrait démarrer et afficher :
```
🤖 Bot Solana initialisé avec succès
📍 Wallet public: VOTRE_ADRESSE_PUBLIQUE
🎯 Wallet cible: ES7SCKzTHLikrtMhbnESYEVrUfoMW7sCAnhHeowiWcaX
💰 Montant d'achat: 0.01 SOL
```

## 🛑 Si problème persiste

Si vous avez toujours l'erreur "Non-base58 character" :
1. Vérifiez que vous avez bien copié TOUTE la clé privée
2. Assurez-vous qu'il n'y a pas d'espaces ou de caractères spéciaux
3. Réexportez votre clé privée depuis Phantom
4. Contactez-moi pour plus d'aide
