-- Baseline migration — safe to run against both fresh and existing databases.
-- All statements use IF NOT EXISTS so they are no-ops if tables already exist
-- (e.g. created by the previous Knex migration system).

CREATE TABLE IF NOT EXISTS `setting` (
    `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    `key` text(200) NOT NULL,
    `value` text,
    `type` text(20)
);

CREATE UNIQUE INDEX IF NOT EXISTS `setting_key_unique` ON `setting` (`key`);

CREATE TABLE IF NOT EXISTS `user` (
    `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    `username` text(255) NOT NULL,
    `password` text(255),
    `active` integer NOT NULL DEFAULT true,
    `timezone` text(150),
    `twofa_secret` text(64),
    `twofa_status` integer NOT NULL DEFAULT false,
    `twofa_last_token` text(6)
);

CREATE UNIQUE INDEX IF NOT EXISTS `user_username_unique` ON `user` (`username`);

CREATE TABLE IF NOT EXISTS `agent` (
    `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    `url` text(255) NOT NULL,
    `username` text(255) NOT NULL,
    `password` text(255) NOT NULL,
    `active` integer NOT NULL DEFAULT true,
    `name` text DEFAULT ''
);

CREATE UNIQUE INDEX IF NOT EXISTS `agent_url_unique` ON `agent` (`url`);
