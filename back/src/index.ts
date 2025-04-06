import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import { walletMonitor } from './services/sentinel/walletMonitor';
import { taskScheduler } from './services/taskManager/taskScheduler';
import { xummPayloadService } from './services/xummService/xummPayloadService';

// Charger les variables d'environnement
dotenv.config();

// Initialiser l'application Express pour les endpoints de santé uniquement
const app = express();
const PORT = process.env.PORT || 3010;

// Middlewares
app.use(express.json());
app.use(cors());

// Servir les fichiers statiques de documentation
app.use('/docs', express.static('docs'));

// Routes de santé seulement
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Vérifier la connexion avec ElizaOS
app.get('/api/eliza/health', async (req, res) => {
  try {
    const ELIZA_URL = process.env.PUBLIC_ELIZA_URL || 'http://localhost:3001';
    const response = await axios.get(`${ELIZA_URL}/health`);
    res.status(200).json({ 
      status: 'ok', 
      eliza_status: response.status === 200 ? 'connected' : 'error',
      eliza_url: ELIZA_URL
    });
  } catch (error: any) {
    console.error('Error checking ElizaOS health:', error);
    res.status(500).json({ 
      status: 'error', 
      error: error.message,
      eliza_url: process.env.PUBLIC_ELIZA_URL || 'http://localhost:3001'
    });
  }
});

// Démarrer le serveur
const startServer = async () => {
  try {
    // Démarrer le serveur Express
    app.listen(PORT, async () => {
      console.log(`Server running on port ${PORT}`);
      
      // Initialisation des services
      try {
        // Démarrer le wallet monitor
        await walletMonitor.initialize();
        console.log('Wallet monitor started successfully');
        
        // Démarrer le task scheduler
        await taskScheduler.initialize();
        console.log('Task scheduler started successfully');
        
        // Démarrer le service XUMM
        await xummPayloadService.initialize();
        console.log('XUMM payload service started successfully');
      } catch (error) {
        console.error('Failed to start services:', error);
      }
    });
    
    // Gérer l'arrêt gracieux
    process.on('SIGTERM', async () => {
      console.log('SIGTERM signal received: closing HTTP server');
      await walletMonitor.stopService();
      taskScheduler.stopService();
      xummPayloadService.stopService();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      console.log('SIGINT signal received: closing HTTP server');
      await walletMonitor.stopService();
      taskScheduler.stopService();
      xummPayloadService.stopService();
      process.exit(0);
    });
  } catch (error) {
    console.error('Erreur au démarrage du service:', error);
    process.exit(1);
  }
};

startServer(); 