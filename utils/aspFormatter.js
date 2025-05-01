function formatAspComparison(data1, data2, label1, label2) {
  const compare = (a, b, index, unit = "") => {
    // 🛑 Если это торможение (index === 3), то чем меньше значение — тем лучше
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
    `📊 <b>Сравнение ASP: ${label1} → ${label2}</b>`,
    ``,
    `⏱️ Минут на поле:\n${compare(data1.minutes, data2.minutes, 0)}`,
    `🏃‍♂️ Ср. макс. скорость:\n${compare(
      data1.avgMaxSpeed,
      data2.avgMaxSpeed,
      1,
      " км/ч"
    )}`,
    `⚡ Ср. макс. ускорение:\n${compare(
      data1.avgMaxAcc,
      data2.avgMaxAcc,
      2,
      " м/с²"
    )}`,
    `🛑 Ср. макс. торможение:\n${compare(
      data1.avgMaxDec,
      data2.avgMaxDec,
      3,
      " м/с²"
    )}`,
  ].join("\n\n");
}

module.exports = {formatAspComparison};
