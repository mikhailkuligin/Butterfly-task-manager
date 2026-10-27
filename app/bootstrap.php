<?php
declare(strict_types=1);

require_once __DIR__ . '/env.php';
load_env(dirname(__DIR__) . '/.env');

require_once __DIR__ . '/response.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/validate.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/rate_limit.php';
