// Initialize charts after the page loads
document.addEventListener('DOMContentLoaded', function () {
  // Add event listener for days selector
  const daysSelector = document.getElementById('daysSelector');
  if (daysSelector) {
    daysSelector.addEventListener('change', function () {
      const days = this.value;
      fetchAndRenderData(days);
    });

    // Initial fetch with default days
    fetchAndRenderData(daysSelector.value);
  } else {
    // Fallback if selector not found
    fetchAndRenderData(180);
  }
});

// Function to fetch data and render all charts
function fetchAndRenderData(days) {
  // Show loading indicator
  const chartsContainer = document.querySelector('.container');
  if (chartsContainer) {
    chartsContainer.classList.add('loading');
  }

  fetchConsolidationData(days)
    .then((data) => {
      // Clear existing charts if needed
      clearCharts();

      // Render all charts with new data
      renderWeeklyHeatmap(data.hourlyHeatmap);
      renderHourlyChart(data.hourOfDay);
      renderDailyChart(data.dayOfWeek);
      renderTrueWeeklyHeatmap(data.hourlyHeatmap);

      // Update UI to show current selection
      updateTimeRangeInfo(days);

      // Hide loading indicator
      if (chartsContainer) {
        chartsContainer.classList.remove('loading');
      }
    })
    .catch((error) => {
      console.error('Error loading data:', error);
      alert('Failed to load consolidation data. See console for details.');
      if (chartsContainer) {
        chartsContainer.classList.remove('loading');
      }
    });
}

// Clear existing charts before redrawing
function clearCharts() {
  // Clean up Chart.js instances
  Chart.helpers.each(Chart.instances, function (instance) {
    instance.destroy();
  });

  // Clean up ECharts instance
  const echartDom = document.getElementById('trueDayHourHeatmap');
  if (echartDom) {
    echarts.getInstanceByDom(echartDom)?.dispose();
  }
}

// Update the UI to reflect current time range
function updateTimeRangeInfo(days) {
  const timeRangeInfo = document.getElementById('timeRangeInfo');
  if (timeRangeInfo) {
    timeRangeInfo.textContent = `Showing data for the last ${days} days`;
  }
}

// Fetch data from the API with days parameter
async function fetchConsolidationData(days = 180) {
  const response = await fetch(`/api/consolidation-data?days=${days}`);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return await response.json();
}

// Render the weekly heatmap
function renderWeeklyHeatmap(data) {
  const ctx = document.getElementById('weeklyHeatmap').getContext('2d');

  // Prepare data for the chart
  const datasets = [];
  const dayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // For each hour, create a dataset
  for (let hour = 0; hour < 24; hour++) {
    const hourData = {
      label: `${hour}:00`,
      data: [],
      backgroundColor: [],
    };

    // Get data for each day at this hour
    for (let day = 0; day < 7; day++) {
      // Adjust the day index to match the new order (Monday first)
      const dataIndex = (day + 1) % 7;
      const value = data[dataIndex][hour];
      hourData.data.push(value);

      // Color scale: focused on 95-100 range
      // Light green to dark green for high consolidation
      let color;
      if (value >= 95) {
        // Map 95-100 to light green through dark green
        const intensity = (value - 95) / 10; // 0 to 1
        const r = Math.floor(144 * (1 - intensity));
        const g = Math.floor(238 - 110 * intensity);
        const b = Math.floor(144 * (1 - intensity));
        color = `rgba(${r}, ${g}, ${b}, 0.7)`;
      } else {
        // Values below 95 get a lighter, less saturated color
        color = 'rgba(200, 200, 200, 0.3)';
      }
      hourData.backgroundColor.push(color);
    }

    datasets.push(hourData);
  }

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: dayLabels,
      datasets: datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          stacked: true,
          title: {
            display: true,
            text: 'Day of Week',
          },
        },
        y: {
          stacked: true,
          beginAtZero: false,
          min: 95,
          max: 100,
          title: {
            display: true,
            text: 'Consolidation Score (95-100)',
          },
        },
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function (context) {
              return [
                `Hour ${context.dataset.label}: ${context.raw.toFixed(1)} consolidation score`,
                `週市場收斂熱圖：此時段收斂度為 ${context.raw.toFixed(1)}`,
                `數值越高（深綠色）表示市場波動越小，更適合突破交易`,
              ];
            },
            title: function (context) {
              return `${context[0].label} - ${context[0].dataset.label}`;
            },
          },
        },
        legend: {
          display: false,
        },
        title: {
          display: true,
          text: 'High Consolidation (95-100) by Day and Hour',
        },
      },
    },
  });
}

// Render the hourly analysis chart
function renderHourlyChart(data) {
  const ctx = document.getElementById('hourlyChart').getContext('2d');

  const hourLabels = Array.from({ length: 24 }, (_, i) => `${i}:00`);

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: hourLabels,
      datasets: [
        {
          label: 'Consolidation Score',
          data: data,
          borderColor: 'rgba(54, 162, 235, 1)',
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          borderWidth: 2,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        y: {
          beginAtZero: false,
          min: 95,
          max: 100,
          title: {
            display: true,
            text: 'Consolidation Score (95-100)',
          },
        },
        x: {
          title: {
            display: true,
            text: 'Hour of Day (UTC)',
          },
        },
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function (context) {
              return [
                `Consolidation Score: ${context.raw.toFixed(1)}`,
                `小時分析：此時段（${context.label}）收斂度為 ${context.raw.toFixed(1)}`,
                `展示一天中不同時段的市場收斂得分，得分越高表示市場波動越小`,
              ];
            },
          },
        },
        title: {
          display: true,
          text: 'High Consolidation Score (95-100) by Hour of Day',
        },
      },
    },
  });
}

// Render the daily analysis chart
function renderDailyChart(data) {
  const ctx = document.getElementById('dailyChart').getContext('2d');

  const dayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Adjust the data array to match the new day order (Monday first)
  const reorderedData = [data[1], data[2], data[3], data[4], data[5], data[6], data[0]];

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: dayLabels,
      datasets: [
        {
          label: 'High Consolidation Score',
          data: reorderedData,
          backgroundColor: reorderedData.map((value) => {
            if (value >= 95) {
              // Create shade of green based on value between 95-100
              const intensity = (value - 95) / 10; // 0 to 1
              return `rgba(${144 * (1 - intensity)}, ${238 - 110 * intensity}, ${
                144 * (1 - intensity)
              }, 0.7)`;
            } else {
              return 'rgba(200, 200, 200, 0.3)';
            }
          }),
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        y: {
          beginAtZero: false,
          min: 95,
          max: 100,
          title: {
            display: true,
            text: 'Consolidation Score (95-100)',
          },
        },
        x: {
          title: {
            display: true,
            text: 'Day of Week',
          },
        },
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function (context) {
              return [
                `Consolidation Score: ${context.raw.toFixed(1)}`,
                `日分析：${context.label} 收斂度為 ${context.raw.toFixed(1)}`,
                `展示一週中不同日期的市場收斂得分，得分越高的日期更適合交易`,
              ];
            },
          },
        },
        title: {
          display: true,
          text: 'High Consolidation Score (95-100) by Day of Week',
        },
      },
    },
  });
}

// Render true heatmap visualization of week by hour using ECharts
function renderTrueWeeklyHeatmap(data) {
  // Initialize ECharts instance
  const chartDom = document.getElementById('trueDayHourHeatmap');
  const myChart = echarts.init(chartDom);

  const dayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const hourLabels = Array.from({ length: 24 }, (_, i) => `${i}:00`);

  // Prepare data for ECharts heatmap
  const heatmapData = [];
  for (let day = 0; day < 7; day++) {
    // Adjust the day index to match the new order (Monday first)
    const dataIndex = (day + 1) % 7;
    for (let hour = 0; hour < 24; hour++) {
      const value = data[dataIndex][hour];
      // Format: [x-axis index, y-axis index, value]
      heatmapData.push([day, hour, value]);
    }
  }

  // Set options
  const option = {
    title: {
      text: 'Weekly Consolidation Heatmap by Hour',
      left: 'center',
    },
    tooltip: {
      position: 'top',
      formatter: function (params) {
        const dayName = dayLabels[params.data[0]];
        const hour = hourLabels[params.data[1]];
        const value = params.data[2].toFixed(1);
        return `
          <div>${dayName} ${hour}: ${value} consolidation score</div>
          <div>週時段熱圖：${dayName} ${hour} 收斂度為 ${value}</div>
          <div>顏色越深，表示市場收斂度越高，波動性越小，更適合關注突破交易</div>
        `;
      },
    },
    grid: {
      top: '60px',
      bottom: '20%',
      left: '10%',
      right: '10%',
    },
    xAxis: {
      type: 'category',
      data: dayLabels,
      splitArea: {
        show: true,
      },
      name: 'Day of Week',
      nameLocation: 'middle',
      nameGap: 30,
    },
    yAxis: {
      type: 'category',
      data: hourLabels,
      splitArea: {
        show: true,
      },
      name: 'Hour of Day (UTC)',
      nameLocation: 'middle',
      nameGap: 40,
    },
    visualMap: {
      min: 95,
      max: 100,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: '0%',
      text: ['Highest Consolidation (100)', 'High Consolidation (95)'],
      inRange: {
        // Light green to dark green for 95-100 score range
        color: ['rgba(243, 255, 232, 0.8)', 'rgba(255, 0, 0, 0.9)'],
      },
      precision: 1,
    },
    series: [
      {
        name: 'Consolidation Score',
        type: 'heatmap',
        data: heatmapData,
        emphasis: {
          itemStyle: {
            borderColor: '#333',
            borderWidth: 1,
          },
        },
        progressive: 1000,
        animation: false,
      },
    ],
  };

  // Set the option and render the chart
  myChart.setOption(option);

  // Handle window resize
  window.addEventListener('resize', function () {
    myChart.resize();
  });
}
