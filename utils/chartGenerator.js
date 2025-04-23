const {ChartJSNodeCanvas} = require("chartjs-node-canvas");

const width = 600;
const height = 400;
const chartJSNodeCanvas = new ChartJSNodeCanvas({width, height});

async function generateChartImage(data1, data2 = null, type = "radar") {
  const labels = [
    "Минут на поле",
    "Ср. макс. скорость",
    "Ср. макс. ускорение",
    "Ср. макс. торможение",
    "Дист. Z4-Z5 (м/мин)",
    "Метабол. сила",
  ];

  const rawValues1 = [
    data1.minutes,
    data1.avgMaxSpeed,
    data1.avgMaxAcc,
    data1.avgMaxDec,
    data1.z4z5Distance,
    data1.metabolicPower,
  ];

  const rawValues2 = data2
    ? [
        data2.minutes,
        data2.avgMaxSpeed,
        data2.avgMaxAcc,
        data2.avgMaxDec,
        data2.z4z5Distance,
        data2.metabolicPower,
      ]
    : null;

  const parameterRanges = [
    {min: 100, max: 5000}, // Минут на поле
    {min: 10, max: 35}, // Скорость
    {min: 0, max: 10}, // Ускорение
    {min: -9, max: 0}, // Торможение (инверс)
    {min: 0, max: 7}, // Z4-Z5
    {min: 0, max: 10}, // Метабол. сила
  ];

  const normalize = (data) => {
    const rawValues = [
      data.minutes,
      data.avgMaxSpeed,
      data.avgMaxAcc,
      data.avgMaxDec,
      data.z4z5Distance,
      data.metabolicPower,
    ];

    return rawValues.map((value, i) => {
      const {min, max} = parameterRanges[i];
      const clamped = Math.max(min, Math.min(value, max));
      let normalized;
      if (i === 3) {
        // Инвертируем торможение
        normalized = (clamped - max) / (min - max);
      } else {
        normalized = (clamped - min) / (max - min);
      }
      return normalized * 100;
    });
  };

  const normalized1 = normalize(data1);
  const normalized2 = data2 ? normalize(data2) : null;

  const config = getChartConfig(
    type,
    labels,
    normalized1,
    normalized2,
    rawValues1,
    rawValues2
  );
  const image = await chartJSNodeCanvas.renderToBuffer(config);

  const comparisonText = data2 ? getComparisonText(data1, data2, labels) : null;

  return {image, comparisonText};
}

function getChartConfig(
  type,
  labels,
  values1,
  values2 = null,
  rawValues1,
  rawValues2 = null
) {
  const datasets = [
    {
      label: "Месяц 1",
      data: values1,
      backgroundColor: "rgba(54, 162, 235, 0.4)",
      borderColor: "rgba(54, 162, 235, 1)",
      borderWidth: 2,
      pointBackgroundColor: "#ffffff",
    },
  ];

  if (values2) {
    datasets.push({
      label: "Месяц 2",
      data: values2,
      backgroundColor: "rgba(75, 192, 192, 0.3)",
      borderColor: "rgba(75, 192, 192, 1)",
      borderWidth: 2,
      pointBackgroundColor: "#ffffff",
    });
  }
  const units = ["", " км/ч", " м/с²", " м/с²", " м/мин", " Вт/кг"];
  return {
    type: type,
    data: {
      labels: labels,
      datasets: datasets,
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          labels: {
            color: "#ffffff",
            font: {
              size: 14,
            },
          },
        },
        title: {
          display: true,
          text: values2 ? "Сравнение ASP" : "ASP Профиль",
          color: "#ffffff",
          font: {
            size: 20,
          },
        },
      },
      scales: {
        r: {
          min: 0,
          max: 100,
          ticks: {
            stepSize: 20,
            color: "#aaaaaa",
            display: false,
          },
          angleLines: {color: "rgba(255,255,255,0.2)"},
          grid: {color: "rgba(255,255,255,0.2)"},
          pointLabels: {
            color: "#ffffff",
            font: {size: 14},
          },
        },
      },
    },
    plugins: [
      {
        id: "background",
        beforeDraw: (chart) => {
          const ctx = chart.ctx;
          ctx.save();
          ctx.fillStyle = "#1e1e1e";
          ctx.fillRect(0, 0, chart.width, chart.height);
          ctx.restore();
        },
      },
      {
        id: "valueLabels",
        afterDatasetDraw(chart) {
          const {ctx} = chart;
          const datasets = chart.data.datasets;

          datasets.forEach((dataset, datasetIndex) => {
            const rawValues = datasetIndex === 0 ? rawValues1 : rawValues2;
            if (!rawValues) return;

            const color = datasetIndex === 0 ? "#3399ff" : "#33ffaa"; // 💡 читаемые цвета
            const offset = datasetIndex === 0 ? -14 : 16;

            chart.getDatasetMeta(datasetIndex).data.forEach((point, i) => {
              const val = rawValues[i];
              if (typeof val !== "number") return;

              const text =
                i === 0 ? Math.round(val).toString() : val.toFixed(2);

              ctx.save();
              ctx.font = "bold 12px Arial";
              ctx.fillStyle = color;
              ctx.textAlign = "center";
              ctx.fillText(text, point.x, point.y + offset);
              ctx.restore();
            });
          });
        },
      },
    ],
  };
}
function getComparisonText(data1, data2, labels) {
  const raw1 = [
    data1.minutes,
    data1.avgMaxSpeed,
    data1.avgMaxAcc,
    data1.avgMaxDec,
    data1.z4z5Distance,
    data1.metabolicPower,
  ];

  const raw2 = [
    data2.minutes,
    data2.avgMaxSpeed,
    data2.avgMaxAcc,
    data2.avgMaxDec,
    data2.z4z5Distance,
    data2.metabolicPower,
  ];

  return labels
    .map((label, i) => {
      const val1 = raw1[i];
      const val2 = raw2[i];
      const formatted =
        typeof val1 === "number" && typeof val2 === "number"
          ? `*${val1.toFixed(2)}* → *${val2.toFixed(2)}*`
          : `${val1} → ${val2}`;
      return `${label}: ${formatted}`;
    })
    .join("\n");
}

module.exports = {generateChartImage};
