-- Butterfly PHP — схема MySQL 8.4+
-- Кодировка: utf8mb4; хранилище состояния — JSON (MySQL JSON).

CREATE TABLE IF NOT EXISTS users (
    id CHAR(36) NOT NULL PRIMARY KEY,
    username VARCHAR(24) NOT NULL,
    username_lc VARCHAR(24) NOT NULL,
    pw_hash VARCHAR(255) NOT NULL,
    created_at BIGINT NOT NULL,
    UNIQUE KEY users_username_lc_uq (username_lc)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sessions (
    token_hash CHAR(64) NOT NULL PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    created_at BIGINT NOT NULL,
    expires_at BIGINT NOT NULL,
    remember TINYINT(1) NOT NULL DEFAULT 0,
    KEY sessions_user_idx (user_id),
    KEY sessions_expires_idx (expires_at),
    CONSTRAINT sessions_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS states (
    user_id CHAR(36) NOT NULL PRIMARY KEY,
    rev BIGINT NOT NULL DEFAULT 1,
    data JSON NOT NULL,
    updated_at BIGINT NOT NULL,
    CONSTRAINT states_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rate_limits (
    rl_key VARCHAR(191) NOT NULL PRIMARY KEY,
    `count` INT NOT NULL DEFAULT 0,
    reset_at BIGINT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
