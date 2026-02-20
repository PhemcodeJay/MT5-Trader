import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { MT5Analyzer } from "./services/mt5-analyzer";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Store active WebSocket connections
  const clients = new Set<WebSocket>();
  
  wss.on('connection', (ws) => {
    clients.add(ws);
    console.log('New WebSocket connection established');
    
    // Send initial data
    sendInitialData(ws);
    
    ws.on('close', () => {
      clients.delete(ws);
      console.log('WebSocket connection closed');
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      clients.delete(ws);
    });
  });
  
  // Broadcast to all connected clients
  function broadcast(data: any) {
    const message = JSON.stringify(data);
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }
  
  // Send initial data to new connections
  async function sendInitialData(ws: WebSocket) {
    try {
      const [signals, activeSignal, indicators] = await Promise.all([
        storage.getTradingSignals(10),
        storage.getActiveTradingSignal(),
        storage.getLatestTechnicalIndicators('H1')
      ]);
      
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'INITIAL_DATA',
          data: {
            signals,
            activeSignal,
            indicators
          }
        }));
      }
    } catch (error) {
      console.error('Error sending initial data:', error);
    }
  }
  
  // API Routes
  app.get('/api/signals', async (req, res) => {
    try {
      const signals = await storage.getTradingSignals();
      res.json(signals);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch signals' });
    }
  });
  
  app.get('/api/signals/active', async (req, res) => {
    try {
      const activeSignal = await storage.getActiveTradingSignal();
      res.json(activeSignal);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch active signal' });
    }
  });
  
  app.get('/api/indicators/:timeframe', async (req, res) => {
    try {
      const { timeframe } = req.params;
      const indicators = await storage.getLatestTechnicalIndicators(timeframe);
      res.json(indicators);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch indicators' });
    }
  });
  
  app.post('/api/signals/execute', async (req, res) => {
    try {
      const activeSignal = await storage.getActiveTradingSignal();
      if (!activeSignal) {
        return res.status(400).json({ error: 'No active signal to execute' });
      }
      
      // Simulate trade execution
      const executedSignal = await storage.updateTradingSignal(activeSignal.id, {
        status: 'closed',
        pnl: Math.random() > 0.6 ? Math.random() * 50 : -Math.random() * 30 // Random P&L for simulation
      });
      
      // Broadcast the update
      broadcast({
        type: 'SIGNAL_EXECUTED',
        data: executedSignal
      });
      
      res.json(executedSignal);
    } catch (error) {
      res.status(500).json({ error: 'Failed to execute signal' });
    }
  });
  
  app.get('/api/settings', async (req, res) => {
    try {
      // For simplicity, using a default user ID
      const settings = await storage.getUserSettings('default-user') || {
        riskPercent: 1.5,
        leverage: 20,
        accountBalance: 100,
        theme: 'dark'
      };
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch settings' });
    }
  });
  
  app.put('/api/settings', async (req, res) => {
    try {
      const settings = await storage.updateUserSettings('default-user', req.body);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update settings' });
    }
  });
  
  // Periodic signal generation (simulating MT5 analysis)
  let analysisInterval: NodeJS.Timeout;
  
  function startSignalGeneration() {
    analysisInterval = setInterval(async () => {
      try {
        const newSignal = await MT5Analyzer.analyzeXAUUSD();
        
        if (newSignal) {
          // Close any existing active signal first
          const existingActive = await storage.getActiveTradingSignal();
          if (existingActive) {
            await storage.updateTradingSignal(existingActive.id, {
              status: 'closed',
              pnl: Math.random() > 0.5 ? Math.random() * 30 : -Math.random() * 20
            });
          }
          
          // Create new signal
          const signal = await storage.createTradingSignal(newSignal);
          
          // Broadcast new signal
          broadcast({
            type: 'NEW_SIGNAL',
            data: signal
          });
          
          console.log(`New ${signal.side} signal generated: ${signal.entry} (Score: ${signal.score}%)`);
        }
      } catch (error) {
        console.error('Error generating signal:', error);
      }
    }, 30000); // Generate signals every 30 seconds for demo purposes
  }
  
  // Start periodic analysis
  startSignalGeneration();
  
  // Cleanup on server shutdown
  process.on('SIGTERM', () => {
    if (analysisInterval) {
      clearInterval(analysisInterval);
    }
  });
  
  return httpServer;
}
