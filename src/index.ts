import config from './config';
import * as express from 'express';
import * as path from 'path';
// import { TelegramService } from './service/telegram';
import apiRoutes from './routes/api';

async function start() {
  console.log('Starting Kairos Trader...');

  // Initialize services
  // const telegramService = new TelegramService(config.TelegramBotToken, config.TelegramChatId);

  try {
    // Set up the web server for the frontend
    const app = express();
    const port = config.ServerPort;

    // Serve static files
    app.use(express.static(path.join(__dirname, '../public')));

    // Use API routes
    app.use('/api', apiRoutes);

    // Start server
    app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
      // telegramService.sendMessage(
      //   `🚀 Kairos Trader started! View consolidation analysis at http://localhost:${port}`,
      // );
    });
  } catch (error) {
    console.error('Failed to analyze data:', error);
    // telegramService.sendMessage(`❌ Error: ${error.message}`);
    throw error;
  }
}

// Start the application
start().catch((error) => {
  console.error('Application error:', error);
  process.exit(1);
});
