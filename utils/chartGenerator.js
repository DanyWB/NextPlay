const {ChartJSNodeCanvas} = require("chartjs-node-canvas");

const axios = require("axios");
const {InputFile} = require("grammy");
const path = require("path");
const fs = require("fs");

let width = 700;
let height = 500;
const chartJSNodeCanvas = new ChartJSNodeCanvas({
  width,
  height,
  chartCallback: (ChartJS) => {
    // Установим глобальный шрифт для всех графиков
    ChartJS.defaults.font.family = "DejaVu Sans"; // или другой кириллический шрифт
  },
});

async function generateChartImage(
  data1,
  data2 = null,
  lang = "ua",
  type = "radar"
) {
  const {t} = require("../services/langService");
  const labels = t(lang, "asp_labels");

  const rawValues1 = [
    data1.minutes,
    data1.avgMaxSpeed,
    data1.avgMaxAcc,
    data1.avgMaxDec,
    data1.z4z5Distance,
    // data1.metabolicPower,
  ];

  const rawValues2 = data2
    ? [
        data2.minutes,
        data2.avgMaxSpeed,
        data2.avgMaxAcc,
        data2.avgMaxDec,
        data2.z4z5Distance,
        // data2.metabolicPower,
      ]
    : null;

  const parameterRanges = [
    {min: 100, max: 5000}, // Минут на поле
    {min: 10, max: 35}, // Скорость
    {min: 0, max: 10}, // Ускорение
    {min: -9, max: 0}, // Торможение (инверс)
    {min: 0, max: 7}, // Z4-Z5
    // {min: 0, max: 10}, // Метабол. сила
  ];

  const normalize = (data) => {
    const rawValues = [
      data.minutes,
      data.avgMaxSpeed,
      data.avgMaxAcc,
      data.avgMaxDec,
      data.z4z5Distance,
      // data.metabolicPower,
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
          text: values2 ? "ASP-1 / ASP-2" : "ASP",
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
function getChartConfigMatch(
  type,
  labels,
  data1,
  data2,
  raw1,
  raw2,
  title = ""
) {
  return {
    type,
    data: {
      labels,
      datasets: [
        {
          label: "Матч 1",
          data: data1,
          backgroundColor: "rgba(66, 133, 244, 0.3)",
          borderColor: "#4285F4",
          borderWidth: 1,
          pointBackgroundColor: "#4285F4",
        },
        ...(data2
          ? [
              {
                label: "Матч 2",
                data: data2,
                backgroundColor: "rgba(255, 167, 38, 0.3)",
                borderColor: "#FFA726",
                borderWidth: 2,
                pointBackgroundColor: "#FFA726",
              },
            ]
          : []),
      ],
    },
    options: {
      responsive: false,
      layout: {
        padding: 15,
      },
      plugins: {
        legend: {
          display: !!data2,
          labels: {
            color: "#ccc",
            font: {size: 16, family: "DejaVu Sans"},
          },
        },
        title: {
          display: true,
          text: title,
          color: "#fff",
          font: {
            size: 26,
            weight: "bold",
            family: "DejaVu Sans",
          },
        },
        tooltip: {
          callbacks: {
            label: function (ctx) {
              const raw = ctx.datasetIndex === 0 ? raw1 : raw2;
              return `${labels[ctx.dataIndex]}: ${raw?.[ctx.dataIndex]}`;
            },
          },
        },
      },
      scales: {
        r: {
          min: 0,
          max: 100,
          angleLines: {color: "#444"},
          grid: {color: "#555"},
          pointLabels: {
            color: "#ccc",
            font: {size: 20, family: "DejaVu Sans"},
          },
          ticks: {display: false},
        },
      },
    },
    plugins: [
      {
        id: "value_labels",
        beforeDraw: (chart) => {
          const {ctx} = chart;
          ctx.save();
          ctx.font = "20px 'DejaVu Sans'";
          ctx.textAlign = "center";

          const datasets = chart.data.datasets;
          datasets.forEach((dataset, dsIndex) => {
            const meta = chart.getDatasetMeta(dsIndex);
            const raw = dsIndex === 0 ? raw1 : raw2;
            const color = dsIndex === 0 ? "#4A90E2" : "#FFB74D"; // ярче синий и оранжевый
            const offset = dsIndex === 0 ? 20 : -14; // сильнее отодвинуть вверх / вниз

            ctx.fillStyle = color;

            meta.data.forEach((point, i) => {
              const {x, y} = point.tooltipPosition();
              const value = raw?.[i];
              if (value !== undefined) {
                ctx.fillText(value.toFixed(1), x, y + offset);
              }
            });
          });

          ctx.restore();
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
width = 720;
height = 420;

const chartJSNodeCanvasMPP = new ChartJSNodeCanvas({
  width,
  height,
  devicePixelRatio: 2,
  chartCallback: (ChartJS) => {
    ChartJS.defaults.font.family = "DejaVu Sans";
  },
});
async function generateQuickGaugeImage(data1, data2 = null) {
  const min = 0;
  const max = 10;

  const value1 = Math.max(min, Math.min(data1.average_p, max));
  const value2 = data2 ? Math.max(min, Math.min(data2.average_p, max)) : null;

  const imageBuffer = await chartJSNodeCanvasMPP.renderToBuffer({
    type: "doughnut", // не используется — всё рисуем вручную
    data: {datasets: []},
    options: {
      responsive: false,
      plugins: {
        legend: {display: false},
        tooltip: {enabled: false},
      },
      events: [],
    },
    plugins: [
      {
        id: "manual_gauge_draw",
        beforeDraw: (chart) => {
          const {ctx} = chart;

          // Очистка
          ctx.save();
          ctx.fillStyle = "white";
          ctx.fillRect(0, 0, width, height);
          ctx.restore();

          const centerX = width / 2;
          const centerY = height * 0.9;
          const radius = width * 0.4;
          const thickness = 120;
          const colorWidth = thickness / 2;
          const insetRadius = radius - thickness / 2;

          // 1. Серая шкала (фон)
          ctx.beginPath();
          ctx.lineWidth = thickness;
          ctx.strokeStyle = "#e0e0e0";
          ctx.arc(centerX, centerY, radius, Math.PI, 0, false);
          ctx.stroke();

          // 2. Синяя шкала (верхняя часть)
          if (value2 !== null) {
            const angle = (value2 / max) * Math.PI;
            ctx.beginPath();
            ctx.lineWidth = colorWidth;
            ctx.strokeStyle = "rgb(66,133,244)";
            ctx.arc(
              centerX,
              centerY,
              insetRadius + colorWidth / 2,
              Math.PI,
              Math.PI + angle,
              false
            );

            ctx.stroke();
          }

          // 3. Оранжевая шкала (нижняя часть)
          if (value1 !== null) {
            const angle = (value1 / max) * Math.PI;
            ctx.beginPath();
            ctx.lineWidth = colorWidth;
            ctx.strokeStyle = "rgb(255,167,38)";
            // ctx.arc(
            //   centerX,
            //   centerY,
            //   insetRadius + thickness / 1.35,
            //   Math.PI,
            //   Math.PI + angle,
            //   false
            // );

            if (value2 == null) {
              ctx.strokeStyle = "rgb(66,133,244)";
              ctx.lineWidth = thickness;
              ctx.arc(
                centerX,
                centerY,
                insetRadius + thickness / 1.95,
                Math.PI,
                Math.PI + angle,
                false
              );
            } else {
              ctx.arc(
                centerX,
                centerY,
                insetRadius + thickness / 1.35,
                Math.PI,
                Math.PI + angle,
                false
              );
            }

            ctx.stroke();
          }

          // === 4. Подписи ===
          ctx.textAlign = "center";

          ctx.font = "20px 'DejaVu Sans'";
          ctx.fillStyle = "#888";
          ctx.fillText("avg MP", centerX, height * 0.7);

          ctx.font = "26px 'DejaVu Sans'";
          ctx.fillStyle = "#444";
          if (value2 !== null) {
            ctx.fillText(
              `${value1.toFixed(2)} → ${value2.toFixed(2)} W/kg`,
              centerX,
              height * 0.8
            );
          } else {
            ctx.fillText(`${value1.toFixed(2)} W/kg`, centerX, height * 0.8);
          }

          ctx.font = "13px 'DejaVu Sans'";
          ctx.fillStyle = "#999";
          ctx.textAlign = "left";
          ctx.fillText(min.toString(), width * 0.1, height * 0.96);
          ctx.textAlign = "right";
          ctx.fillText(max.toString(), width * 0.9, height * 0.96);
        },
      },
    ],
  });

  const comparisonText =
    data2 !== null
      ? `${value2 - value1 > 0 ? "▲" : "▼"} ${Math.abs(value2 - value1).toFixed(
          2
        )} W/kg`
      : null;
  return {
    image: new InputFile(imageBuffer, "mpp-gauge.png"),
    comparisonText,
  };
}

const chartJSNodeCanvasMatch = new ChartJSNodeCanvas({
  width: 720,
  height: 720,
  backgroundColour: "black",
});

async function generateMatchChartImage(data1, data2 = null, lang = "ua") {
  const {t} = require("../services/langService");
  const labels = t(lang, "match_stats_labels");

  const rawValues1 = [
    data1.minutes,
    data1.totalDistance,
    data1.maxSpeed,
    data1.acc,
    data1.dec,
    data1.z4z5,
    data1.metabolicPower,
  ];

  const rawValues2 = data2
    ? [
        data2.minutes,
        data2.totalDistance,
        data2.maxSpeed,
        data2.acc,
        data2.dec,
        data2.z4z5,
        data2.metabolicPower,
      ]
    : null;

  const parameterRanges = [
    {min: 0, max: 130}, // Минуты
    {min: 1000, max: 15000}, // Дистанция
    {min: 10, max: 40}, // Макс. скорость
    {min: 0, max: 50}, // Ускорения
    {min: 0, max: 50}, // Торможения
    {min: 0, max: 15}, // Z4-Z5
    {min: 0, max: 10}, // Мощность
  ];

  const normalize = (data) => {
    const raw = [
      data.minutes,
      data.totalDistance,
      data.maxSpeed,
      data.acc,
      data.dec,
      data.z4z5,
      data.metabolicPower,
    ];

    return raw.map((value, i) => {
      const {min, max} = parameterRanges[i];
      const clamped = Math.max(min, Math.min(value, max));
      return ((clamped - min) / (max - min)) * 100;
    });
  };

  const normalized1 = normalize(data1);
  const normalized2 = data2 ? normalize(data2) : null;

  let title = data1.notes;

  if (data2) {
    title += " / " + data2.notes;
  }

  const config = getChartConfigMatch(
    "radar",
    labels,
    normalized1,
    normalized2,
    rawValues1,
    rawValues2,
    title
  );

  const buffer = await chartJSNodeCanvasMatch.renderToBuffer(config);
  return {image: new InputFile(buffer, "match-chart.png")};
}

const chartJSNodeCanvasEcIndex = new ChartJSNodeCanvas({
  width: 1200,
  height: 800,
  backgroundColour: "#1e1e1e",
});

async function generateEccentricChart(data, avg, username, lang = "ua") {
  const labels = data.map((point) =>
    new Date(point.date).toLocaleDateString("ru", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  );

  const weekStart = new Date(data[0].date);
  const weekEnd = new Date(data[data.length - 1].date);
  const formatter = new Intl.DateTimeFormat(lang === "ua" ? "uk-UA" : "ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const titleDate = `${formatter.format(weekStart)} – ${formatter.format(
    weekEnd
  )}`;
  const values = data.map((point) => point.value);

  const config = {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Eccentric Index",
          data: values,
          borderColor: "cyan",
          backgroundColor: "cyan",
          tension: 0.3,
          fill: false,
        },
        {
          label: lang === "ua" ? "Середнє значення" : "Среднее значение",
          data: new Array(data.length).fill(avg),
          borderColor: "red",
          borderDash: [10, 5],
          borderWidth: 2,
          pointRadius: 0,
          fill: false,
        },
      ],
    },
    options: {
      scales: {
        y: {
          min: -60,
          max: 100,
          title: {display: true, text: "Eccentric Index", color: "white"},
          ticks: {color: "white"},
          grid: {color: "#444"},
        },
        x: {
          title: {
            display: true,
            text: lang === "ua" ? "Дата" : "Дата",
            color: "white",
          },
          ticks: {color: "white"},
          grid: {color: "#444"},
        },
      },
      plugins: {
        title: {
          display: true,
          text: `Eccentric Index (${titleDate}) – ${username}`,
          font: {size: 16},
          color: "white",
        },
        legend: {
          position: "top",
          labels: {color: "white"},
        },
      },
    },
  };

  return await chartJSNodeCanvasEcIndex.renderToBuffer(config);
}

const chartJSNodeCanvasAnIndex = new ChartJSNodeCanvas({
  width: 1200,
  height: 800,
  backgroundColour: "#1e1e1e",
});

async function generateAnaerobicChart(data, avg, username, lang = "ua") {
  const labels = data.map((point) =>
    new Date(point.date).toLocaleDateString(lang, {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  );
  const values = data.map((point) => point.value);
  const weekStart = new Date(data[0].date);
  const weekEnd = new Date(data[data.length - 1].date);

  const formatter = new Intl.DateTimeFormat(lang === "uk" ? "uk-UA" : "ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const titleDate = `${formatter.format(weekStart)} – ${formatter.format(
    weekEnd
  )}`;

  const config = {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "AN index (%)",
          data: values,
          borderColor: "cyan",
          backgroundColor: "cyan",
          tension: 0.3,
          fill: false,
        },
        {
          label: lang === "ua" ? "Середнє значення" : "Среднее значение",
          data: new Array(data.length).fill(avg),
          borderColor: "red",
          borderDash: [10, 5],
          borderWidth: 2,
          pointRadius: 0,
          fill: false,
        },
        {
          label:
            lang === "ua"
              ? "Максимальний рівень (40%)"
              : "Максимальный уровень (40%)",
          data: new Array(data.length).fill(40),
          borderColor: "orange",
          borderDash: [4, 4],
          borderWidth: 2,
          pointRadius: 0,
          fill: false,
        },
      ],
    },
    options: {
      scales: {
        y: {
          min: 32,
          max: 48,
          title: {display: true, text: "AN index (%)", color: "white"},
          ticks: {color: "white"},
          grid: {color: "#444"},
        },
        x: {
          title: {
            display: true,
            text: lang === "ua" ? "Дата" : "Дата",
            color: "white",
          },
          ticks: {color: "white"},
          grid: {color: "#444"},
        },
      },
      plugins: {
        title: {
          display: true,
          text: `AN index за тиждень (${titleDate}) – ${username}`,
          font: {size: 16},
          color: "white",
        },
        legend: {
          position: "top",
          labels: {color: "white"},
        },
      },
    },
  };

  return await chartJSNodeCanvasAnIndex.renderToBuffer(config);
}

module.exports = {
  generateChartImage,
  generateMatchChartImage,
  generateQuickGaugeImage,
  generateEccentricChart,
  generateAnaerobicChart,
};
