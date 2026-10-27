# Contributing — Butterfly PHP

Спасибо за интерес к проекту. Ниже — минимальный контур для изменений.

## Требования

- PHP **8.5.12+** с расширениями `pdo_mysql`, `mbstring`, `openssl`, `json`, `fileinfo`, `opcache`.
- MySQL **8.0+** (в проекте используется тип `JSON`).
- Node.js 24+ — только для браузерных проверок через headless Edge.

## Локальная проверка

```powershell
copy .env.example .env
php scripts/migrate.php
php scripts/seed-demo.php
php -S 127.0.0.1:8093 -t public router.php
```

В отдельном терминале:

```powershell
php tests/api_test.php
$env:BASE_URL = "http://127.0.0.1:8093"
node tests/ui-smoke.mjs
node tests/final-check.mjs
```

После тестов верните чистое демо:

```powershell
php scripts/cleanup-qa.php
php scripts/seed-demo.php
```

## Правила изменений

- Не коммитьте `.env`, логи, дампы БД, токены и пароли.
- PHP: `declare(strict_types=1)`, подготовленные PDO-запросы, без внешних CDN.
- Новые API-маршруты должны поддерживать локальный префикс `/api/...` и хостинговый `/api.php/...`.
- При изменении статики поднимайте версию кэша в `public/sw.js`.
- Миграции БД — отдельным SQL-файлом в `migrations/`; проверяйте на пустой базе.
- Для UI-изменений приложите результат `tests/ui-smoke.mjs` (или скриншот).

## Pull request

1. Опишите, что и зачем изменено.
2. Перечислите проверки, которые прошли.
3. Укажите, что не проверено.
4. Не смешивайте рефакторинг и функциональные изменения без необходимости.

## Лицензия

Отправляя изменения, вы соглашаетесь с лицензией проекта — [MIT](LICENSE).
