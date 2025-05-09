const {t} = require("../services/langService");

const engMonthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// ym: строка формата "2025-04"
function getMonthLabel(ym, lang = "ru") {
  const parts = ym.split("-");
  const index = parseInt(parts[1], 10) - 1;
  const engMonth = engMonthNames[index] || ym;
  const localized = t(lang, `months.${engMonth}`);
  return localized || engMonth;
}

module.exports = {
  getMonthLabel,
};
