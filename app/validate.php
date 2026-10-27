<?php
declare(strict_types=1);

/**
 * Серверная валидация состояния планировщика (схема v2).
 * Порт lib/validate.js: ограничения и приведение типов.
 */

const STATE_LIMITS = [
    'subjects' => 200,
    'schedule' => 5000,
    'plans' => 5000,
    'todos' => 2000,
    'exams' => 1000,
    'workouts' => 2000,
    'study' => 30000,
    'reviews' => 4000,
];

function random_short_id(): string
{
    return bin2hex(random_bytes(5));
}

function state_str(mixed $value, int $max = 500): string
{
    if (!is_string($value)) {
        return '';
    }
    if (function_exists('mb_substr')) {
        return mb_substr($value, 0, $max, 'UTF-8');
    }
    return substr($value, 0, $max);
}

function state_bool(mixed $value): bool
{
    return $value === true;
}

function state_num(mixed $value, int $min, int $max, int $default = 0): int
{
    if (!is_int($value) && !is_float($value) && !(is_string($value) && is_numeric($value))) {
        return $default;
    }
    return max($min, min($max, (int) round((float) $value)));
}

function state_arr(mixed $value): array
{
    return is_array($value) ? array_values($value) : [];
}

function state_is_obj(mixed $value): bool
{
    return is_array($value) && array_is_list($value) === false;
}

function state_id(mixed $value): string
{
    if (is_string($value) && preg_match('/^[A-Za-z0-9_-]{1,40}$/', $value) === 1) {
        return $value;
    }
    return random_short_id();
}

function valid_date_str(mixed $value): ?string
{
    if (!is_string($value) || preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) !== 1) {
        return null;
    }
    [$y, $m, $d] = array_map('intval', explode('-', $value));
    if (!checkdate($m, $d, $y)) {
        return null;
    }
    return $value;
}

function valid_time_str(mixed $value): string
{
    if (is_string($value) && preg_match('/^\d{2}:\d{2}$/', $value) === 1) {
        return $value;
    }
    return '';
}

function validate_username(mixed $value): string
{
    $username = is_string($value) ? trim($value) : '';
    if (preg_match('/^[\p{L}\p{N}_.-]{3,24}$/u', $username) !== 1) {
        throw new ApiError(400, 'Логин: 3–24 символа — буквы, цифры, _ . -', 'INVALID_USERNAME');
    }
    return $username;
}

function validate_password(mixed $value, int $min = 8): string
{
    if (!is_string($value) || mb_strlen($value, 'UTF-8') < $min || mb_strlen($value, 'UTF-8') > 128) {
        throw new ApiError(400, 'Пароль должен быть от ' . $min . ' до 128 символов', 'INVALID_PASSWORD');
    }
    return $value;
}

/**
 * @return array{state: array, size: int}
 */
function validate_state(mixed $raw): array
{
    if (!state_is_obj($raw)) {
        throw new ApiError(400, 'Некорректные данные', 'INVALID_STATE');
    }
    if (!array_key_exists('v', $raw) || (int) $raw['v'] !== 2) {
        throw new ApiError(400, 'Неподдерживаемая версия данных', 'INVALID_STATE_VERSION');
    }

    $out = [
        'v' => 2,
        'subjects' => [],
        'schedule' => [],
        'plans' => [],
        'todos' => [],
        'exams' => [],
        'workouts' => [],
        'study' => [],
        'reviews' => [],
        'settings' => ['focus' => 25, 'short' => 5, 'long' => 15, 'every' => 4, 'sound' => true],
    ];

    foreach (state_arr($raw['subjects'] ?? null) as $item) {
        if (!state_is_obj($item) || count($out['subjects']) >= STATE_LIMITS['subjects']) {
            continue;
        }
        $color = is_string($item['color'] ?? null) && preg_match('/^#[0-9a-f]{6}$/i', $item['color']) === 1
            ? $item['color'] : '#8a7a9c';
        $out['subjects'][] = [
            'id' => state_id($item['id'] ?? null),
            'name' => state_str($item['name'] ?? '', 60) ?: 'Предмет',
            'color' => $color,
        ];
    }

    foreach (state_arr($raw['schedule'] ?? null) as $item) {
        $date = state_is_obj($item) ? valid_date_str($item['date'] ?? null) : null;
        if ($date === null || count($out['schedule']) >= STATE_LIMITS['schedule']) {
            continue;
        }
        $out['schedule'][] = [
            'id' => state_id($item['id'] ?? null),
            'date' => $date,
            'time' => valid_time_str($item['time'] ?? ''),
            'end' => valid_time_str($item['end'] ?? ''),
            'title' => state_str($item['title'] ?? '', 100),
            'subj' => is_string($item['subj'] ?? null) && preg_match('/^[A-Za-z0-9_-]{1,40}$/', $item['subj']) === 1 ? $item['subj'] : '',
        ];
    }

    foreach (state_arr($raw['plans'] ?? null) as $item) {
        $date = state_is_obj($item) ? valid_date_str($item['date'] ?? null) : null;
        if ($date === null || count($out['plans']) >= STATE_LIMITS['plans']) {
            continue;
        }
        $out['plans'][] = [
            'id' => state_id($item['id'] ?? null),
            'date' => $date,
            'text' => state_str($item['text'] ?? '', 500),
            'done' => state_bool($item['done'] ?? false),
        ];
    }

    foreach (state_arr($raw['todos'] ?? null) as $item) {
        if (!state_is_obj($item) || count($out['todos']) >= STATE_LIMITS['todos']) {
            continue;
        }
        $out['todos'][] = [
            'id' => state_id($item['id'] ?? null),
            'text' => state_str($item['text'] ?? '', 500),
            'done' => state_bool($item['done'] ?? false),
        ];
    }

    foreach (state_arr($raw['exams'] ?? null) as $item) {
        $date = state_is_obj($item) ? valid_date_str($item['date'] ?? null) : null;
        if ($date === null || count($out['exams']) >= STATE_LIMITS['exams']) {
            continue;
        }
        $prep = [];
        foreach (state_arr($item['prep'] ?? null) as $p) {
            if (!state_is_obj($p) || count($prep) >= 200) {
                continue;
            }
            $prep[] = [
                'id' => state_id($p['id'] ?? null),
                'text' => state_str($p['text'] ?? '', 500),
                'done' => state_bool($p['done'] ?? false),
            ];
        }
        $out['exams'][] = [
            'id' => state_id($item['id'] ?? null),
            'subj' => is_string($item['subj'] ?? null) && preg_match('/^[A-Za-z0-9_-]{1,40}$/', $item['subj']) === 1 ? $item['subj'] : '',
            'kind' => state_str($item['kind'] ?? '', 40) ?: 'Контрольная',
            'date' => $date,
            'time' => valid_time_str($item['time'] ?? ''),
            'topic' => state_str($item['topic'] ?? '', 120),
            'imp' => state_bool($item['imp'] ?? false),
            'grade' => state_str($item['grade'] ?? '', 10),
            'prep' => $prep,
        ];
    }

    foreach (state_arr($raw['workouts'] ?? null) as $item) {
        $date = state_is_obj($item) ? valid_date_str($item['date'] ?? null) : null;
        if ($date === null || count($out['workouts']) >= STATE_LIMITS['workouts']) {
            continue;
        }
        $out['workouts'][] = [
            'id' => state_id($item['id'] ?? null),
            'date' => $date,
            'time' => valid_time_str($item['time'] ?? ''),
            'type' => state_str($item['type'] ?? '', 40) ?: 'Другое',
            'dur' => state_num($item['dur'] ?? 60, 0, 10000, 60),
            'note' => state_str($item['note'] ?? '', 120),
            'done' => state_bool($item['done'] ?? false),
        ];
    }

    foreach (state_arr($raw['study'] ?? null) as $item) {
        $date = state_is_obj($item) ? valid_date_str($item['date'] ?? null) : null;
        if ($date === null || count($out['study']) >= STATE_LIMITS['study']) {
            continue;
        }
        $out['study'][] = [
            'id' => state_id($item['id'] ?? null),
            'date' => $date,
            'subj' => is_string($item['subj'] ?? null) && preg_match('/^[A-Za-z0-9_-]{1,40}$/', $item['subj']) === 1 ? $item['subj'] : '',
            'min' => state_num($item['min'] ?? 0, 0, 10000, 0),
            'at' => state_num($item['at'] ?? 0, 0, PHP_INT_MAX, (int) (microtime(true) * 1000)),
        ];
    }

    $reviews = $raw['reviews'] ?? null;
    if (state_is_obj($reviews) || is_array($reviews)) {
        $count = 0;
        foreach ($reviews as $date => $r) {
            if ($count >= STATE_LIMITS['reviews']) {
                break;
            }
            $validDate = valid_date_str($date);
            if ($validDate === null || !state_is_obj($r)) {
                continue;
            }
            $out['reviews'][$validDate] = [
                'mood' => state_num($r['mood'] ?? 0, 0, 5, 0),
                'wins' => state_str($r['wins'] ?? '', 500),
                'improve' => state_str($r['improve'] ?? '', 500),
                'tomorrow' => state_str($r['tomorrow'] ?? '', 500),
            ];
            $count++;
        }
    }

    $settings = $raw['settings'] ?? null;
    $settings = is_array($settings) ? $settings : [];
    $out['settings'] = [
        'focus' => state_num($settings['focus'] ?? 25, 1, 180, 25),
        'short' => state_num($settings['short'] ?? 5, 1, 60, 5),
        'long' => state_num($settings['long'] ?? 15, 1, 90, 15),
        'every' => state_num($settings['every'] ?? 4, 2, 8, 4),
        'sound' => ($settings['sound'] ?? true) !== false,
    ];

    $json = json_encode($out, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json === false) {
        throw new ApiError(400, 'Некорректные данные', 'INVALID_STATE');
    }

    return ['state' => $out, 'size' => strlen($json)];
}
