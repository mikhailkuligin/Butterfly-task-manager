<?php
declare(strict_types=1);

/**
 * Лимит попыток с хранением в MySQL (переживает перезапуск PHP-FPM, в отличие от памяти).
 *
 * @return array{allowed: bool, retry_after: int}
 */
function rate_limit(PDO $pdo, string $key, int $max, int $windowSeconds): array
{
    $now = time();
    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare('SELECT `count`, reset_at FROM rate_limits WHERE rl_key = ? FOR UPDATE');
        $stmt->execute([$key]);
        $row = $stmt->fetch();

        if (!$row) {
            $ins = $pdo->prepare('INSERT INTO rate_limits (rl_key, `count`, reset_at) VALUES (?, 1, ?)');
            $ins->execute([$key, $now + $windowSeconds]);
            $allowed = true;
            $retry = $windowSeconds;
        } elseif ((int) $row['reset_at'] <= $now) {
            $upd = $pdo->prepare('UPDATE rate_limits SET `count` = 1, reset_at = ? WHERE rl_key = ?');
            $upd->execute([$now + $windowSeconds, $key]);
            $allowed = true;
            $retry = $windowSeconds;
        } elseif ((int) $row['count'] >= $max) {
            $allowed = false;
            $retry = (int) $row['reset_at'] - $now;
        } else {
            $upd = $pdo->prepare('UPDATE rate_limits SET `count` = `count` + 1 WHERE rl_key = ?');
            $upd->execute([$key]);
            $allowed = true;
            $retry = (int) $row['reset_at'] - $now;
        }
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }

    return ['allowed' => $allowed, 'retry_after' => max(1, $retry)];
}

function clear_rate_limit(PDO $pdo, string $key): void
{
    $stmt = $pdo->prepare('DELETE FROM rate_limits WHERE rl_key = ?');
    $stmt->execute([$key]);
}

function cleanup_sessions(PDO $pdo): void
{
    $stmt = $pdo->prepare('DELETE FROM sessions WHERE expires_at < ?');
    $stmt->execute([time()]);
}
