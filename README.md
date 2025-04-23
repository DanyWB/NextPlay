Установка зависимостей: npm i;
Создать .env: 
  BOT_TOKEN=token
  ADMIN_ID=id-telegram
  GPEXE_USER=login
  GPEXE_PASS=password
  SYNC_INTERVAL_MINUTES=interval_of_sync(num)
Провести миграцию: npx knex migrate:latest
Запустить: npm start