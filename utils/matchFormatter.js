function formatMatchStats(data) {
  return `📊 <b>Профиль матча</b>

⏱️ Минут на поле: <b>${data.minutes.toFixed(0)}</b>
📏 Дистанция: <b>${data.totalDistance.toFixed(0)} м</b>
🚀 Макс. скорость: <b>${data.maxSpeed.toFixed(1)} км/ч</b>
⚡ Ускорения: <b>${data.acc}</b>
🛑 Торможения: <b>${data.dec}</b>
🔥 Z4-Z5: <b>${data.z4z5.toFixed(1)} м/мин</b>
💥 Мощность: <b>${data.metabolicPower.toFixed(2)} Вт/кг</b>`;
}

function formatMatchComparison(data1, data2) {
  function diffLabel(a, b, unit = "") {
    const diff = b - a;
    const sign = diff > 0 ? "🔼" : diff < 0 ? "🔽" : "";
    return `${sign} ${Math.abs(diff).toFixed(1)}${unit}`;
  }

  return `📊 <b>Сравнение матчей</b>

⏱️ Минут: <b>${data1.minutes.toFixed(0)}</b> → <b>${data2.minutes.toFixed(
    0
  )}</b> ${diffLabel(data1.minutes, data2.minutes)}
📏 Дистанция: <b>${data1.totalDistance.toFixed(
    0
  )}</b> → <b>${data2.totalDistance.toFixed(0)}</b> ${diffLabel(
    data1.totalDistance,
    data2.totalDistance
  )}
🚀 Макс. скорость: <b>${data1.maxSpeed.toFixed(
    1
  )}</b> → <b>${data2.maxSpeed.toFixed(1)}</b> ${diffLabel(
    data1.maxSpeed,
    data2.maxSpeed
  )}
⚡ Ускорения: <b>${data1.acc}</b> → <b>${data2.acc}</b> ${diffLabel(
    data1.acc,
    data2.acc
  )}
🛑 Торможения: <b>${data1.dec}</b> → <b>${data2.dec}</b> ${diffLabel(
    data1.dec,
    data2.dec
  )}
🔥 Z4-Z5: <b>${data1.z4z5.toFixed(1)}</b> → <b>${data2.z4z5.toFixed(
    1
  )}</b> ${diffLabel(data1.z4z5, data2.z4z5)}
💥 Мощность: <b>${data1.metabolicPower.toFixed(
    2
  )}</b> → <b>${data2.metabolicPower.toFixed(2)}</b> ${diffLabel(
    data1.metabolicPower,
    data2.metabolicPower,
    " Вт/кг"
  )}`;
}

module.exports = {
  formatMatchStats,
  formatMatchComparison,
};
