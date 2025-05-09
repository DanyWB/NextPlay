const fs = require("fs");
const path = require("path");

const languages = {};

function loadLanguage(lang) {
  if (!languages[lang]) {
    const filePath = path.join(__dirname, "..", "langs", `${lang}.json`);
    try {
      const data = fs.readFileSync(filePath, "utf-8");
      languages[lang] = JSON.parse(data);
    } catch (err) {
      console.error(`Ошибка загрузки языка ${lang}:`, err);
      languages[lang] = {};
    }
  }
  return languages[lang];
}

function t(lang, key, vars = {}) {
  const strings = loadLanguage(lang);

  // Получаем вложенное значение по пути "start.welcome"
  let text = key.split(".").reduce((obj, k) => obj?.[k], strings) || key;

  for (const [k, v] of Object.entries(vars)) {
    text = text.replace(new RegExp(`{${k}}`, "g"), v);
  }

  return text;
}

module.exports = {t};
