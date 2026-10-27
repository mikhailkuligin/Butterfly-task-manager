<?php
declare(strict_types=1);

/** Пароли: Argon2id, если доступен, иначе bcrypt. */
function password_hash_value(string $password): string
{
    $algo = defined('PASSWORD_ARGON2ID') ? PASSWORD_ARGON2ID : PASSWORD_BCRYPT;
    $hash = password_hash($password, $algo);
    if ($hash === false) {
        throw new RuntimeException('Не удалось захешировать пароль');
    }
    return $hash;
}

function password_verify_value(string $password, string $hash): bool
{
    return password_verify($password, $hash);
}

/**
 * Создать пользователя (CLI разработчика; dev-регистрация использует тот же путь).
 * @return string user id
 */
function create_user(PDO $pdo, string $username, string $password, string $displayName = ''): string
{
    $username = validate_username($username);
    $password = validate_password($password, 8);
    $displayName = trim((string) preg_replace('/\s+/u', ' ', $displayName));
    $displayName = mb_substr($displayName, 0, 60, 'UTF-8');

    $stmt = $pdo->prepare('SELECT id FROM users WHERE username_lc = ? LIMIT 1');
    $stmt->execute([mb_strtolower($username, 'UTF-8')]);
    if ($stmt->fetch()) {
        throw new ApiError(409, 'Такой логин уже занят.', 'USERNAME_TAKEN');
    }

    $userId = vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex(random_bytes(16)), 4));
    $pdo->beginTransaction();
    try {
        $ins = $pdo->prepare('INSERT INTO users (id, username, username_lc, display_name, pw_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)');
        $ins->execute([$userId, $username, mb_strtolower($username, 'UTF-8'), $displayName, password_hash_value($password), time()]);
        $state = empty_state();
        $st = $pdo->prepare('INSERT INTO states (user_id, rev, data, updated_at) VALUES (?, 1, ?, ?)');
        $st->execute([$userId, json_encode($state, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), time()]);
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        if ($e instanceof PDOException && $e->getCode() === '23000') {
            throw new ApiError(409, 'Такой логин уже занят.', 'USERNAME_TAKEN');
        }
        throw $e;
    }
    return $userId;
}

function session_cookie_options(int $maxAge): array
{
    $options = [
        'expires' => time() + $maxAge,
        'path' => '/',
        'secure' => env_bool('COOKIE_SECURE', false),
        'httponly' => true,
        'samesite' => 'Lax',
    ];
    return $options;
}

function set_session_cookie(string $token, int $maxAge): void
{
    setcookie('bf_sid', $token, session_cookie_options($maxAge));
}

function clear_session_cookie(): void
{
    setcookie('bf_sid', '', [
        'expires' => time() - 3600,
        'path' => '/',
        'secure' => env_bool('COOKIE_SECURE', false),
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
}

function session_token_hash(string $token): string
{
    return hash('sha256', $token);
}

/**
 * @return array{token: string, expires_at: int}
 */
function create_session(PDO $pdo, string $userId, bool $remember): array
{
    // «Запомнить навсегда» — практически 10 лет; сессия удаляется при выходе.
    $days = $remember ? 3650 : 7;
    $token = bin2hex(random_bytes(32));
    $expiresAt = time() + $days * 86400;
    $stmt = $pdo->prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at, remember) VALUES (?, ?, ?, ?, ?)');
    $stmt->execute([session_token_hash($token), $userId, time(), $expiresAt, $remember ? 1 : 0]);
    return ['token' => $token, 'expires_at' => $expiresAt];
}

/**
 * @return array{userId: string, username: string, name: string, tokenHash: string}|null
 */
function current_user(PDO $pdo): ?array
{
    $token = $_COOKIE['bf_sid'] ?? '';
    if (!is_string($token) || $token === '') {
        return null;
    }
    $hash = session_token_hash($token);
    $stmt = $pdo->prepare('SELECT s.user_id AS userId, u.username AS username, u.display_name AS displayName, s.expires_at AS expiresAt FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? LIMIT 1');
    $stmt->execute([$hash]);
    $row = $stmt->fetch();
    if (!$row) {
        return null;
    }
    if ((int) $row['expiresAt'] < time()) {
        $del = $pdo->prepare('DELETE FROM sessions WHERE token_hash = ?');
        $del->execute([$hash]);
        return null;
    }
    return [
        'userId' => (string) $row['userId'],
        'username' => (string) $row['username'],
        'name' => (string) ($row['displayName'] ?? ''),
        'tokenHash' => $hash,
    ];
}

function require_user(PDO $pdo): array
{
    $user = current_user($pdo);
    if ($user === null) {
        throw new ApiError(401, 'Нужен вход', 'UNAUTHORIZED');
    }
    return $user;
}

function user_state(PDO $pdo, string $userId): array
{
    $stmt = $pdo->prepare('SELECT rev, data FROM states WHERE user_id = ? LIMIT 1');
    $stmt->execute([$userId]);
    $row = $stmt->fetch();
    if (!$row) {
        $empty = empty_state();
        $ins = $pdo->prepare('INSERT INTO states (user_id, rev, data, updated_at) VALUES (?, 1, ?, ?)');
        $ins->execute([$userId, json_encode($empty, JSON_UNESCAPED_UNICODE), time()]);
        return ['rev' => 1, 'data' => $empty];
    }
    return ['rev' => (int) $row['rev'], 'data' => json_decode((string) $row['data'], true, 512, JSON_THROW_ON_ERROR)];
}

function empty_state(): array
{
    return [
        'v' => 2,
        'subjects' => [], 'schedule' => [], 'plans' => [], 'todos' => [],
        'exams' => [], 'workouts' => [], 'study' => [], 'reviews' => [],
        'settings' => ['focus' => 25, 'short' => 5, 'long' => 15, 'every' => 4, 'sound' => true],
    ];
}
