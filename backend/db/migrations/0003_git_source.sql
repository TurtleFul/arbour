CREATE TABLE IF NOT EXISTS `git_credential` (
    `id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    `name` TEXT NOT NULL,
    `username` TEXT NOT NULL DEFAULT '',
    `token` TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS `stack_git_source` (
    `stack_name` TEXT PRIMARY KEY NOT NULL,
    `repo_url` TEXT NOT NULL,
    `branch` TEXT NOT NULL DEFAULT 'main',
    `subdir` TEXT NOT NULL DEFAULT '',
    `credential_id` INTEGER REFERENCES `git_credential`(`id`) ON DELETE SET NULL,
    `last_pulled_at` INTEGER,
    `last_commit` TEXT NOT NULL DEFAULT ''
);
