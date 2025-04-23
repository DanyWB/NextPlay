function formatAspComparison(data1, data2, label1, label2) {
  const compare = (a, b, unit = "") => {
    const arrow = b > a ? "🔼" : b < a ? "🔽" : "➡️";
    const from = Number.isFinite(a) ? a.toFixed(2) : a;
    const to = Number.isFinite(b) ? b.toFixed(2) : b;

    let tag = "b";
    if (b > a) tag = "b"; // улучшение
    else if (b < a) tag = "b"; // ухудшение

    return `<${tag}>${from}${unit} ${arrow} ${to}${unit}</${tag}>`;
  };

  return [
    `📊 <b>Сравнение ASP: ${label1} → ${label2}</b>`,
    ``,
    `⏱️ Минут на поле:\n${compare(data1.minutes, data2.minutes)}`,
    `🏃‍♂️ Ср. макс. скорость:\n${compare(
      data1.avgMaxSpeed,
      data2.avgMaxSpeed,
      " км/ч"
    )}`,
    `⚡ Ср. макс. ускорение:\n${compare(
      data1.avgMaxAcc,
      data2.avgMaxAcc,
      " м/с²"
    )}`,
    `🛑 Ср. макс. торможение:\n${compare(
      data1.avgMaxDec,
      data2.avgMaxDec,
      " м/с²"
    )}`,
    `📏 Дист. Z4-Z5:\n${compare(
      data1.z4z5Distance,
      data2.z4z5Distance,
      " м/мин"
    )}`,
    `🔥 Метабол. сила:\n${compare(
      data1.metabolicPower,
      data2.metabolicPower,
      " Вт/кг"
    )}`,
  ].join("\n\n");
}
module.exports = {formatAspComparison}; // ✅ экспорт через объект
