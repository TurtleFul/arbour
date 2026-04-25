CREATE TABLE IF NOT EXISTS `service_event_log` (
    `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    `stack_name` text NOT NULL,
    `service_name` text NOT NULL,
    `event_type` text NOT NULL,
    `trigger` text NOT NULL,
    `timestamp` integer NOT NULL,
    `success` integer
);

CREATE INDEX IF NOT EXISTS `service_event_log_stack_service` ON `service_event_log` (`stack_name`, `service_name`);
CREATE INDEX IF NOT EXISTS `service_event_log_timestamp` ON `service_event_log` (`timestamp`);
