const {t} = require("../services/langService");
const {getMonthLabel} = require("./months");

function formatMppProfile(data, month, lang = "ru") {
  const label = getMonthLabel(month, lang);
  return [
    t(lang, "mpp_profile.title", {month: label}),
    t(lang, "mpp_profile.value", {value: data.average_p.toFixed(2)}),
  ].join("\n\n");
}

function formatMppComparison(data1, data2, m1, m2, lang = "ru") {
  const label1 = getMonthLabel(m1, lang);
  const label2 = getMonthLabel(m2, lang);

  const arrow = (a, b) => {
    if (b > a) return "🔼";
    if (b < a) return "🔽";
    return "➡️";
  };

  const arrowSymbol = arrow(data1.average_p, data2.average_p);

  return [
    t(lang, "mpp_profile.compare_title", {from: label1, to: label2}),
    t(lang, "mpp_profile.compare_value", {
      from: data1.average_p.toFixed(2),
      to: data2.average_p.toFixed(2),
      arrow: arrowSymbol,
    }),
  ].join("\n\n");
}

module.exports = {
  formatMppProfile,
  formatMppComparison,
};
