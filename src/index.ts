import config from './config';
import * as express from 'express';
import * as path from 'path';
import { BinanceService } from './service/binance';
import { ConsolidationAnalyzer } from './analyzer/consolidation';
import { TelegramService } from './service/telegram';

async function start() {
  console.log('Starting Kairos Trader...');

  // Initialize services
  // const telegramService = new TelegramService(config.TelegramBotToken, config.TelegramChatId);
  const binanceService = new BinanceService();
  const analyzer = new ConsolidationAnalyzer();

  try {
    // Set up the web server for the frontend
    const app = express();
    const port = config.ServerPort;

    // Serve static files
    app.use(express.static(path.join(__dirname, '../public')));

    // API endpoint to get analysis data with days parameter
    app.get('/api/consolidation-data', async (req, res) => {
      try {
        // Get days from query parameter, default to 180 if not provided
        const days = parseInt(req.query.days as string) || 180;

        // Limit to reasonable values
        const safeDays = Math.min(Math.max(days, 7), 365);

        console.log(`Fetching historical data for last ${safeDays} days...`);
        const symbol = config.DefaultSymbol || 'BTCUSDT';
        const historicalData = await binanceService.getHistoricalKlines(symbol, '1h', safeDays);

        // Analyze periods of consolidation
        console.log('Analyzing consolidation periods...');
        const analysisResults = analyzer.analyzeConsolidation(historicalData);

        res.json(analysisResults);
      } catch (error) {
        console.error('Error processing data request:', error);
        res.status(500).json({ error: error.message });
      }
    });

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
