-- 003: запросы пользователя на отладку/доработку.
CREATE TABLE IF NOT EXISTS debug_requests (
    id CHAR(36) NOT NULL PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    body TEXT NOT NULL,
    created_at BIGINT NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'new',
    KEY debug_requests_user_idx (user_id, created_at),
    CONSTRAINT debug_requests_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
