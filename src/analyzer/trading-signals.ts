import { RSI } from './indicators/rsi';

interface TradingSignal {
  timestamp: number;
  type: 'BUY' | 'SELL' | 'NEUTRAL';
  confidence: number; // 0-100
  reason: string;
  price: number;
  inConsolidation: boolean; // 新增：標記是否在盤整期間產生的信號
}

export class TradingSignalGenerator {
  // 配置參數
  private consolidationThreshold = 97; // 高盤整分數閾值
  private breakoutPercentage = 0.5; // 突破百分比
  private rsiOverBought = 70;
  private rsiOverSold = 30;
  private rsiPeriod = 14;
  private minConsolidationLength = 5; // 最少盤整K線數
  private volumeBreakoutMultiplier = 1.5; // 成交量突破倍數
  private debug = false; // 調試模式

  constructor(config?: {
    consolidationThreshold?: number;
    breakoutPercentage?: number;
    rsiOverBought?: number;
    rsiOverSold?: number;
    rsiPeriod?: number;
    minConsolidationLength?: number; // 新增
    volumeBreakoutMultiplier?: number; // 新增
    debug?: boolean; // 新增
  }) {
    // 合併默認配置與用戶配置
    if (config) {
      this.consolidationThreshold = config.consolidationThreshold || this.consolidationThreshold;
      this.breakoutPercentage = config.breakoutPercentage || this.breakoutPercentage;
      this.rsiOverBought = config.rsiOverBought || this.rsiOverBought;
      this.rsiOverSold = config.rsiOverSold || this.rsiOverSold;
      this.rsiPeriod = config.rsiPeriod || this.rsiPeriod;
      this.minConsolidationLength = config.minConsolidationLength || this.minConsolidationLength;
      this.volumeBreakoutMultiplier =
        config.volumeBreakoutMultiplier || this.volumeBreakoutMultiplier;
      this.debug = config.debug || this.debug;
    }
  }

  /**
   * 從原始K線數據和盤整分析中生成交易信號
   */
  generateSignals(klineData: any[], consolidationData: any[]): TradingSignal[] {
    // 計算RSI值
    const rsi = new RSI(this.rsiPeriod);
    const closePrices = klineData.map((k) => parseFloat(k.close));
    const rsiValues = rsi.calculate(closePrices);

    const signals: TradingSignal[] = [];
    const debugInfo: any[] = [];

    // 尋找高盤整期間
    let inConsolidation = false;
    let consolidationStart = 0;
    let consolidationLength = 0;
    let highestPrice = 0;
    let lowestPrice = Infinity;
    let avgVolume = 0;

    // 跟踪當前倉位狀態：true表示已持有倉位（已買入），false表示未持有倉位
    let inPosition = false;
    let entryPrice = 0; // 買入價格

    // 計算平均成交量 (用於檢測量增突破)
    const calculateAvgVolume = (start: number, end: number): number => {
      if (start < 0 || end >= klineData.length || start > end) return 0;
      let sum = 0;
      for (let i = start; i <= end; i++) {
        sum += parseFloat(klineData[i].volume);
      }
      return sum / (end - start + 1);
    };

    // 統計用記錄
    let totalSignals = 0;
    let consolidationSignals = 0;

    for (let i = this.rsiPeriod; i < klineData.length; i++) {
      const currentPrice = parseFloat(klineData[i].close);
      const currentRsi = rsiValues[i - this.rsiPeriod];
      const consolidationScore = consolidationData[i]?.consolidationScore || 0;
      const currentVolume = parseFloat(klineData[i].volume);

      // 檢測盤整開始
      if (!inConsolidation && consolidationScore >= this.consolidationThreshold) {
        inConsolidation = true;
        consolidationStart = i;
        consolidationLength = 1;
        highestPrice = currentPrice;
        lowestPrice = currentPrice;
        avgVolume = calculateAvgVolume(Math.max(0, i - 10), i);

        if (this.debug) {
          debugInfo.push({
            index: i,
            action: '檢測到盤整開始',
            price: currentPrice,
            consolidationScore,
          });
        }
      }

      // 盤整期間的價格範圍更新
      if (inConsolidation) {
        consolidationLength++;
        highestPrice = Math.max(highestPrice, currentPrice);
        lowestPrice = Math.min(lowestPrice, currentPrice);

        // 計算價格範圍
        const priceRange = highestPrice - lowestPrice;
        const rangeMidpoint = (highestPrice + lowestPrice) / 2;
        const priceRangePercent = (priceRange / rangeMidpoint) * 100;
        const breakoutThreshold = rangeMidpoint * (this.breakoutPercentage / 100);

        // 驗證盤整有效性 - 如果價格範圍過大，則不是有效盤整
        if (priceRangePercent > 3 && consolidationLength > 3) {
          inConsolidation = false;
          if (this.debug) {
            debugInfo.push({
              index: i,
              action: '盤整無效 - 價格範圍過大',
              priceRangePercent,
              consolidationLength,
            });
          }
          continue;
        }

        // 確保盤整有足夠長度才產生信號
        const validConsolidation = consolidationLength >= this.minConsolidationLength;

        // 識別突破信號 - 根據倉位狀態決定是否產生信號
        const volumeConfirmation = currentVolume > avgVolume * this.volumeBreakoutMultiplier;

        if (currentPrice > highestPrice + breakoutThreshold) {
          // 上突破 + RSI確認 + 成交量確認
          if (currentRsi > 50 && !inPosition && validConsolidation) {
            // 成交量確認突破更可靠
            const confidence = Math.min(
              100,
              consolidationScore + (currentRsi - 50) + (volumeConfirmation ? 15 : 0),
            );

            totalSignals++;
            consolidationSignals++;

            signals.push({
              timestamp: klineData[i].openTime,
              type: 'BUY',
              confidence,
              reason: `上突破盤整區間 + RSI確認(${currentRsi.toFixed(2)})${
                volumeConfirmation ? ' + 量增' : ''
              }`,
              price: currentPrice,
              inConsolidation: true,
            });
            inPosition = true;
            entryPrice = currentPrice;

            if (this.debug) {
              debugInfo.push({
                index: i,
                action: '產生上突破買入信號',
                price: currentPrice,
                rsi: currentRsi,
                volumeIncrease: currentVolume / avgVolume,
                confidence,
              });
            }
          }
          inConsolidation = false;
        } else if (currentPrice < lowestPrice - breakoutThreshold) {
          // 下突破 + RSI確認 + 成交量確認
          if (currentRsi < 50 && inPosition && validConsolidation) {
            const confidence = Math.min(
              100,
              consolidationScore + (50 - currentRsi) + (volumeConfirmation ? 15 : 0),
            );

            totalSignals++;
            consolidationSignals++;

            signals.push({
              timestamp: klineData[i].openTime,
              type: 'SELL',
              confidence,
              reason: `下突破盤整區間 + RSI確認(${currentRsi.toFixed(2)})${
                volumeConfirmation ? ' + 量增' : ''
              }`,
              price: currentPrice,
              inConsolidation: true,
            });
            inPosition = false;

            if (this.debug) {
              debugInfo.push({
                index: i,
                action: '產生下突破賣出信號',
                price: currentPrice,
                rsi: currentRsi,
                volumeIncrease: currentVolume / avgVolume,
                confidence,
              });
            }
          }
          inConsolidation = false;
        }

        // RSI過度買賣區間信號 - 只在有效盤整期產生
        if (inConsolidation && validConsolidation) {
          // 只有未持倉時才產生買入信號
          if (currentRsi <= this.rsiOverSold && !inPosition) {
            totalSignals++;
            consolidationSignals++;

            signals.push({
              timestamp: klineData[i].openTime,
              type: 'BUY',
              confidence: 80 + (this.rsiOverSold - currentRsi),
              reason: `盤整區間RSI超賣(${currentRsi.toFixed(2)})`,
              price: currentPrice,
              inConsolidation: true,
            });
            inPosition = true;
            entryPrice = currentPrice;

            if (this.debug) {
              debugInfo.push({
                index: i,
                action: '產生RSI超賣買入信號',
                price: currentPrice,
                rsi: currentRsi,
                consolidationLength,
              });
            }
          }
          // 只有已持倉時才產生賣出信號
          else if (currentRsi >= this.rsiOverBought && inPosition) {
            totalSignals++;
            consolidationSignals++;

            signals.push({
              timestamp: klineData[i].openTime,
              type: 'SELL',
              confidence: 80 + (currentRsi - this.rsiOverBought),
              reason: `盤整區間RSI超買(${currentRsi.toFixed(2)})`,
              price: currentPrice,
              inConsolidation: true,
            });
            inPosition = false;

            if (this.debug) {
              debugInfo.push({
                index: i,
                action: '產生RSI超買賣出信號',
                price: currentPrice,
                rsi: currentRsi,
                consolidationLength,
              });
            }
          }
        }
      }

      // 額外的止損/止盈邏輯，確保交易有出場點
      if (inPosition && !inConsolidation) {
        // 如果價格下跌超過5%，執行止損
        if (currentPrice < entryPrice * 0.95) {
          totalSignals++;

          signals.push({
            timestamp: klineData[i].openTime,
            type: 'SELL',
            confidence: 60,
            reason: `止損賣出 (下跌超過5%)`,
            price: currentPrice,
            inConsolidation: false,
          });
          inPosition = false;

          if (this.debug) {
            debugInfo.push({
              index: i,
              action: '止損賣出',
              price: currentPrice,
              entryPrice,
              lossPercent: (currentPrice / entryPrice - 1) * 100,
            });
          }
        }
        // 如果價格上漲超過10%，執行獲利了結
        else if (currentPrice > entryPrice * 1.1) {
          totalSignals++;

          signals.push({
            timestamp: klineData[i].openTime,
            type: 'SELL',
            confidence: 75,
            reason: `獲利賣出 (上漲超過10%)`,
            price: currentPrice,
            inConsolidation: false,
          });
          inPosition = false;

          if (this.debug) {
            debugInfo.push({
              index: i,
              action: '獲利賣出',
              price: currentPrice,
              entryPrice,
              profitPercent: (currentPrice / entryPrice - 1) * 100,
            });
          }
        }
      }
    }

    // 如果分析結束時仍持有倉位，添加最後的賣出信號
    if (inPosition && klineData.length > 0) {
      const lastCandle = klineData[klineData.length - 1];
      const lastPrice = parseFloat(lastCandle.close);

      totalSignals++;

      signals.push({
        timestamp: lastCandle.openTime,
        type: 'SELL',
        confidence: 50,
        reason: '分析結束時平倉',
        price: lastPrice,
        inConsolidation: false,
      });

      if (this.debug) {
        debugInfo.push({
          index: klineData.length - 1,
          action: '分析結束平倉',
          price: lastPrice,
        });
      }
    }

    // 日誌輸出統計信息
    if (this.debug) {
      const consolidationPercentage =
        totalSignals > 0 ? ((consolidationSignals / totalSignals) * 100).toFixed(2) : '0';

      console.log(
        `總信號數: ${totalSignals}, 盤整期間信號數: ${consolidationSignals} (${consolidationPercentage}%)`,
      );
      console.log('詳細調試信息:', JSON.stringify(debugInfo, null, 2));
    }

    return signals;
  }
}
