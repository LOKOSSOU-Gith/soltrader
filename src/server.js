const MemecoinBot = require('./index');

class BotWithDashboard {
  constructor() {
    this.bot = new MemecoinBot();
    this.dashboardServer = require('./dashboardServer');
  }

  async start() {
    // Démarrer le bot
    await this.bot.start();
    
    // Démarrer le dashboard sur le port Render
    const port = process.env.PORT || 3000;
    const express = require('express');
    const app = express();
    const path = require('path');
    
    // Servir le dashboard
    app.use(express.static(path.join(__dirname)));
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
    
    app.listen(port, () => {
      console.log(`🌐 Dashboard ready on port ${port}`);
    });
  }
}

// Démarrer le bot avec dashboard
const botWithDashboard = new BotWithDashboard();
botWithDashboard.start().catch(console.error);
