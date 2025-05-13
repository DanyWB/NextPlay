function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // понедельник
  return new Date(d.setDate(diff));
}

function formatWeekRange(startIso) {
  const start = new Date(startIso);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  const toStr = (d) =>
    d.toLocaleDateString("ru-RU", {day: "2-digit", month: "2-digit"});

  return `${toStr(start)} – ${toStr(end)}`;
}

module.exports = {getMonday, formatWeekRange};
