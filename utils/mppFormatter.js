// utils/mppFormatter.js
const monthsRu = {
  "01": "Январь",
  "02": "Февраль",
  "03": "Март",
  "04": "Апрель",
  "05": "Май",
  "06": "Июнь",
  "07": "Июль",
  "08": "Август",
  "09": "Сентябрь",
  10: "Октябрь",
  11: "Ноябрь",
  12: "Декабрь",
};

function getMonthLabel(monthStr) {
  const [year, month] = monthStr.split("-");
  return `${monthsRu[month]} ${year}`;
}

function formatMppProfile(data, month) {
  const label = getMonthLabel(month);
  return (
    `📊 <b>MPP профиль за ${label}</b>\n\n` +
    `🔥 Средняя метаболическая мощность: <b>${data.average_p} Вт/кг</b>\n`
  );
}

function formatMppComparison(data1, data2, m1, m2) {
  const label1 = getMonthLabel(m1);
  const label2 = getMonthLabel(m2);

  const arrow = (a, b) => {
    if (b > a) return "🔼";
    if (b < a) return "🔽";
    return "➡️";
  };

  const arrowSymbol = arrow(data1.average_p, data2.average_p);
  const changeText =
    data2.average_p > data1.average_p ? "повышение" : "снижение";
  return (
    `📊 <b>Сравнение MPP: ${label1} → ${label2}</b>\n\n` +
    `🔥 Средняя мощность: <b>${data1.average_p.toFixed(
      2
    )}</b> ${arrowSymbol} <b>${data2.average_p.toFixed(2)}</b> Вт/кг\n`
  );
}

module.exports = {
  formatMppProfile,
  formatMppComparison,
};
