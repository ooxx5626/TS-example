import * as ccxt from 'ccxt';

interface KlineData {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
  quoteAssetVolume: string;
  trades: number;
  takerBuyBaseAssetVolume: string;
  takerBuyQuoteAssetVolume: string;
}

export class BinanceService {
  private exchange: ccxt.binance;

  constructor() {
    this.exchange = new ccxt.binance({
      enableRateLimit: true,
      options: {
        defaultType: 'spot',
      },
    });
  }

  /**
   * Get historical kline (candlestick) data from Binance
   * @param symbol Trading pair symbol (e.g., 'BTCUSDT')
   * @param interval Candlestick interval (e.g., '1h', '4h', '1d')
   * @param days Number of days to fetch
   * @returns Processed kline data
   */
  async getHistoricalKlines(symbol: string, interval: string, days: number): Promise<KlineData[]> {
    try {
      const endTime = Date.now();
      const startTime = endTime - days * 24 * 60 * 60 * 1000; // days in ms

      // CCXT requires timeframe in a specific format
      const timeframe = this.convertInterval(interval);

      // Fetch OHLCV data from CCXT
      const ohlcv = await this.exchange.fetchOHLCV(
        symbol,
        timeframe,
        startTime,
        undefined, // limit will be handled by CCXT internally
        {
          endTime: endTime,
        },
      );

      // Convert the CCXT format to our KlineData format
      return ohlcv.map((candle) => ({
        openTime: candle[0], // timestamp
        open: candle[1].toString(), // open
        high: candle[2].toString(), // high
        low: candle[3].toString(), // low
        close: candle[4].toString(), // close
        volume: candle[5].toString(), // volume
        closeTime: candle[0] + this.getIntervalMs(timeframe), // estimate close time
        quoteAssetVolume: '0', // not directly provided by CCXT
        trades: 0, // not directly provided by CCXT
        takerBuyBaseAssetVolume: '0', // not directly provided by CCXT
        takerBuyQuoteAssetVolume: '0', // not directly provided by CCXT
      }));
    } catch (error) {
      console.error('Error fetching data with CCXT:', error);
      throw new Error(`Failed to fetch data with CCXT: ${error.message}`);
    }
  }

  /**
   * Convert Binance interval format to CCXT timeframe format
   */
  private convertInterval(interval: string): string {
    // Common mappings from Binance to CCXT
    const mappings: Record<string, string> = {
      '1m': '1m',
      '3m': '3m',
      '5m': '5m',
      '15m': '15m',
      '30m': '30m',
      '1h': '1h',
      '2h': '2h',
      '4h': '4h',
      '6h': '6h',
      '8h': '8h',
      '12h': '12h',
      '1d': '1d',
      '3d': '3d',
      '1w': '1w',
      '1M': '1M',
    };

    if (!mappings[interval]) {
      throw new Error(`Unsupported interval: ${interval}`);
    }

    return mappings[interval];
  }

  /**
   * Calculate milliseconds for a given interval
   */
  private getIntervalMs(timeframe: string): number {
    const unit = timeframe.slice(-1);
    const value = parseInt(timeframe.slice(0, -1));

    switch (unit) {
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      case 'w':
        return value * 7 * 24 * 60 * 60 * 1000;
      case 'M':
        return value * 30 * 24 * 60 * 60 * 1000; // approximation
      default:
        return 0;
    }
  }
}
