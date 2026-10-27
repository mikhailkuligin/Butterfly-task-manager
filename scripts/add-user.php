<?php
declare(strict_types=1);

/**
 * Создание/обновление пользователя разработчиком.
 *
 * Пароль НЕ передаётся аргументом командной строки:
 *   - BF_PASSWORD (рекомендуется, через скрытый ввод в add-user.ps1)
 *   - или stdin: echo "пароль" | php scripts/add-user.php student --password-stdin
 *
 * Пример:
 *   php scripts/add-user.php student --name="Ученица"
 *   php scripts/add-user.php student --name="Ученица" --update
 */

require __DIR__ . '/../app/bootstrap.php';

$argvCopy = $argv;
array_shift($argvCopy);
$login = null;
$displayName = '';
$update = false;
$passwordStdin = false;

foreach ($argvCopy as $arg) {
    if ($arg === '--update') {
        $update = true;
    } elseif ($arg === '--password-stdin') {
        $passwordStdin = true;
    } elseif (str_starts_with($arg, '--name=')) {
        $displayName = substr($arg, 7);
    } elseif (!str_starts_with($arg, '-') && $login === null) {
        $login = $arg;
    } else {
        fwrite(STDERR, "Неизвестный аргумент: {$arg}\n");
        exit(2);
    }
}

if ($login === null || trim($login) === '') {
    fwrite(STDERR, "Использование: php scripts/add-user.php <login> [--name=\"Имя Фамилия\"] [--update]\n");
    exit(2);
}

$password = getenv('BF_PASSWORD');
if (!is_string($password) || $password === '') {
    $password = '';
    if ($passwordStdin || (function_exists('stream_isatty') && !stream_isatty(STDIN))) {
        $line = fgets(STDIN);
        $password = is_string($line) ? trim($line) : '';
    }
}
if ($password === '') {
    fwrite(STDERR, "Пароль не задан. Используйте BF_PASSWORD или --password-stdin (скрытый ввод — scripts/add-user.ps1).\n");
    exit(2);
}

try {
    $login = validate_username($login);
    $password = validate_password($password, 8);
    $displayName = trim((string) preg_replace('/\s+/u', ' ', $displayName));
    $displayName = mb_substr($displayName, 0, 60, 'UTF-8');

    $pdo = db();
    $stmt = $pdo->prepare('SELECT id FROM users WHERE username_lc = ? LIMIT 1');
    $stmt->execute([mb_strtolower($login, 'UTF-8')]);
    $existing = $stmt->fetch();

    if ($existing) {
        if (!$update) {
            fwrite(STDERR, "Пользователь {$login} уже существует. Для смены пароля/имени добавьте --update.\n");
            exit(1);
        }
        $upd = $pdo->prepare('UPDATE users SET pw_hash = ?, display_name = ? WHERE id = ?');
        $upd->execute([password_hash_value($password), $displayName, $existing['id']]);
        $del = $pdo->prepare('DELETE FROM sessions WHERE user_id = ?');
        $del->execute([$existing['id']]);
        user_state($pdo, (string) $existing['id']);
        echo "Обновлён пользователь: {$login}" . ($displayName !== '' ? " ({$displayName})" : '') . PHP_EOL;
    } else {
        create_user($pdo, $login, $password, $displayName);
        echo "Создан пользователь: {$login}" . ($displayName !== '' ? " ({$displayName})" : '') . PHP_EOL;
    }
} catch (ApiError $e) {
    fwrite(STDERR, "Ошибка {$e->errorCode}: {$e->getMessage()}\n");
    exit(1);
} catch (Throwable $e) {
    fwrite(STDERR, "Ошибка: {$e->getMessage()}\n");
    exit(1);
}
