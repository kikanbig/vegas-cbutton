# Развёртывание Vegas · Кнопка контакта на VPS

Приложение для продавцов салонов Vegas: кнопка контакта, консультации, смены, админ-статистика.

Один процесс Node отдаёт и сайт, и API. Рядом — PostgreSQL. Отдельный Supabase не нужен.

**Репозиторий (private):** https://github.com/kikanbig/vegas-cbutton  
**Прод-домен:** `https://button.vegaspro.by`

Если нет доступа к репозиторию — напишите GitHub-логин владельцу репозитория (`kikanbig`), вас добавят Collaborator. Клонировать без доступа нельзя.

---

## Что должно получиться

```
браузер → nginx :443 (button.vegaspro.by)
              ↓
         Node :3001  (только 127.0.0.1, Docker)
              ↓
         Postgres :5432  (только внутри Docker-сети)
```

Схема базы создаётся **сама** при старте приложения (`migrate()`). Пустую базу руками наполнять не нужно.

---

## Требования к серверу

| | Минимум | Лучше |
|---|---|---|
| ОС | Ubuntu 24.04 LTS | то же |
| CPU | 1 vCPU | 2 vCPU |
| RAM | 1 ГБ (+ swap 2 ГБ) | 2 ГБ |
| Диск | 20 ГБ SSD | 40 ГБ SSD |
| Сеть | публичный IPv4 | то же |

Софт: Docker Engine + Docker Compose plugin, nginx, certbot.

```sh
# Ubuntu 24.04
sudo apt-get update
sudo apt-get install -y ca-certificates curl nginx
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"
# перелогиниться, затем:
docker --version
docker compose version
```

---

## 1. Код

```sh
sudo mkdir -p /opt/vegas-cbutton
sudo chown "$USER":"$USER" /opt/vegas-cbutton
git clone https://github.com/kikanbig/vegas-cbutton.git /opt/vegas-cbutton
cd /opt/vegas-cbutton
```

Ветка: `main`.

---

## 2. Секреты — файл `.env`

```sh
cp .env.example .env
nano .env
```

Обязательно заполнить:

| Переменная | Что поставить |
|---|---|
| `POSTGRES_PASSWORD` | Свой длинный пароль. Только латиница/цифры, без `@ : / # ?` — иначе сломается URL |
| `JWT_SECRET` | `openssl rand -hex 32` |
| `SMTP_PASS` | Пароль ящика `cbutton@vegas.by` (hoster.by). Есть у Кирилла Канюшика |
| `SMTP_USER` | `cbutton@vegas.by` |
| `SMTP_HOST` | `smtp.hoster.by` |
| `SMTP_PORT` | `465` |
| `SMTP_SECURE` | `true` |
| `MAIL_FROM` | `Vegas · Кнопка контакта <cbutton@vegas.by>` |
| `ALLOWED_EMAIL_DOMAIN` | `vegas.by` |
| `PORT` | `3001` |

`DATABASE_URL` в `.env` **можно не писать**: `docker-compose.yml` сам соберёт его из `POSTGRES_PASSWORD` на хост `postgres`.

Файл `.env` в git не попадает. Никому в чаты его не слать.

---

## 3. Запуск контейнеров

```sh
cd /opt/vegas-cbutton
docker compose up -d --build
docker compose ps
docker compose logs -f app
```

Ожидаемые строки в логе `app`:

```
Database schema is ready
Vegas button listening on 3001
```

Проверка с сервера:

```sh
curl -sS http://127.0.0.1:3001/api/health
# {"ok":true}
```

Postgres наружу не публикуется. Приложение слушает только `127.0.0.1:3001`.

Если сборка упала с OOM — добавьте swap 2 ГБ и повторите `docker compose up -d --build`.

---

## 4. DNS

В зоне `vegaspro.by`:

| Тип | Имя | Значение |
|---|---|---|
| A | `button` | публичный IPv4 этого VPS |

CNAME на Railway больше не нужен. Проверка: `dig +short button.vegaspro.by` должен показать IP сервера.

---

## 5. nginx + HTTPS

```sh
sudo cp /opt/vegas-cbutton/deploy/nginx.conf.example /etc/nginx/sites-available/button.vegaspro.by
sudo ln -sf /etc/nginx/sites-available/button.vegaspro.by /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d button.vegaspro.by
```

После этого сайт: `https://button.vegaspro.by`  
Проверка API: `https://button.vegaspro.by/api/health` → `{"ok":true}`

---

## 6. Почта и вход

Регистрация шлёт **один** 8-значный код на почту (подтверждение ящика). Дальше вход: email + пароль (минимум 8 символов).

Исходящая почта: SMTP hoster.by, ящик `cbutton@vegas.by`, порт 465 SSL. С VPS должен быть открыт исходящий TCP 465.

Админы (роль выдаётся при старте, если пользователь уже есть, и при регистрации):

- `serpokrylova@vegas.by`
- `trener@vegas.by`
- `kanyushik@vegas.by`

Админка: `https://button.vegaspro.by/admin`  
Приложение продавца: `https://button.vegaspro.by/app`  
Инструкция установки на телефон: `https://button.vegaspro.by/install`

Пустая база нормальна: схема появится сама, данные — после регистраций продавцов.

---

## Как накатывать доработки

Разработка идёт в GitHub, ветка `main`. Новый код **сам на сервер не приедет** — это не Railway. Когда в репозитории появляется коммит, на VPS делают обновление.

Одна команда (от пользователя, которому принадлежит `/opt/vegas-cbutton`):

```sh
cd /opt/vegas-cbutton && ./deploy/update.sh
```

Или вручную:

```sh
cd /opt/vegas-cbutton
git pull --ff-only origin main
docker compose up -d --build
curl -sS http://127.0.0.1:3001/api/health
```

Что происходит:

1. Скачивается свежий `main`.
2. Образ приложения пересобирается (фронт + API).
3. Контейнер `app` перезапускается. **Postgres и volume с данными не трогаются.**
4. При старте приложение само накатывает изменения схемы (`migrate()`). SQL руками не гонять.

Когда писать админу «нужно обновить»:

| Что изменилось | Их действие |
|---|---|
| Правка кода, UI, логики | `deploy/update.sh` |
| Новая таблица / поле | то же, миграция сама |
| Новая переменная в `.env` | Кирилл пишет, какую строку добавить в `.env`, затем `docker compose up -d` (пересборки часто не нужно) |
| Пароль SMTP / JWT | правят `.env`, `docker compose up -d` |

Автодеплой (webhook при пуше в `main`) можно повесить позже. Для начала достаточно обновлять по сообщению «выкатил на main» или раз в день, если виден новый коммит: `git log -1 origin/main`.

---

## Обслуживание

```sh
cd /opt/vegas-cbutton

# логи
docker compose logs -f --tail=200 app

# перезапуск без обновления кода
docker compose restart app

# бэкап базы
docker compose exec -T postgres pg_dump -U vegas vegas_cbutton | gzip > ~/vegas-cbutton-$(date +%F).sql.gz
```

Бэкап лучше повесить на cron раз в сутки. Том Postgres: Docker volume `vegas-cbutton_pgdata`.

Откат: `git checkout <commit>` и снова `docker compose up -d --build`. Данные в volume не трогаются.

---

## Частые проблемы

| Симптом | Что проверить |
|---|---|
| `DATABASE_URL is not set` / app рестартится | В `.env` есть `POSTGRES_PASSWORD`, перезапуск `docker compose up -d` |
| 502 от nginx | `docker compose ps` — app healthy? `curl 127.0.0.1:3001/api/health` |
| «Не удалось отправить письмо» | Это не ошибка регистрирующегося. SMTP с VPS не достучался до hoster.by — см. ниже |
| Не пускает регистрацию | `ALLOWED_EMAIL_DOMAIN=vegas.by` — только почта `@vegas.by` |
| Нет пункта «Админ-панель» | Пользователь не из списка админов или не перелогинился |
| `docker compose build` убит (137) | Мало RAM, добавить swap |

---

## Письма не уходят после деплоя

Сообщение «Не удалось отправить письмо» значит: переменные SMTP заданы, но сервер **не смог отправить** через `smtp.hoster.by`. Регистрация на сайте тут ни при чём.

```sh
cd /opt/vegas-cbutton
docker compose logs app --tail=100 | grep -i -E "Email send failed|SMTP"
```

Дальше с самого сервера (не с ноутбука):

```sh
# 1. Видит ли контейнер SMTP-порт hoster.by?
docker compose exec app node -e "require('net').connect({host:'smtp.hoster.by',port:465,timeout:8000},()=>{console.log('465 ok');process.exit(0)}).on('error',e=>{console.error('465 fail',e.message);process.exit(1)})"

# 2. Есть ли пароль в контейнере (длина, не сам пароль)
docker compose exec app node -e "console.log('SMTP_HOST',process.env.SMTP_HOST); console.log('SMTP_USER',process.env.SMTP_USER); console.log('SMTP_PASS_LEN', (process.env.SMTP_PASS||'').length)"
```

Типичные причины на корпоративном VPS:

1. **`getaddrinfo EAI_AGAIN smtp.hoster.by`** — контейнер не резолвит DNS, хотя сам сервер (`nslookup`) видит адрес. В `docker-compose.yml` уже прописаны DNS хостера и `extra_hosts`. После `git pull`: `docker compose up -d` (пересборка образа не нужна). Проверка: команда на 465 выше должна напечатать `465 ok`.
2. **Исходящий TCP 465/587 закрыт** хостером. Открыть до `smtp.hoster.by`.
3. **Неверный `SMTP_PASS`** в `.env` — после правки: `docker compose up -d`.
4. В пароле есть `$` — Compose может его съесть. Обернуть: `SMTP_PASS='...$'`.

Если IP `smtp.hoster.by` сменится, обновить `extra_hosts` в `docker-compose.yml` (`nslookup smtp.hoster.by` на хосте).

---

## Чего делать не нужно

- Отдельный контейнер «заранее» создавать и кому-то в него давать доступ
- Ставить Supabase
- Открывать Postgres в интернет
- Публиковать порт 3001 на `0.0.0.0` — только `127.0.0.1`
- Менять схему руками — приложение мигрирует само
- Копировать данные с Railway, если это новый контур (если нужен перенос — отдельная задача)

---

## Контакты по продукту

Владелец репозитория и секретов почты: Кирилл Канюшик.  
По развёртыванию после этой инструкции писать не нужно, кроме: нет доступа к GitHub или нет пароля SMTP.
