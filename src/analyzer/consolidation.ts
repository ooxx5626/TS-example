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

interface ConsolidationResult {
  hourlyHeatmap: number[][]; // 7x24 array for day of week vs hour
  hourOfDay: number[]; // 24 array for hour of day consolidation score
  dayOfWeek: number[]; // 7 array for day of week consolidation score
  rawData: any[]; // Raw data for custom visualization
}

export class ConsolidationAnalyzer {
  /**
   * Analyzes historical data to identify periods of consolidation
   * @param data Historical kline data
   * @returns Analysis results including heatmap data
   */
  analyzeConsolidation(data: KlineData[]): ConsolidationResult {
    // Initialize result structures
    const hourlyHeatmap = Array(7)
      .fill(0)
      .map(() => Array(24).fill(0));
    const hourOfDay = Array(24).fill(0);
    const dayOfWeek = Array(7).fill(0);
    const rawData = [];

    // Track data points per time slot for averaging
    const dataPointsPerHourDay = Array(7)
      .fill(0)
      .map(() => Array(24).fill(0));
    const dataPointsPerHour = Array(24).fill(0);
    const dataPointsPerDay = Array(7).fill(0);

    // Define metrics for consolidation (low volatility periods)
    for (let i = 1; i < data.length; i++) {
      const candle = data[i];
      const prevCandle = data[i - 1];

      // Calculate price metrics
      const high = parseFloat(candle.high);
      const low = parseFloat(candle.low);
      const close = parseFloat(candle.close);
      const prevClose = parseFloat(prevCandle.close);

      // Calculate volatility as percentage
      const volatility = ((high - low) / low) * 100;
      const priceChange = (Math.abs(close - prevClose) / prevClose) * 100;

      // Lower volatility means more consolidation (invert for heatmap)
      const consolidationScore = 100 - (volatility + priceChange * 2);

      // Get time details
      const date = new Date(candle.openTime);
      const dayOfWeekIndex = date.getUTCDay(); // 0-6 (Sunday-Saturday)
      const hourOfDayIndex = date.getUTCHours(); // 0-23

      // Update heatmap data
      hourlyHeatmap[dayOfWeekIndex][hourOfDayIndex] += consolidationScore;
      dataPointsPerHourDay[dayOfWeekIndex][hourOfDayIndex]++;

      // Update hourly aggregates
      hourOfDay[hourOfDayIndex] += consolidationScore;
      dataPointsPerHour[hourOfDayIndex]++;

      // Update daily aggregates
      dayOfWeek[dayOfWeekIndex] += consolidationScore;
      dataPointsPerDay[dayOfWeekIndex]++;

      // Store raw data point for detailed analysis
      rawData.push({
        timestamp: candle.openTime,
        dayOfWeek: dayOfWeekIndex,
        hourOfDay: hourOfDayIndex,
        consolidationScore,
        volatility,
        priceChange,
      });
    }

    // Calculate averages for the heatmap
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        if (dataPointsPerHourDay[day][hour] > 0) {
          hourlyHeatmap[day][hour] /= dataPointsPerHourDay[day][hour];
        }
      }

      if (dataPointsPerDay[day] > 0) {
        dayOfWeek[day] /= dataPointsPerDay[day];
      }
    }

    for (let hour = 0; hour < 24; hour++) {
      if (dataPointsPerHour[hour] > 0) {
        hourOfDay[hour] /= dataPointsPerHour[hour];
      }
    }

    return {
      hourlyHeatmap,
      hourOfDay,
      dayOfWeek,
      rawData,
    };
  }
}
