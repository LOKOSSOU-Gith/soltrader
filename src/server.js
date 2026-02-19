const MemecoinBot = require('./index');

class BotWithDashboard {
  constructor() {
    this.bot = new MemecoinBot();
  }

  async start() {
    // Démarrer le bot
    await this.bot.start();
    
    // Démarrer le dashboard sur le port Render
    const port = process.env.PORT || 3000;
    const express = require('express');
    const cors = require('cors');
    const app = express();
    const path = require('path');
    
    // Middleware
    app.use(cors());
    app.use(express.json());
    
    // Servir le dashboard
    app.use(express.static(path.join(__dirname, '..')));
    app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, '..', 'dashboard.html'));
    });
    
    // API endpoints
    app.get('/api/status', async (req, res) => {
      try {
        const status = await this.bot.getStatus();
        res.json(status);
      } catch (error) {
        res.json({ isRunning: false, error: error.message });
      }
    });
    
    app.get('/api/positions', (req, res) => {
      try {
        if (this.bot && this.bot.positionManager) {
          const positions = this.bot.positionManager.getOpenPositions();
          const stats = this.bot.positionManager.getDailyStats();
          res.json({ positions, stats });
        } else {
          res.json({ positions: [], stats: {} });
        }
      } catch (error) {
        res.json({ positions: [], stats: {}, error: error.message });
      }
    });
    
    app.listen(port, () => {
      console.log(`🌐 Dashboard ready on port ${port}`);
    });
  }
}

// Démarrer le bot avec dashboard
const botWithDashboard = new BotWithDashboard();
botWithDashboard.start().catch(console.error);
