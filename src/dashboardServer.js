const express = require('express');
const path = require('path');
const cors = require('cors');

class DashboardServer {
  constructor(bot) {
    this.app = express();
    this.bot = bot;
    this.port = process.env.PORT || 3000;
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.static(path.join(__dirname)));
  }

  setupRoutes() {
    // Page principale du dashboard
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'dashboard.html'));
    });

    // API pour obtenir le statut du bot
    this.app.get('/api/status', async (req, res) => {
      try {
        if (this.bot) {
          const status = await this.bot.getStatus();
          res.json(status);
        } else {
          res.json({
            isRunning: false,
            error: 'Bot non initialisé'
          });
        }
      } catch (error) {
        res.json({
          isRunning: false,
          error: error.message
        });
      }
    });

    // API pour obtenir les positions
    this.app.get('/api/positions', (req, res) => {
      try {
        if (this.bot && this.bot.positionManager) {
          const positions = this.bot.positionManager.getOpenPositions();
          const stats = this.bot.positionManager.getDailyStats();
          res.json({
            positions,
            stats
          });
        } else {
          res.json({
            positions: [],
            stats: {
              dailyTrades: 0,
              dailyPnL: 0,
              openPositions: 0,
              totalValue: 0,
              unrealizedPnL: 0
            }
          });
        }
      } catch (error) {
        res.json({
          positions: [],
          stats: {},
          error: error.message
        });
      }
    });

    // API pour obtenir les logs (simulation)
    this.app.get('/api/logs', (req, res) => {
      const logs = [
        {
          timestamp: new Date().toISOString(),
          level: 'info',
          message: '🤖 Bot Solana Micro-Sniper 0.0015 SOL initialisé'
        },
        {
          timestamp: new Date().toISOString(),
          level: 'success',
          message: '📍 Wallet public: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU'
        },
        {
          timestamp: new Date().toISOString(),
          level: 'info',
          message: '🎯 Wallets cibles (2): J9iBfpASd7JN7..., ES7SCKzTHLikrtMhbnESY...'
        },
        {
          timestamp: new Date().toISOString(),
          level: 'success',
          message: '💰 Position size: 0.0003-0.0005 SOL'
        },
        {
          timestamp: new Date().toISOString(),
          level: 'info',
          message: '🔍 Filtres: MC<15000$, 5-10 holders, Vol5m>8000$'
        }
      ];
      res.json(logs);
    });

    // Démarrer le serveur
    this.app.listen(this.port, () => {
      console.log(`🌐 Dashboard disponible sur http://localhost:${this.port}`);
      console.log(`📊 Statut du bot: http://localhost:${this.port}/api/status`);
      console.log(`💰 Positions: http://localhost:${this.port}/api/positions`);
    });
  }
}

module.exports = DashboardServer;
