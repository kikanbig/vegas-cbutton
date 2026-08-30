# Vegas · Кнопка контакта

Отдельный инстанс кнопки контакта для салонов Vegas. Форк проекта CButton (21vek.by): лендинг, PWA для продавцов, админ-панель и воронка консультаций.

## Стек

- Vite + React + TypeScript
- Tailwind CSS, shadcn/ui
- Supabase (auth, данные, edge functions)
- Railway (Docker + Caddy)

## Локальный запуск

```sh
cp .env.example .env
# заполните ключи Supabase
npm i
npm run dev
```

## Деплой

Пуш в `main` собирает фронт в Docker и отдаёт статику через Caddy на Railway. Переменные `VITE_*` нужны на этапе сборки.
