<?php
declare(strict_types=1);

// Точка входа API. Все запросы /api/* приходят сюда (через .htaccess или router.php).
// Поддерживаем две раскладки:
//   1) local/архив:   public/api.php  → ../app/api.php
//   2) shared-хостинг: docroot/api.php → ./app/api.php (app внутри веб-корня)
$candidates = [
    __DIR__ . '/../app/api.php',
    __DIR__ . '/app/api.php',
];
foreach ($candidates as $candidate) {
    if (is_file($candidate)) {
        require $candidate;
        exit;
    }
}

http_response_code(500);
header('Content-Type: text/plain; charset=utf-8');
echo 'Application not found';
