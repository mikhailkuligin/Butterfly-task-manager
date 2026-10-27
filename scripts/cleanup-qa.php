<?php
declare(strict_types=1);

// Локальный QA: удалить временных пользователей, созданных автотестами.
// НЕ ЗАПУСКАТЬ НА ПРОДАКШЕНЕ.
// Запуск: php scripts/cleanup-qa.php

require __DIR__ . '/../app/bootstrap.php';

$pdo = db();
$patterns = ['qa\_%', 'iso\_%', 'st\_%', 'pw\_%', 'del\_%', 'rl\_%', 'dbg\_%'];
$deleted = 0;
$pdo->beginTransaction();
foreach ($patterns as $pattern) {
    $stmt = $pdo->prepare('DELETE FROM users WHERE username_lc LIKE ?');
    $stmt->execute([$pattern]);
    $deleted += $stmt->rowCount();
}
$pdo->exec('DELETE FROM rate_limits');
$pdo->commit();

$left = $pdo->query('SELECT COUNT(*) AS c FROM users')->fetch();
echo "Удалено тестовых пользователей: {$deleted}. Осталось пользователей: " . ($left['c'] ?? '?') . PHP_EOL;
