<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

function uuid4(): string
{
    $d = random_bytes(16);
    $d[6] = chr((ord($d[6]) & 0x0f) | 0x40);
    $d[8] = chr((ord($d[8]) & 0x3f) | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($d), 4));
}

function handle_api(): never
{
    security_headers();

    $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
    $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';

    // nginx на shared-хостинге не применяет .htaccess-rewrite для /api/*,
    // поэтому фронтенд ходит через /api.php/<route>. Приводим путь к /api/<route>.
    if (str_starts_with($path, '/api.php/')) {
        $path = '/api' . substr($path, strlen('/api.php'));
    }

    try {
        check_origin();
        $pdo = db();

        if ($path === '/api/health' && $method === 'GET') {
            json_response(200, ['ok' => true, 'version' => '1.0.0-php', 'time' => gmdate('c')]);
        }

        if ($path === '/api/register' && $method === 'POST') {
            // Публичная регистрация закрыта. Аккаунты создаёт разработчик
            // скриптом scripts/add-user.php. Исключение — локальная разработка.
            if (env('APP_ENV') !== 'development') {
                throw new ApiError(403, 'Регистрация закрыта. Аккаунт создаёт администратор.', 'REGISTRATION_DISABLED');
            }
            $limit = rate_limit($pdo, 'reg:' . client_ip(), 60, 3600);
            if (!$limit['allowed']) {
                error_response(429, 'Слишком много регистраций. Попробуй позже.', 'RATE_LIMIT', ['Retry-After' => (string) $limit['retry_after']]);
            }
            $body = read_json_body();
            $username = validate_username($body['username'] ?? null);
            $password = validate_password($body['password'] ?? null, 8);
            $userId = create_user($pdo, $username, $password);

            if (random_int(1, 100) === 1) {
                cleanup_sessions($pdo);
            }
            $session = create_session($pdo, $userId, true);
            set_session_cookie($session['token'], 3650 * 86400);
            json_response(201, ['user' => ['username' => $username, 'name' => '']]);
        }

        if ($path === '/api/login' && $method === 'POST') {
            $body = read_json_body();
            $usernameRaw = is_string($body['username'] ?? null) ? trim($body['username']) : '';
            $usernameKey = mb_strtolower(mb_substr($usernameRaw, 0, 64, 'UTF-8'), 'UTF-8') ?: 'empty';
            $ip = client_ip();
            $perUser = rate_limit($pdo, 'login:' . $usernameKey . ':' . $ip, 5, 900);
            $perIp = rate_limit($pdo, 'login-ip:' . $ip, 30, 900);
            if (!$perUser['allowed'] || !$perIp['allowed']) {
                $retry = max($perUser['retry_after'], $perIp['retry_after']);
                error_response(429, 'Слишком много попыток входа. Подожди немного.', 'RATE_LIMIT', ['Retry-After' => (string) $retry]);
            }

            $stmt = $pdo->prepare('SELECT id, username, display_name, pw_hash FROM users WHERE username_lc = ? LIMIT 1');
            $stmt->execute([mb_strtolower($usernameRaw, 'UTF-8')]);
            $user = $stmt->fetch();
            $ok = $user && password_verify_value((string) ($body['password'] ?? ''), (string) $user['pw_hash']);
            if (!$ok) {
                throw new ApiError(401, 'Неверный логин или пароль', 'BAD_CREDENTIALS');
            }

            clear_rate_limit($pdo, 'login:' . $usernameKey . ':' . $ip);
            clear_rate_limit($pdo, 'login-ip:' . $ip);
            $remember = ($body['remember'] ?? false) === true;
            $session = create_session($pdo, (string) $user['id'], $remember);
            set_session_cookie($session['token'], ($remember ? 3650 : 7) * 86400);
            json_response(200, ['user' => ['username' => (string) $user['username'], 'name' => (string) ($user['display_name'] ?? '')]]);
        }

        if ($path === '/api/logout' && $method === 'POST') {
            $user = current_user($pdo);
            if ($user !== null) {
                $del = $pdo->prepare('DELETE FROM sessions WHERE token_hash = ?');
                $del->execute([$user['tokenHash']]);
            }
            clear_session_cookie();
            json_response(200, ['ok' => true]);
        }

        if ($path === '/api/me' && $method === 'GET') {
            $user = require_user($pdo);
            $state = user_state($pdo, $user['userId']);
            json_response(200, ['user' => ['username' => $user['username'], 'name' => $user['name']], 'rev' => $state['rev']]);
        }

        $knownPaths = ['/api/state', '/api/password', '/api/account/delete', '/api/export', '/api/debug'];
        if (!in_array($path, $knownPaths, true)) {
            throw new ApiError(404, 'Не найдено', 'NOT_FOUND');
        }

        $user = require_user($pdo);

        if ($path === '/api/debug' && $method === 'GET') {
            $stmt = $pdo->prepare('SELECT id, body, created_at, status FROM debug_requests WHERE user_id = ? ORDER BY created_at DESC LIMIT 20');
            $stmt->execute([$user['userId']]);
            $requests = [];
            foreach ($stmt->fetchAll() as $row) {
                $requests[] = [
                    'id' => (string) $row['id'],
                    'text' => (string) $row['body'],
                    'created_at' => (int) $row['created_at'],
                    'status' => (string) $row['status'],
                ];
            }
            json_response(200, ['requests' => $requests]);
        }

        if ($path === '/api/debug' && $method === 'POST') {
            $limit = rate_limit($pdo, 'debug:' . $user['userId'], 20, 3600);
            if (!$limit['allowed']) {
                error_response(429, 'Слишком много запросов. Попробуй позже.', 'RATE_LIMIT', ['Retry-After' => (string) $limit['retry_after']]);
            }
            $body = read_json_body(20000);
            $text = is_string($body['text'] ?? null) ? trim($body['text']) : '';
            $len = mb_strlen($text, 'UTF-8');
            if ($len < 3 || $len > 5000) {
                throw new ApiError(400, 'Текст запроса: от 3 до 5000 символов', 'INVALID_DEBUG_TEXT');
            }
            $id = uuid4();
            $createdAt = time();
            $ins = $pdo->prepare('INSERT INTO debug_requests (id, user_id, body, created_at, status) VALUES (?, ?, ?, ?, ?)');
            $ins->execute([$id, $user['userId'], $text, $createdAt, 'new']);
            json_response(201, ['id' => $id, 'created_at' => $createdAt]);
        }

        if ($path === '/api/state' && $method === 'GET') {
            json_response(200, user_state($pdo, $user['userId']));
        }

        if ($path === '/api/state' && $method === 'PUT') {
            $body = read_json_body();
            $validated = validate_state($body['data'] ?? null);
            if ($validated['size'] > 524288) {
                throw new ApiError(413, 'Слишком много данных для сохранения', 'STATE_TOO_LARGE');
            }
            $current = user_state($pdo, $user['userId']);
            $clientRev = isset($body['rev']) && is_numeric($body['rev']) ? (int) $body['rev'] : -1;
            if ($clientRev !== $current['rev']) {
                json_response(409, [
                    'error' => ['code' => 'STATE_CONFLICT', 'message' => 'Данные изменены на другом устройстве. Обнови или сохрани поверх.'],
                    'rev' => $current['rev'],
                ]);
            }
            $nextRev = $current['rev'] + 1;
            $upd = $pdo->prepare('UPDATE states SET rev = ?, data = ?, updated_at = ? WHERE user_id = ? AND rev = ?');
            $upd->execute([
                $nextRev,
                json_encode($validated['state'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                time(),
                $user['userId'],
                $current['rev'],
            ]);
            if ($upd->rowCount() !== 1) {
                $fresh = user_state($pdo, $user['userId']);
                json_response(409, ['error' => ['code' => 'STATE_CONFLICT', 'message' => 'Данные изменены на другом устройстве.'], 'rev' => $fresh['rev']]);
            }
            json_response(200, ['rev' => $nextRev]);
        }

        if ($path === '/api/password' && $method === 'POST') {
            $body = read_json_body();
            $stmt = $pdo->prepare('SELECT pw_hash FROM users WHERE id = ? LIMIT 1');
            $stmt->execute([$user['userId']]);
            $row = $stmt->fetch();
            if (!$row || !password_verify_value((string) ($body['current'] ?? ''), (string) $row['pw_hash'])) {
                throw new ApiError(400, 'Текущий пароль неверный', 'BAD_CURRENT_PASSWORD');
            }
            $new = validate_password($body['new'] ?? null, 8);
            $upd = $pdo->prepare('UPDATE users SET pw_hash = ? WHERE id = ?');
            $upd->execute([password_hash_value($new), $user['userId']]);
            $del = $pdo->prepare('DELETE FROM sessions WHERE user_id = ? AND token_hash != ?');
            $del->execute([$user['userId'], $user['tokenHash']]);
            json_response(200, ['ok' => true]);
        }

        if ($path === '/api/account/delete' && $method === 'POST') {
            $body = read_json_body();
            $stmt = $pdo->prepare('SELECT pw_hash FROM users WHERE id = ? LIMIT 1');
            $stmt->execute([$user['userId']]);
            $row = $stmt->fetch();
            if (!$row || !password_verify_value((string) ($body['password'] ?? ''), (string) $row['pw_hash'])) {
                throw new ApiError(400, 'Пароль неверный', 'BAD_PASSWORD');
            }
            $pdo->beginTransaction();
            try {
                $pdo->prepare('DELETE FROM sessions WHERE user_id = ?')->execute([$user['userId']]);
                $pdo->prepare('DELETE FROM states WHERE user_id = ?')->execute([$user['userId']]);
                $pdo->prepare('DELETE FROM users WHERE id = ?')->execute([$user['userId']]);
                $pdo->commit();
            } catch (Throwable $e) {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                throw $e;
            }
            clear_session_cookie();
            json_response(200, ['ok' => true]);
        }

        if ($path === '/api/export' && $method === 'GET') {
            $state = user_state($pdo, $user['userId']);
            $payload = [
                'app' => 'butterfly',
                'schema_version' => 2,
                'exported_at' => gmdate('c'),
                'account' => ['login' => $user['username']],
                'data' => $state['data'],
            ];
            $body = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
            $date = today_key();
            $ascii = 'butterfly-' . $date . '.json';
            $utf8 = rawurlencode('butterfly-' . $user['username'] . '-' . $date . '.json');
            http_response_code(200);
            header('Content-Type: application/json; charset=utf-8');
            header('Content-Disposition: attachment; filename="' . $ascii . '"; filename*=UTF-8\'\'' . $utf8);
            header('Cache-Control: no-store');
            header('Content-Length: ' . strlen($body));
            echo $body;
            exit;
        }

        throw new ApiError(404, 'Не найдено', 'NOT_FOUND');
    } catch (ApiError $e) {
        error_response($e->status, $e->getMessage(), $e->errorCode);
    } catch (Throwable $e) {
        error_log('API 500: ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
        error_response(500, 'Внутренняя ошибка сервера', 'INTERNAL_ERROR');
    }
}

handle_api();
