# Vegas · Кнопка контакта

Приложение для продавцов салонов Vegas: фиксация контакта с гостем, консультации, смены и админ-аналитика.

Стек: React + Node.js API + PostgreSQL. Отдельный Supabase не нужен.

Прод на своём VPS: см. [DEPLOY.md](DEPLOY.md). Репозиторий: https://github.com/kikanbig/vegas-cbutton

## Как это устроено

- Фронт и API живут в одном сервисе.
- Postgres — отдельный сервис в том же проекте Railway.
- Вход по email и паролю. Код на почту приходит один раз — чтобы подтвердить регистрацию.
- Первый зарегистрированный пользователь становится администратором.

## Локально

```sh
cp .env.example .env
# поднимите Postgres и пропишите DATABASE_URL
npm i
npm run dev:server   # API на :3001
npm run dev          # фронт на :8080, /api проксируется
```

## Почта

Когда будет домен, добавьте в Railway:

- `RESEND_API_KEY`
- `MAIL_FROM` — например `Vegas <noreply@ваш-домен>`
- `ALLOWED_EMAIL_DOMAIN` — если нужно пускать только корпоративную почту
