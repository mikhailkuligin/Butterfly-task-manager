<?php
declare(strict_types=1);

// Применение SQL-миграций из migrations/*.sql к базе из .env.
// Запуск: php scripts/migrate.php
// Повторный запуск безопасен: применённые файлы пропускаются.

require __DIR__ . '/../app/bootstrap.php';

$pdo = db();
$pdo->exec('CREATE TABLE IF NOT EXISTS schema_migrations (
    name VARCHAR(191) NOT NULL PRIMARY KEY,
    applied_at BIGINT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci');

$applied = [];
foreach ($pdo->query('SELECT name FROM schema_migrations') as $row) {
    $applied[(string) $row['name']] = true;
}

$files = glob(dirname(__DIR__) . '/migrations/*.sql') ?: [];
sort($files);
if ($files === []) {
    fwrite(STDERR, "Миграции не найдены.\n");
    exit(1);
}

$mark = $pdo->prepare('INSERT IGNORE INTO schema_migrations (name, applied_at) VALUES (?, ?)');

foreach ($files as $file) {
    $name = basename($file);
    if (isset($applied[$name])) {
        echo 'Пропущено (уже применено): ' . $name . PHP_EOL;
        continue;
    }

    // Совместимость с базой, где 002 применена вручную (колонка уже есть).
    if ($name === '002_users_display_name.sql') {
        $col = $pdo->prepare("SHOW COLUMNS FROM users LIKE 'display_name'");
        $col->execute();
        if ($col->fetch()) {
            $mark->execute([$name, time()]);
            echo 'Отмечено как применённое: ' . $name . PHP_EOL;
            continue;
        }
    }

    $sql = file_get_contents($file);
    if ($sql === false || trim($sql) === '') {
        continue;
    }
    $pdo->exec($sql);
    $mark->execute([$name, time()]);
    echo 'Применено: ' . $name . PHP_EOL;
}
echo "Готово. База: " . (env('DB_NAME') ?? '?') . PHP_EOL;
