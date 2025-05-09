const {t} = require("../services/langService");
function formatAspComparison(data1, data2, label1, label2, lang = "ru") {
  const compare = (a, b, index, unit = "") => {
    const isDeceleration = index === 3;
    const from = Number.isFinite(a) ? a.toFixed(2) : a;
    const to = Number.isFinite(b) ? b.toFixed(2) : b;

    let arrow;
    if (isDeceleration) {
      arrow = b < a ? "🔼" : b > a ? "🔽" : "➡️";
    } else {
      arrow = b > a ? "🔼" : b < a ? "🔽" : "➡️";
    }

    return `<b>${from}${unit} ${arrow} ${to}${unit}</b>`;
  };

  return [
    t(lang, "asp_comparison.title", {from: label1, to: label2}),
    "",
    t(lang, "asp_comparison.minutes", {
      value: compare(data1.minutes, data2.minutes, 0),
    }),
    t(lang, "asp_comparison.speed", {
      value: compare(data1.avgMaxSpeed, data2.avgMaxSpeed, 1, " км/ч"),
    }),
    t(lang, "asp_comparison.acc", {
      value: compare(data1.avgMaxAcc, data2.avgMaxAcc, 2, " м/с²"),
    }),
    t(lang, "asp_comparison.dec", {
      value: compare(data1.avgMaxDec, data2.avgMaxDec, 3, " м/с²"),
    }),
  ].join("\n\n");
}
function formatAspSummary(data, month, lang = "ru") {
  return [
    t(lang, "asp_summary.title", {month}),
    t(lang, "asp_summary.minutes", {value: data.minutes}),
    t(lang, "asp_summary.speed", {
      value: data.avgMaxSpeed.toFixed(1),
    }),
    t(lang, "asp_summary.acc", {
      value: data.avgMaxAcc.toFixed(2),
    }),
    t(lang, "asp_summary.dec", {
      value: data.avgMaxDec.toFixed(2),
    }),
    t(lang, "asp_summary.z4z5", {
      value: data.z4z5Distance.toFixed(1),
    }),
  ].join("\n");
}

module.exports = {formatAspComparison, formatAspSummary};
