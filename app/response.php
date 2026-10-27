<?php
declare(strict_types=1);

/** Ошибка API с HTTP-кодом. */
final class ApiError extends RuntimeException
{
    public function __construct(
        public readonly int $status,
        string $message,
        public readonly string $errorCode = 'ERROR'
    ) {
        parent::__construct($message);
    }
}

/** Единые заголовки безопасности для API и статики. */
function security_headers(): void
{
    header_remove('X-Powered-By');
    $csp = implode('; ', [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data:",
        "font-src 'self'",
        "connect-src 'self'",
        "manifest-src 'self'",
        "worker-src 'self'",
        "base-uri 'none'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        "object-src 'none'",
    ]);
    header('Content-Security-Policy: ' . $csp);
    header('X-Content-Type-Options: nosniff');
    header('Referrer-Policy: no-referrer');
    header('X-Frame-Options: DENY');
    header('Permissions-Policy: geolocation=(), camera=(), microphone=(), payment=(), usb=()');
    header('Cross-Origin-Opener-Policy: same-origin');
    header('Cross-Origin-Resource-Policy: same-origin');
    if (env_bool('COOKIE_SECURE', false)) {
        header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
    }
}

function json_response(int $status, mixed $payload, array $extraHeaders = []): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    foreach ($extraHeaders as $name => $value) {
        header($name . ': ' . $value);
    }
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function error_response(int $status, string $message, string $code = 'ERROR', array $extraHeaders = []): never
{
    json_response($status, ['error' => ['code' => $code, 'message' => $message]], $extraHeaders);
}

/** Проверка Origin для небезопасных методов (CSRF-барьер). */
function check_origin(): void
{
    $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
    if (!in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {
        return;
    }
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin === '') {
        return; // не-браузерные клиенты; cookie-CSRF исключён SameSite=Lax
    }
    $host = $_SERVER['HTTP_HOST'] ?? '';
    $allowed = ['http://' . $host, 'https://' . $host];
    if (!in_array($origin, $allowed, true)) {
        throw new ApiError(403, 'Запрещённый источник запроса', 'BAD_ORIGIN');
    }
}

/** Чтение JSON-тела с ограничением размера. */
function read_json_body(int $limit = 655360): array
{
    $type = strtolower(trim(explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0]));
    if ($type !== 'application/json') {
        throw new ApiError(415, 'Ожидается application/json', 'UNSUPPORTED_MEDIA_TYPE');
    }
    $length = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
    if ($length > $limit) {
        throw new ApiError(413, 'Слишком большой запрос', 'PAYLOAD_TOO_LARGE');
    }
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        return [];
    }
    if (strlen($raw) > $limit) {
        throw new ApiError(413, 'Слишком большой запрос', 'PAYLOAD_TOO_LARGE');
    }
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        throw new ApiError(400, 'Некорректный JSON', 'BAD_JSON');
    }
    return $data;
}

function client_ip(): string
{
    return (string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
}
