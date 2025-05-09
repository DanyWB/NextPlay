const {t} = require("../services/langService");
function formatMatchStats(data, lang = "ru") {
  return [
    t(lang, "match_stats.title", {title: data.notes}),
    t(lang, "match_stats.minutes", {value: data.minutes.toFixed(0)}),
    t(lang, "match_stats.distance", {value: data.totalDistance.toFixed(0)}),
    t(lang, "match_stats.speed", {value: data.maxSpeed.toFixed(1)}),
    t(lang, "match_stats.acc", {value: data.acc}),
    t(lang, "match_stats.dec", {value: data.dec}),
    t(lang, "match_stats.z4", {value: data.z4.toFixed(1)}),
    t(lang, "match_stats.z5", {value: data.z5.toFixed(1)}),
    t(lang, "match_stats.z4z5", {value: data.z4z5.toFixed(1)}),
    t(lang, "match_stats.mp", {value: data.metabolicPower.toFixed(2)}),
  ].join("\n");
}

function formatMatchComparison(data1, data2, lang = "ru") {
  const delta = (a, b, unit = "") => {
    const diff = b - a;
    const sign = diff > 0 ? "🔼" : diff < 0 ? "🔽" : "";
    return `${sign} ${Math.abs(diff).toFixed(1)}${unit}`;
  };

  const items = [
    {
      key: "minutes",
      a: data1.minutes.toFixed(0),
      b: data2.minutes.toFixed(0),
    },
    {
      key: "distance",
      a: data1.totalDistance.toFixed(0),
      b: data2.totalDistance.toFixed(0),
    },
    {
      key: "speed",
      a: data1.maxSpeed.toFixed(1),
      b: data2.maxSpeed.toFixed(1),
    },
    {
      key: "acc",
      a: data1.acc,
      b: data2.acc,
    },
    {
      key: "dec",
      a: data1.dec,
      b: data2.dec,
    },
    {
      key: "z4",
      a: data1.z4.toFixed(1),
      b: data2.z4.toFixed(1),
    },
    {
      key: "z5",
      a: data1.z5.toFixed(1),
      b: data2.z5.toFixed(1),
    },
    {
      key: "z4z5",
      a: data1.z4z5.toFixed(1),
      b: data2.z4z5.toFixed(1),
    },
    {
      key: "mp",
      a: data1.metabolicPower.toFixed(2),
      b: data2.metabolicPower.toFixed(2),
      unit: " Вт/кг",
    },
  ];

  const lines = [
    t(lang, "match_stats.compare_title", {
      left: data1.notes,
      right: data2.notes,
    }),
    "",
    ...items.map((item) =>
      t(lang, "match_stats.compare_item", {
        label: t(lang, `match_stats.${item.key}`.split(":")[0]).split(":")[0],
        a: item.a,
        b: item.b,
        delta: delta(item.a, item.b, item.unit || ""),
      })
    ),
  ];

  return lines.join("\n");
}

module.exports = {
  formatMatchStats,
  formatMatchComparison,
};
