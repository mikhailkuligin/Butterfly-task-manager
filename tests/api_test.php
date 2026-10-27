<?php
declare(strict_types=1);

/**
 * Butterfly PHP — API-тесты (без PHPUnit и внешних зависимостей).
 * Запуск: php tests/api_test.php
 * Требуется запущенный сервер: php -S 127.0.0.1:8093 -t public router.php
 * BASE_URL можно переопределить переменной окружения.
 */

$BASE = rtrim(getenv('BASE_URL') ?: 'http://127.0.0.1:8093', '/');

$pass = 0;
$fail = 0;
$failures = [];

function section(string $title): void
{
    echo PHP_EOL . '== ' . $title . ' ==' . PHP_EOL;
}

function check(string $name, bool $condition, string $details = ''): void
{
    global $pass, $fail, $failures;
    if ($condition) {
        $pass++;
        echo '  [OK]   ' . $name . PHP_EOL;
    } else {
        $fail++;
        $failures[] = $name . ($details !== '' ? ' — ' . $details : '');
        echo '  [FAIL] ' . $name . ($details !== '' ? ' — ' . $details : '') . PHP_EOL;
    }
}

function same(string $name, mixed $actual, mixed $expected): void
{
    check($name, $actual === $expected, 'ожидалось ' . var_export($expected, true) . ', получено ' . var_export($actual, true));
}

/**
 * @return array{status:int,body:mixed,raw:string,headers:array<string,string>,cookie:string,setCookie:array<int,string>}
 */
function http_req(string $method, string $path, ?array $body = null, string $cookie = '', ?string $origin = null): array
{
    global $BASE;
    $headers = ['Accept: application/json'];
    if ($body !== null) {
        $headers[] = 'Content-Type: application/json';
    }
    if ($cookie !== '') {
        $headers[] = 'Cookie: ' . $cookie;
    }
    $headers[] = 'Origin: ' . ($origin ?? $BASE);
    $content = null;
    if ($body !== null) {
        $content = json_encode($body, JSON_UNESCAPED_UNICODE);
    }
    $opts = [
        'http' => [
            'method' => $method,
            'header' => implode("\r\n", $headers),
            'content' => $content,
            'ignore_errors' => true,
            'follow_location' => 0,
            'timeout' => 20,
        ],
        'ssl' => ['verify_peer' => false, 'verify_peer_name' => false],
    ];
    $ctx = stream_context_create($opts);
    $raw = @file_get_contents($BASE . $path, false, $ctx);
    $http_response_header = $http_response_header ?? [];
    $status = 0;
    $headersMap = [];
    $setCookie = [];
    foreach ($http_response_header as $line) {
        if (preg_match('#^HTTP/\S+\s+(\d+)#', $line, $m)) {
            $status = (int) $m[1];
            continue;
        }
        $pos = strpos($line, ':');
        if ($pos === false) {
            continue;
        }
        $name = strtolower(trim(substr($line, 0, $pos)));
        $value = trim(substr($line, $pos + 1));
        if ($name === 'set-cookie') {
            $setCookie[] = $value;
        }
        $headersMap[$name] = $value;
    }
    $cookieValue = '';
    foreach ($setCookie as $sc) {
        if (preg_match('/^bf_sid=([^;]*)/', $sc, $m)) {
            $cookieValue = $m[1] === '' ? '' : 'bf_sid=' . $m[1];
        }
    }
    $decoded = null;
    if ($raw !== false && $raw !== '') {
        $decoded = json_decode($raw, true);
    }
    return [
        'status' => $status,
        'body' => $decoded,
        'raw' => $raw === false ? '' : $raw,
        'headers' => $headersMap,
        'cookie' => $cookieValue,
        'setCookie' => $setCookie,
    ];
}

function rand_name(string $prefix = 'qa'): string
{
    return $prefix . '_' . bin2hex(random_bytes(4));
}

function register_user(string $prefix = 'qa', string $password = 'long-enough-pass'): array
{
    $name = rand_name($prefix);
    $res = http_req('POST', '/api/register', ['username' => $name, 'password' => $password]);
    return ['name' => $name, 'password' => $password, 'res' => $res, 'cookie' => $res['cookie']];
}

function login_user(string $name, string $password): array
{
    $res = http_req('POST', '/api/login', ['username' => $name, 'password' => $password, 'remember' => false]);
    return ['res' => $res, 'cookie' => $res['cookie']];
}

/* ============================ health и статика ============================ */
section('Здоровье и статика');
$health = http_req('GET', '/api/health');
same('health: 200', $health['status'], 200);
check('health: ok=true', ($health['body']['ok'] ?? false) === true);

$loginPage = http_req('GET', '/login');
same('GET /login: 200', $loginPage['status'], 200);
check('GET /login: HTML', str_contains($loginPage['headers']['content-type'] ?? '', 'text/html'));
check('GET /login: нет внешних шрифтов/CDN', !str_contains($loginPage['raw'], 'fonts.googleapis') && !str_contains($loginPage['raw'], 'fonts.gstatic'));
check('GET /login: CSP есть', str_contains($loginPage['headers']['content-security-policy'] ?? '', "default-src 'self'"));
check('GET /login: X-Frame-Options DENY', ($loginPage['headers']['x-frame-options'] ?? '') === 'DENY');

$appPage = http_req('GET', '/');
same('GET /: 200', $appPage['status'], 200);
check('GET /: это приложение', str_contains($appPage['raw'], 'Butterfly') && str_contains($appPage['raw'], 'app.js'));

$install = http_req('GET', '/install');
same('GET /install: 200', $install['status'], 200);
check('GET /install: инструкция Safari', str_contains($install['raw'], 'На экран'));

$manifest = http_req('GET', '/manifest.webmanifest');
same('GET /manifest: 200', $manifest['status'], 200);
check('GET /manifest: standalone', ($manifest['body']['display'] ?? '') === 'standalone');

$sw = http_req('GET', '/sw.js');
same('GET /sw.js: 200', $sw['status'], 200);
check('GET /sw.js: MIME javascript', str_contains($sw['headers']['content-type'] ?? '', 'javascript'));
check('GET /sw.js: Service-Worker-Allowed', ($sw['headers']['service-worker-allowed'] ?? '') === '/');

$css = http_req('GET', '/pilot.css');
same('GET /pilot.css: 200', $css['status'], 200);
$icon = http_req('GET', '/icons/icon-192.png');
same('GET /icons/icon-192.png: 200', $icon['status'], 200);
check('иконка: image/png', str_contains($icon['headers']['content-type'] ?? '', 'image/png'));

/* ============================ доступ и вход ============================ */
section('Доступ и вход');
$anonState = http_req('GET', '/api/state');
same('state без сессии: 401', $anonState['status'], 401);
same('state без сессии: код', $anonState['body']['error']['code'] ?? '', 'UNAUTHORIZED');

$weak = http_req('POST', '/api/register', ['username' => rand_name('qa'), 'password' => '123']);
same('регистрация: слабый пароль 400', $weak['status'], 400);
$badName = http_req('POST', '/api/register', ['username' => 'ab', 'password' => 'long-enough-pass']);
same('регистрация: короткий логин 400', $badName['status'], 400);

$userA = register_user('qa');
same('регистрация: 201', $userA['res']['status'], 201);
check('регистрация: cookie выдана', $userA['cookie'] !== '');
$sc = implode(' | ', $userA['res']['setCookie']);
check('cookie: HttpOnly', str_contains($sc, 'HttpOnly'));
check('cookie: SameSite=Lax', str_contains($sc, 'SameSite=Lax'));

$me = http_req('GET', '/api/me', null, $userA['cookie']);
same('me: 200', $me['status'], 200);
same('me: username', $me['body']['user']['username'] ?? '', $userA['name']);

$dup = http_req('POST', '/api/register', ['username' => $userA['name'], 'password' => 'long-enough-pass']);
same('регистрация: дубликат 409', $dup['status'], 409);

// Выход и вход
http_req('POST', '/api/logout', [], $userA['cookie']);
$wrong = login_user($userA['name'], 'wrong-password-123');
same('вход: неверный пароль 401', $wrong['res']['status'], 401);
check('вход: общее сообщение', ($wrong['res']['body']['error']['message'] ?? '') === 'Неверный логин или пароль');

$loginOk = login_user($userA['name'], $userA['password']);
same('вход: 200', $loginOk['res']['status'], 200);
$userA['cookie'] = $loginOk['cookie'];
$me2 = http_req('GET', '/api/me', null, $userA['cookie']);
same('me после входа: 200', $me2['status'], 200);

// Лимит попыток (на несуществующем логине)
$rlName = rand_name('rl');
$last = null;
for ($i = 0; $i < 6; $i++) {
    $last = login_user($rlName, 'wrong-pass');
}
same('лимит входа: 429', $last['res']['status'], 429);
check('лимит входа: Retry-After', isset($last['res']['headers']['retry-after']));

/* ============================ база и изоляция ============================ */
section('Персональная база и изоляция');
$stateA = http_req('GET', '/api/state', null, $userA['cookie']);
same('state A: 200', $stateA['status'], 200);
same('state A: схема v2', $stateA['body']['data']['v'] ?? null, 2);
check('state A: предметы пустые у нового', count($stateA['body']['data']['subjects'] ?? []) === 0);

$markerA = 'marker-' . bin2hex(random_bytes(4));
$dataA = $stateA['body']['data'];
$dataA['plans'][] = ['id' => 'p' . bin2hex(random_bytes(4)), 'date' => date('Y-m-d'), 'text' => $markerA, 'done' => false];
$putA = http_req('PUT', '/api/state', ['rev' => $stateA['body']['rev'], 'data' => $dataA], $userA['cookie']);
same('сохранение A: 200', $putA['status'], 200);
check('сохранение A: rev увеличился', ($putA['body']['rev'] ?? 0) > ($stateA['body']['rev'] ?? 0));

$userB = register_user('iso');
same('регистрация B: 201', $userB['res']['status'], 201);
$stateB = http_req('GET', '/api/state', null, $userB['cookie']);
check('изоляция: B не видит план A', !str_contains(json_encode($stateB['body']['data'], JSON_UNESCAPED_UNICODE), $markerA));

$markerB = 'bmarker-' . bin2hex(random_bytes(4));
$dataB = $stateB['body']['data'];
$dataB['todos'][] = ['id' => 't' . bin2hex(random_bytes(4)), 'text' => $markerB, 'done' => false];
$putB = http_req('PUT', '/api/state', ['rev' => $stateB['body']['rev'], 'data' => $dataB], $userB['cookie']);
same('сохранение B: 200', $putB['status'], 200);

$stateA2 = http_req('GET', '/api/state', null, $userA['cookie']);
check('изоляция: A видит свой план', str_contains(json_encode($stateA2['body']['data'], JSON_UNESCAPED_UNICODE), $markerA));
check('изоляция: A не видит данные B', !str_contains(json_encode($stateA2['body']['data'], JSON_UNESCAPED_UNICODE), $markerB));

/* ============================ ревизии и валидация ============================ */
section('Ревизии, валидация, размер');
$userC = register_user('st');
same('регистрация C: 201', $userC['res']['status'], 201);
$stateC = http_req('GET', '/api/state', null, $userC['cookie']);
$revC = (int) $stateC['body']['rev'];
$dataC = $stateC['body']['data'];
$dataC['todos'][] = ['id' => 'a1', 'text' => 'Первое дело', 'done' => false];
$okPut = http_req('PUT', '/api/state', ['rev' => $revC, 'data' => $dataC], $userC['cookie']);
same('PUT: 200', $okPut['status'], 200);
$newRev = (int) $okPut['body']['rev'];
$stale = http_req('PUT', '/api/state', ['rev' => $revC, 'data' => $dataC], $userC['cookie']);
same('PUT со старой ревизией: 409', $stale['status'], 409);
same('409: код STATE_CONFLICT', $stale['body']['error']['code'] ?? '', 'STATE_CONFLICT');
same('409: актуальная ревизия', (int) ($stale['body']['rev'] ?? 0), $newRev);

$badVersion = http_req('PUT', '/api/state', ['rev' => $newRev, 'data' => ['v' => 3]], $userC['cookie']);
same('PUT с v=3: 400', $badVersion['status'], 400);

$big = $stateC['body']['data'];
$bigPlans = [];
for ($i = 0; $i < 1000; $i++) {
    $bigPlans[] = ['id' => 'p' . $i, 'date' => date('Y-m-d'), 'text' => str_repeat('x', 500), 'done' => false];
}
$big['plans'] = $bigPlans;
$oversize = http_req('PUT', '/api/state', ['rev' => $newRev, 'data' => $big], $userC['cookie']);
same('слишком большое состояние: 413', $oversize['status'], 413);

$freshC = http_req('GET', '/api/state', null, $userC['cookie']);
$revC2 = (int) $freshC['body']['rev'];
$badData = $freshC['body']['data'];
$badData['subjects'][] = ['id' => 'x1', 'name' => str_repeat('И', 100), 'color' => 'not-a-color'];
$badData['plans'][] = ['id' => 'x2', 'date' => '2026-01-01', 'text' => str_repeat('a', 1000), 'done' => false];
$sanPut = http_req('PUT', '/api/state', ['rev' => $revC2, 'data' => $badData], $userC['cookie']);
same('валидация: 200', $sanPut['status'], 200);
$sanState = http_req('GET', '/api/state', null, $userC['cookie']);
$subj = $sanState['body']['data']['subjects'][0] ?? [];
$plan = $sanState['body']['data']['plans'][0] ?? [];
check('валидация: имя предмета ≤ 60', mb_strlen($subj['name'] ?? '') <= 60);
same('валидация: невалидный цвет заменён', $subj['color'] ?? '', '#8a7a9c');
check('валидация: текст плана ≤ 500', mb_strlen($plan['text'] ?? '') <= 500);

/* ============================ экспорт и CSRF ============================ */
section('Экспорт и CSRF');
$exportA = http_req('GET', '/api/export', null, $userA['cookie']);
same('экспорт: 200', $exportA['status'], 200);
check('экспорт: attachment', str_contains($exportA['headers']['content-disposition'] ?? '', 'attachment'));
check('экспорт: no-store', ($exportA['headers']['cache-control'] ?? '') === 'no-store');
$jsonA = json_decode($exportA['raw'], true);
same('экспорт: app=butterfly', $jsonA['app'] ?? '', 'butterfly');
same('экспорт: schema 2', $jsonA['schema_version'] ?? null, 2);
same('экспорт: логин', $jsonA['account']['login'] ?? '', $userA['name']);
check('экспорт: содержит свой маркер', str_contains($exportA['raw'], $markerA));
check('экспорт: без паролей/сессий', !preg_match('/pw_hash|pw_salt|bf_sid|password/i', $exportA['raw']));
$exportB = http_req('GET', '/api/export', null, $userB['cookie']);
check('экспорт: B не содержит маркер A', !str_contains($exportB['raw'], $markerA));

$csrf = http_req('PUT', '/api/state', ['rev' => $newRev, 'data' => $stateC['body']['data']], $userC['cookie'], 'http://evil.example');
same('CSRF: чужой Origin 403', $csrf['status'], 403);

/* ============================ пароль и удаление ============================ */
section('Пароль, выход, удаление');
$userP = register_user('pw', 'old-password-123');
same('регистрация P: 201', $userP['res']['status'], 201);
$changeWrong = http_req('POST', '/api/password', ['current' => 'nope', 'new' => 'new-password-123'], $userP['cookie']);
same('смена пароля: неверный текущий 400', $changeWrong['status'], 400);
$changeOk = http_req('POST', '/api/password', ['current' => 'old-password-123', 'new' => 'new-password-123'], $userP['cookie']);
same('смена пароля: 200', $changeOk['status'], 200);
$oldLogin = login_user($userP['name'], 'old-password-123');
same('вход со старым паролем: 401', $oldLogin['res']['status'], 401);
$newLogin = login_user($userP['name'], 'new-password-123');
same('вход с новым паролем: 200', $newLogin['res']['status'], 200);

$logout = http_req('POST', '/api/logout', [], $newLogin['cookie']);
same('выход: 200', $logout['status'], 200);
$afterLogout = http_req('GET', '/api/me', null, $newLogin['cookie']);
same('после выхода me: 401', $afterLogout['status'], 401);

$userD = register_user('del', 'delete-me-123');
same('регистрация D: 201', $userD['res']['status'], 201);
$delWrong = http_req('POST', '/api/account/delete', ['password' => 'wrong'], $userD['cookie']);
same('удаление: неверный пароль 400', $delWrong['status'], 400);
$delOk = http_req('POST', '/api/account/delete', ['password' => 'delete-me-123'], $userD['cookie']);
same('удаление: 200', $delOk['status'], 200);
$delLogin = login_user($userD['name'], 'delete-me-123');
same('вход удалённого: 401', $delLogin['res']['status'], 401);

/* ============================ прочее ============================ */
section('Прочее');
$notFound = http_req('GET', '/api/unknown');
same('неизвестный API: 404', $notFound['status'], 404);
$dash = http_req('GET', '/api/state', null, '');
same('state с пустой cookie: 401', $dash['status'], 401);

/* ============================ итог ============================ */
echo PHP_EOL . str_repeat('=', 52) . PHP_EOL;
echo "ИТОГО: пройдено {$pass}, провалено {$fail}" . PHP_EOL;
if ($failures !== []) {
    echo 'Провалы:' . PHP_EOL;
    foreach ($failures as $f) {
        echo '  - ' . $f . PHP_EOL;
    }
}
exit($fail === 0 ? 0 : 1);
