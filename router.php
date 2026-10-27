<?php
declare(strict_types=1);

/**
 * Роутер для локального запуска встроенным сервером PHP:
 *   php -S 127.0.0.1:8093 -t public router.php
 * На хостинге статику и /api обрабатывает Apache (.htaccess в public/).
 */

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';

if ($path === '/api' || str_starts_with($path, '/api/') || $path === '/api.php' || str_starts_with($path, '/api.php/')) {
    require __DIR__ . '/public/api.php';
    exit;
}

$pages = [
    '/' => 'index.html',
    '/index.html' => 'index.html',
    '/app' => 'index.html',
    '/login' => 'login.html',
    '/login.html' => 'login.html',
    '/install' => 'install.html',
    '/install.html' => 'install.html',
    '/favicon.ico' => 'icons/favicon-32.png',
    '/manifest.webmanifest' => 'manifest.webmanifest',
];

$rel = $pages[$path] ?? ltrim($path, '/');
if ($rel === '' || str_contains($rel, '..') || str_starts_with($rel, '.') || str_ends_with($rel, '.php')) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Not Found';
    exit;
}

$publicRoot = __DIR__ . '/public';
$file = $publicRoot . '/' . str_replace('/', DIRECTORY_SEPARATOR, $rel);
if (!is_file($file)) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Not Found';
    exit;
}

$ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
$mime = [
    'html' => 'text/html; charset=utf-8',
    'css' => 'text/css; charset=utf-8',
    'js' => 'text/javascript; charset=utf-8',
    'json' => 'application/json; charset=utf-8',
    'webmanifest' => 'application/manifest+json; charset=utf-8',
    'png' => 'image/png',
    'jpg' => 'image/jpeg',
    'jpeg' => 'image/jpeg',
    'svg' => 'image/svg+xml',
    'woff2' => 'font/woff2',
    'ico' => 'image/x-icon',
    'txt' => 'text/plain; charset=utf-8',
][$ext] ?? 'application/octet-stream';

$isAsset = in_array($ext, ['png', 'jpg', 'jpeg', 'svg', 'woff2', 'ico'], true);
$isHtml = $ext === 'html';

require_once __DIR__ . '/app/bootstrap.php';
security_headers();
header('Content-Type: ' . $mime);
header('Content-Length: ' . filesize($file));
if ($isAsset) {
    header('Cache-Control: public, max-age=86400');
} elseif ($rel === 'sw.js') {
    header('Cache-Control: no-cache');
    header('Service-Worker-Allowed: /');
} else {
    header('Cache-Control: no-cache');
}
readfile($file);
