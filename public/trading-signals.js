// Trading signals visualization logic
let signalChart = null;

// Function to fetch trading signals data
async function fetchTradingSignals(days = 180) {
  try {
    const response = await fetch(`/api/trading-signals?days=${days}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching trading signals:', error);
    return null;
  }
}

// Function to fetch kline data
async function fetchKlineData(days = 180) {
  try {
    const response = await fetch(`/api/kline-data?days=${days}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching kline data:', error);
    return null;
  }
}

// Function to create the signals chart
function renderTradingSignalsChart(signalData, klineData) {
  // Clean up existing chart instance
  if (signalChart) {
    signalChart.dispose();
  }

  const chartDom = document.getElementById('tradingSignalsContainer');
  signalChart = echarts.init(chartDom);

  // Format dates for X-axis
  const dates = klineData.map((item) => {
    const date = new Date(item.openTime);
    return (
      date.toLocaleDateString() +
      ` (${date.toLocaleDateString('zh-TW', { weekday: 'short' })}) ` +
      date.toLocaleTimeString()
    );
  });

  // Format price data for candlestick chart
  const candlestickData = klineData.map((item) => [
    parseFloat(item.open),
    parseFloat(item.close),
    parseFloat(item.low),
    parseFloat(item.high),
  ]);
  // Format signals data for scatter plots
  const buySignals = signalData
    .filter((signal) => signal.type === 'BUY')
    .map((signal) => {
      const klineIndex = klineData.findIndex((k) => k.openTime === signal.timestamp);
      return [klineIndex, parseFloat(signal.price), signal.confidence, signal.reason];
    });

  const sellSignals = signalData
    .filter((signal) => signal.type === 'SELL')
    .map((signal) => {
      const klineIndex = klineData.findIndex((k) => k.openTime === signal.timestamp);
      return [klineIndex, parseFloat(signal.price), signal.confidence, signal.reason];
    });

  // Chart options
  const option = {
    title: {
      text: '交易信號圖表',
      left: 'center',
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
      },
      formatter: function (params) {
        // Standard tooltip for candlestick
        if (params[0]?.seriesName === 'K線圖') {
          const data = params[0].data;
          return `<div style="text-align:left">
                        <div>日期: ${dates[params[0].dataIndex]}</div>
                        <div>開盤價: ${data[1].toFixed(2)}</div>
                        <div>收盤價: ${data[2].toFixed(2)}</div>
                        <div>最低價: ${data[3].toFixed(2)}</div>
                        <div>最高價: ${data[4].toFixed(2)}</div>
                    </div>`;
        }
        // Tooltip for signals
        else if (params[0]?.seriesName.includes('信號')) {
          const signalData = params[0].data;
          return `<div style="text-align:left">
                        <div>日期: ${dates[signalData[0]]}</div>
                        <div>價格: ${signalData[1].toFixed(2)}</div>
                        <div>信心分數: ${signalData[2]}%</div>
                        <div>原因: ${signalData[3]}</div>
                    </div>`;
        }
        return '';
      },
    },
    legend: {
      data: ['K線圖', '買入信號', '賣出信號'],
      top: 30,
    },
    grid: {
      left: '10%',
      right: '10%',
      bottom: '15%',
    },
    xAxis: {
      type: 'category',
      data: dates,
      scale: true,
      axisLabel: {
        formatter: function (value, index) {
          // Only show some of the dates to avoid overcrowding
          return index % 24 === 0 ? value.split(' ')[0] : '';
        },
      },
    },
    yAxis: {
      scale: true,
      splitArea: {
        show: true,
      },
    },
    dataZoom: [
      {
        type: 'inside',
        start: 50,
        end: 100,
      },
      {
        show: true,
        type: 'slider',
        bottom: '5%',
        start: 50,
        end: 100,
      },
    ],
    series: [
      {
        name: 'K線圖',
        type: 'candlestick',
        data: candlestickData,
        itemStyle: {
          color: '#ef232a',
          color0: '#14b143',
          borderColor: '#ef232a',
          borderColor0: '#14b143',
        },
      },
      {
        name: '買入信號',
        type: 'scatter',
        data: buySignals,
        symbolSize: function (data) {
          // Size based on confidence level
          return Math.min(20, Math.max(10, data[2] / 5));
        },
        itemStyle: {
          color: '#4CAF50',
        },
        symbol: 'triangle',
      },
      {
        name: '賣出信號',
        type: 'scatter',
        data: sellSignals,
        symbolSize: function (data) {
          // Size based on confidence level
          return Math.min(20, Math.max(10, data[2] / 5));
        },
        itemStyle: {
          color: '#F44336',
        },
        symbol: 'triangle-down',
      },
    ],
  };

  signalChart.setOption(option);

  // Handle window resize
  window.addEventListener('resize', function () {
    signalChart.resize();
  });
}

// Update the summary statistics
function updateSignalsSummary(summary) {
  document.getElementById('buySignalsCount').textContent = summary.buySignals || 0;
  document.getElementById('sellSignalsCount').textContent = summary.sellSignals || 0;
  document.getElementById('highConfidenceCount').textContent = summary.highConfidenceSignals || 0;
}

// Initialize trading signals visualization
async function initTradingSignals(days = 180) {
  try {
    const result = await fetchTradingSignals(days);
    if (!result) return;

    // Fetch actual kline data from the new API endpoint
    const klineData = await fetchKlineData(days);
    if (!klineData) return;

    // Match the kline data with signal data for visualization
    const signalData = result.signals;

    // Update UI with signal data
    renderTradingSignalsChart(signalData, klineData);
    updateSignalsSummary(result.summary);
  } catch (error) {
    console.error('Error loading trading signals:', error);
  }
}
