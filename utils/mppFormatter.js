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
    `🔥 Средняя метаболическая мощность: <b>${data.average_p} Вт/кг</b>\n` +
    `🔹 Общая энергия: ${data.total_energy} Дж\n` +
    `🔹 Анаэробная энергия: ${data.anaerobic_energy} Дж\n` +
    `🔹 Эквивалентная дистанция: ${data.equivalent_distance} м`
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

  return (
    `📊 <b>Сравнение MPP: ${label1} → ${label2}</b>\n\n` +
    `🔥 Средняя мощность: <b>${data1.average_p}</b> ${arrow(
      data1.average_p,
      data2.average_p
    )} <b>${data2.average_p} Вт/кг</b>\n` +
    `🔹 Общая энергия: ${data1.total_energy} ${arrow(
      data1.total_energy,
      data2.total_energy
    )} ${data2.total_energy} Дж\n` +
    `🔹 Анаэробная энергия: ${data1.anaerobic_energy} ${arrow(
      data1.anaerobic_energy,
      data2.anaerobic_energy
    )} ${data2.anaerobic_energy} Дж\n` +
    `🔹 Эквивалентная дистанция: ${data1.equivalent_distance} ${arrow(
      data1.equivalent_distance,
      data2.equivalent_distance
    )} ${data2.equivalent_distance} м`
  );
}

module.exports = {
  formatMppProfile,
  formatMppComparison,
};
