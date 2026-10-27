-- 002: отображаемое имя пользователя (не связано с логином)
ALTER TABLE users
    ADD COLUMN display_name VARCHAR(60) NOT NULL DEFAULT '' AFTER username;
