<?php
declare(strict_types=1);

// ДЕМО-ДАННЫЕ ДЛЯ ЛОКАЛЬНОГО QA. НЕ ЗАПУСКАТЬ НА ПРОДАКШЕНЕ.
// Создаёт/обновляет аккаунт test/test с примерами.
// Запуск: php scripts/seed-demo.php

require __DIR__ . '/../app/bootstrap.php';

function demo_state_php(): array
{
    $today = date('Y-m-d');
    $add = static function (string $key, int $days): string {
        $dt = new DateTimeImmutable($key);
        return $dt->modify(($days >= 0 ? '+' : '') . $days . ' days')->format('Y-m-d');
    };
    $uid = static fn (): string => bin2hex(random_bytes(5));

    return [
        'v' => 2,
        'subjects' => [
            ['id' => 'math', 'name' => 'Математика', 'color' => '#7d6a9c'],
            ['id' => 'rus', 'name' => 'Русский язык', 'color' => '#b07a8a'],
            ['id' => 'eng', 'name' => 'Английский', 'color' => '#6f8fa8'],
            ['id' => 'hist', 'name' => 'История', 'color' => '#a8875d'],
            ['id' => 'phys', 'name' => 'Физика', 'color' => '#6c9a8b'],
        ],
        'schedule' => [
            ['id' => $uid(), 'date' => $today, 'time' => '09:00', 'end' => '10:30', 'title' => 'Лекция', 'subj' => 'math'],
            ['id' => $uid(), 'date' => $today, 'time' => '10:45', 'end' => '12:15', 'title' => 'Семинар', 'subj' => 'eng'],
            ['id' => $uid(), 'date' => $today, 'time' => '13:00', 'end' => '14:30', 'title' => 'Практика', 'subj' => 'phys'],
            ['id' => $uid(), 'date' => $add($today, 1), 'time' => '09:00', 'end' => '10:30', 'title' => 'Лекция', 'subj' => 'hist'],
        ],
        'plans' => [
            ['id' => $uid(), 'date' => $today, 'text' => 'Решить 10 задач по производным', 'done' => true],
            ['id' => $uid(), 'date' => $today, 'text' => 'Выучить 20 слов по английскому', 'done' => false],
            ['id' => $uid(), 'date' => $today, 'text' => 'Прочитать параграф 12 по истории', 'done' => false],
        ],
        'todos' => [
            ['id' => $uid(), 'text' => 'Сдать книгу в библиотеку', 'done' => false],
            ['id' => $uid(), 'text' => 'Распечатать методичку по физике', 'done' => false],
            ['id' => $uid(), 'text' => 'Записаться к врачу', 'done' => false],
        ],
        'exams' => [
            [
                'id' => $uid(), 'subj' => 'math', 'kind' => 'Контрольная', 'date' => $add($today, 2), 'time' => '09:00',
                'topic' => 'Производные и пределы', 'imp' => true, 'grade' => '',
                'prep' => [
                    ['id' => $uid(), 'text' => 'Таблица производных', 'done' => true],
                    ['id' => $uid(), 'text' => 'Задачи 1–20 из сборника', 'done' => false],
                    ['id' => $uid(), 'text' => 'Пределы: замечательные', 'done' => false],
                ],
            ],
            [
                'id' => $uid(), 'subj' => 'eng', 'kind' => 'Тест', 'date' => $add($today, 5), 'time' => '10:45',
                'topic' => 'Present Perfect vs Past Simple', 'imp' => false, 'grade' => '',
                'prep' => [
                    ['id' => $uid(), 'text' => 'Правила и исключения', 'done' => false],
                    ['id' => $uid(), 'text' => 'Упражнения 4–9', 'done' => false],
                ],
            ],
            [
                'id' => $uid(), 'subj' => 'hist', 'kind' => 'Зачёт', 'date' => $add($today, 12), 'time' => '',
                'topic' => 'XIX век: реформы', 'imp' => false, 'grade' => '', 'prep' => [],
            ],
        ],
        'workouts' => [
            ['id' => $uid(), 'date' => $today, 'time' => '18:30', 'type' => 'Зал', 'dur' => 60, 'note' => 'Ноги + пресс', 'done' => false],
            ['id' => $uid(), 'date' => $add($today, 2), 'time' => '08:00', 'type' => 'Бег', 'dur' => 30, 'note' => '5 км', 'done' => false],
            ['id' => $uid(), 'date' => $add($today, 4), 'time' => '19:00', 'type' => 'Йога', 'dur' => 45, 'note' => '', 'done' => false],
        ],
        'study' => [
            ['id' => $uid(), 'date' => $today, 'subj' => 'math', 'min' => 50, 'at' => (int) (microtime(true) * 1000) - 3 * 3600 * 1000],
            ['id' => $uid(), 'date' => $today, 'subj' => 'eng', 'min' => 25, 'at' => (int) (microtime(true) * 1000) - 2 * 3600 * 1000],
            ['id' => $uid(), 'date' => $add($today, -1), 'subj' => 'hist', 'min' => 40, 'at' => (int) (microtime(true) * 1000) - 26 * 3600 * 1000],
            ['id' => $uid(), 'date' => $add($today, -1), 'subj' => 'math', 'min' => 30, 'at' => (int) (microtime(true) * 1000) - 27 * 3600 * 1000],
        ],
        'reviews' => [],
        'settings' => ['focus' => 25, 'short' => 5, 'long' => 15, 'every' => 4, 'sound' => true],
    ];
}

$pdo = db();
$login = 'test';
$password = 'test';
$displayName = 'Тестовый пользователь';
$hash = password_hash_value($password);
$state = json_encode(demo_state_php(), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

$stmt = $pdo->prepare('SELECT id FROM users WHERE username_lc = ? LIMIT 1');
$stmt->execute([mb_strtolower($login, 'UTF-8')]);
$user = $stmt->fetch();

if ($user) {
    $upd = $pdo->prepare('UPDATE users SET pw_hash = ?, display_name = ? WHERE id = ?');
    $upd->execute([$hash, $displayName, $user['id']]);
    $st = $pdo->prepare('UPDATE states SET rev = 1, data = ?, updated_at = ? WHERE user_id = ?');
    $st->execute([$state, time(), $user['id']]);
    echo "Обновлён демо-аккаунт {$login}/{$password} и его база.\n";
} else {
    $id = vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex(random_bytes(16)), 4));
    $pdo->beginTransaction();
    $pdo->prepare('INSERT INTO users (id, username, username_lc, display_name, pw_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        ->execute([$id, $login, $login, $displayName, $hash, time()]);
    $pdo->prepare('INSERT INTO states (user_id, rev, data, updated_at) VALUES (?, 1, ?, ?)')
        ->execute([$id, $state, time()]);
    $pdo->commit();
    echo "Создан демо-аккаунт {$login}/{$password}.\n";
}
