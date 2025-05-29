import { Router } from 'express';
import config from '../config';
import { BinanceService } from '../service/binance';
import { ConsolidationAnalyzer } from '../analyzer/consolidation';
import { TradingSignalGenerator } from '../analyzer/trading-signals';

const router = Router();
const binanceService = new BinanceService();
const analyzer = new ConsolidationAnalyzer();
const signalGenerator = new TradingSignalGenerator({
  consolidationThreshold: 96,
  breakoutPercentage: 0.8,
  rsiOverBought: 70,
  rsiOverSold: 30,
});

// API endpoint to get analysis data with days parameter
router.get('/consolidation-data', async (req, res) => {
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

// API endpoint to get trading signals
router.get('/trading-signals', async (req, res) => {
  try {
    // Get days parameter
    const days = parseInt(req.query.days as string) || 180;
    const safeDays = Math.min(Math.max(days, 7), 365);

    console.log(`Fetching historical data for signals over last ${safeDays} days...`);
    const symbol = config.DefaultSymbol || 'BTCUSDT';
    const historicalData = await binanceService.getHistoricalKlines(symbol, '1h', safeDays);

    // Analyze consolidation
    const analysisResults = analyzer.analyzeConsolidation(historicalData);

    // Generate trading signals
    const signals = signalGenerator.generateSignals(historicalData, analysisResults.rawData);

    // Include price data for the chart
    const priceData = historicalData.map((kline) => ({
      timestamp: kline.openTime,
      open: parseFloat(kline.open),
      high: parseFloat(kline.high),
      low: parseFloat(kline.low),
      close: parseFloat(kline.close),
    }));

    res.json({
      signals,
      priceData,
      summary: {
        buySignals: signals.filter((s) => s.type === 'BUY').length,
        sellSignals: signals.filter((s) => s.type === 'SELL').length,
        highConfidenceSignals: signals.filter((s) => s.confidence > 90).length,
      },
    });
  } catch (error) {
    console.error('Error generating trading signals:', error);
    res.status(500).json({ error: error.message });
  }
});

// New API endpoint to get kline data
router.get('/kline-data', async (req, res) => {
  try {
    // Get days parameter
    const days = parseInt(req.query.days as string) || 180;
    const safeDays = Math.min(Math.max(days, 7), 365);

    console.log(`Fetching kline data for last ${safeDays} days...`);
    const symbol = config.DefaultSymbol || 'BTCUSDT';
    const klineData = await binanceService.getHistoricalKlines(symbol, '1h', safeDays);

    res.json(klineData);
  } catch (error) {
    console.error('Error fetching kline data:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
