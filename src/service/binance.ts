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
      const timeframe = this.convertInterval(interval);

      // CCXT has limitations for how much data it can fetch at once
      // Break it down into chunks of days to ensure we get all the data
      const chunkSize = 30; // Fetch 30 days at a time
      const totalChunks = Math.ceil(days / chunkSize);

      console.log(`Fetching ${days} days of historical data in ${totalChunks} chunks...`);

      let allCandles: any[][] = [];
      let currentEndTime = endTime;
      let currentStartTime: number;

      // Fetch data in chunks, from newest to oldest
      for (let i = 0; i < totalChunks; i++) {
        // Calculate the time range for this chunk
        currentStartTime = Math.max(startTime, currentEndTime - chunkSize * 24 * 60 * 60 * 1000);

        console.log(
          `Chunk ${i + 1}/${totalChunks}: Fetching from ${new Date(
            currentStartTime,
          ).toISOString()} to ${new Date(currentEndTime).toISOString()}`,
        );

        // Add a small retry mechanism
        let retries = 3;
        let chunkData: any[][] = [];

        while (retries > 0) {
          try {
            // Fetch OHLCV data for this chunk
            chunkData = await this.exchange.fetchOHLCV(
              symbol,
              timeframe,
              currentStartTime,
              1000, // Explicitly set a limit to maximize data
              { endTime: currentEndTime },
            );
            break; // Success, exit retry loop
          } catch (error) {
            retries--;
            if (retries === 0) throw error;
            console.log(`Error fetching chunk ${i + 1}, retrying... (${retries} attempts left)`);
            await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second before retry
          }
        }

        if (chunkData.length === 0) {
          console.log(`Warning: No data returned for chunk ${i + 1}`);
        } else {
          console.log(`Received ${chunkData.length} candles for chunk ${i + 1}`);
          console.log(
            `  Range: ${new Date(chunkData[0][0]).toISOString()} - ${new Date(
              chunkData[chunkData.length - 1][0],
            ).toISOString()}`,
          );

          // Merge this chunk with our accumulated data
          allCandles = [...allCandles, ...chunkData];

          // Update the end time for the next chunk to be just before the start of this chunk
          // Subtract 1ms to avoid duplicate candles
          currentEndTime = chunkData[0][0] - 1;
        }

        // Check if we've reached or gone past the desired start time
        if (currentStartTime <= startTime) {
          break;
        }

        // Add a small delay to avoid rate limits
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // Sort candles by timestamp (oldest to newest)
      allCandles.sort((a, b) => a[0] - b[0]);

      // Remove potential duplicates (by timestamp)
      const uniqueCandles: any[][] = [];
      const timestamps = new Set();

      for (const candle of allCandles) {
        if (!timestamps.has(candle[0])) {
          timestamps.add(candle[0]);
          uniqueCandles.push(candle);
        }
      }

      console.log(
        `Total data fetched: ${uniqueCandles.length} candles from ${new Date(
          uniqueCandles[0][0],
        ).toISOString()} to ${new Date(uniqueCandles[uniqueCandles.length - 1][0]).toISOString()}`,
      );

      // Convert the CCXT format to our KlineData format
      return uniqueCandles.map((candle) => ({
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
