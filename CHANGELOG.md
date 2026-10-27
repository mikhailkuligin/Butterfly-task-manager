# Changelog

All notable changes to this project are documented here. The format is
[Keep a Changelog](https://keepachangelog.com/en/2.0.0/) 2.0.0, and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Отображаемое имя пользователя (`users.display_name`): на главной странице видны имя, логин и кнопка «Выйти».
- Скрипты разработчика `scripts/add-user.php` и `scripts/add-user.ps1` для создания/обновления аккаунтов без публичной регистрации.
- Раздел **«Отладка»** в приложении: статус API/сессии/SW, поле ввода и кнопка «Отправить»; запросы сохраняются в `debug_requests` и доступны только владельцу и разработчику.

### Changed

- Публичная регистрация закрыта: вкладка регистрации удалена со страницы входа, `POST /api/register` в production отвечает 403 `REGISTRATION_DISABLED`; локальная разработка (`APP_ENV=development`) сохранена для тестов.
- «Запомнить меня» теперь сохраняет сессию до выхода (практически 10 лет) вместо 30 дней.

### Migration

- `migrations/002_users_display_name.sql` — добавить `users.display_name`.

## [1.0.0] - 2026-10-27

### Added

- PHP 8.5.12 + MySQL backend for the Butterfly study planner: accounts, sessions, per-user state, rate limits, JSON export.
- Personal state API with optimistic revisions (`rev`) and conflict handling.
- PWA frontend: offline shell, service worker, install prompt, responsive mobile layout.
- Security baseline: Argon2id passwords, DB-backed rate limits, CSRF origin checks, CSP and security headers, protected `.env` and application directories.
- API test suite (`tests/api_test.php`, 80 checks) and browser smoke checks via headless Edge/CDP.
- Deployment documentation for shared hosting and a WinSCP-based `deploy.ps1` sync script.
- QA task, QA report, screenshots and audit artifacts.

### Fixed

- HTTPS redirect loop behind an nginx reverse proxy (`X-Forwarded-Proto`).
- 404s on extensionless routes on nginx hosting; frontend uses `/api.php/<route>` and `.html` pages.
- Uncaught CSRF exception returned 500 instead of 403.
- Direct access to `api.php` and application internals is denied.
- PHP version disclosure via `X-Powered-By` removed.

[Unreleased]: https://github.com/mikhailkuligin/butterfly-planner/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/mikhailkuligin/butterfly-planner/releases/tag/v1.0.0
