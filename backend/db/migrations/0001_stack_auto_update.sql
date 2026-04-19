CREATE TABLE IF NOT EXISTS `stack_auto_update` (
    `stack_name` text PRIMARY KEY NOT NULL,
    `mode` text NOT NULL DEFAULT 'disabled',
    `schedule` text
);
