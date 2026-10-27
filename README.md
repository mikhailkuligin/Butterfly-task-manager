# Butterfly — учебный планер

[![PHP 8.5.12+](https://img.shields.io/badge/PHP-8.5.12%2B-777bb4?logo=php&logoColor=white)](https://www.php.net/)
[![MySQL 8](https://img.shields.io/badge/MySQL-8.0%2B-4479a1?logo=mysql&logoColor=white)](https://www.mysql.com/)
[![PWA](https://img.shields.io/badge/PWA-offline-5a0fc8)](https://web.dev/progressive-web-apps/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

> **Проект сделала моя дочка.** Butterfly — её личный планер для учёбы: расписание, контрольные, тренировки и планы на день в одном спокойном приложении.

Это PHP-версия приложения: серверная часть переписана на **PHP 8.5.12** и **MySQL**, фронтенд остался лёгким PWA без сборки и внешних зависимостей.

## Что умеет

- **Сегодня** — планы на день, прогресс, быстрые отметки.
- **Контрольные** — даты, обратный отсчёт, подготовка.
- **Календарь** — неделя/месяц, дедлайны и события.
- **Тренировки** — расписание и отметки о выполнении.
- **Учёба** — предметы, темы и прогресс.
- **Итоги дня** — настроение, победы, планы на завтра.
- **Таймер** — фокус-сессии и мини-таймер.
- **PWA** — установка на телефон, офлайн-просмотр, локальные шрифты и иконки.
- **Экспорт и настройки** — выгрузка данных в JSON, смена пароля, удаление аккаунта.

## Стек

- **PHP 8.5.12+**: PDO, подготовленные запросы, Argon2id, сессии в MySQL.
- **MySQL 8.0+**: пользователи, сессии, состояние в JSON, лимиты запросов.
- **Frontend**: ванильный HTML/CSS/JS, PWA, service worker, без CDN и сборки.
- **Тесты**: PHP API-тесты (80 проверок) и браузерный smoke-тест на Node + CDP.

## Быстрый старт

Нужны PHP 8.5.12+ с `pdo_mysql`, `mbstring`, `openssl`, `json`, `fileinfo`, `opcache` и MySQL 8.0+.

```powershell
copy .env.example .env
# укажите DB_*, APP_URL=http://127.0.0.1:8093, COOKIE_SECURE=0

php scripts/migrate.php
php scripts/seed-demo.php
php -S 127.0.0.1:8093 -t public router.php
```

Откройте <http://127.0.0.1:8093>.
Локальный демо-аккаунт: **`test` / `test`** — только для разработки.

## Аккаунты

Публичная регистрация закрыта. Аккаунт создаёт администратор:

```powershell
.\scripts\add-user.ps1 -Login student -Name "Ученица"
.\scripts\add-user.ps1 -Login student -Name "Ученица" -Update
```

Пароль вводится скрыто; через CLI его можно передать в `BF_PASSWORD` или stdin.

## Проверки

```powershell
php tests/api_test.php
php scripts/cleanup-qa.php
php scripts/seed-demo.php

$env:BASE_URL = "http://127.0.0.1:8093"
node tests/ui-smoke.mjs
node tests/final-check.mjs
```

API-тесты: **80 проверок**. UI-тесты требуют Node.js и headless Edge с CDP.

## Структура

```text
app/                 PHP-ядро: env, response, db, validate, auth, rate_limit, api
public/              веб-корень: index/login/install, app.js, style.css, api.php, PWA
migrations/          SQL-миграции MySQL
scripts/             миграции, создание пользователей, демо и очистка QA
tests/               API- и UI-тесты
router.php           роутер для локального php -S
DEBUG.md             политика приёма запросов на отладку
debug/DECISIONS.md   журнал решений по отладочным запросам
```

## Безопасность

- пароли — Argon2id, сессии — серверные, cookie `HttpOnly`, `SameSite=Lax`, `Secure` на HTTPS;
- CSRF — проверка `Origin`; лимиты входа и API — в MySQL;
- изоляция данных по `user_id`, подготовленные SQL-запросы;
- CSP без внешних CDN и трекеров, локальные шрифты и иконки;
- экспорт содержит только данные пользователя, без паролей и токенов.

## Автор

**Проект сделала моя дочка.** Butterfly задуман как её личный учебный планер; приложение развивается вместе с её задачами и привычками.

## Лицензия

MIT — см. [LICENSE](LICENSE).
