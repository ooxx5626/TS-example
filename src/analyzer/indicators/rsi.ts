export class RSI {
  private period: number;

  constructor(period = 14) {
    this.period = period;
  }

  /**
   * 計算RSI值
   * @param prices 收盤價格數組
   * @returns RSI值數組
   */
  calculate(prices: number[]): number[] {
    if (prices.length < this.period + 1) {
      return [];
    }

    const rsiValues: number[] = [];
    let gains = 0;
    let losses = 0;

    // 計算初始平均增益和損失
    for (let i = 1; i <= this.period; i++) {
      const difference = prices[i] - prices[i - 1];
      if (difference >= 0) {
        gains += difference;
      } else {
        losses -= difference;
      }
    }

    // 計算初始平均值
    let avgGain = gains / this.period;
    let avgLoss = losses / this.period;

    // 計算第一個RSI值
    let rs = avgGain / (avgLoss === 0 ? 0.001 : avgLoss); // 避免除以零
    let rsi = 100 - 100 / (1 + rs);
    rsiValues.push(rsi);

    // 計算剩餘的RSI值
    for (let i = this.period + 1; i < prices.length; i++) {
      const difference = prices[i] - prices[i - 1];
      let currentGain = 0;
      let currentLoss = 0;

      if (difference >= 0) {
        currentGain = difference;
      } else {
        currentLoss = -difference;
      }

      // 運用移動平均更新平均增益和損失
      avgGain = (avgGain * (this.period - 1) + currentGain) / this.period;
      avgLoss = (avgLoss * (this.period - 1) + currentLoss) / this.period;

      rs = avgGain / (avgLoss === 0 ? 0.001 : avgLoss);
      rsi = 100 - 100 / (1 + rs);
      rsiValues.push(rsi);
    }

    return rsiValues;
  }
}
