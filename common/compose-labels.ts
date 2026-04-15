/**
 * Label inside compose files to control the behavior of arbour.
 */

// Set to true to ignore the status of this service for the overall status of the stack
export const LABEL_STATUS_IGNORE = "arbour.status.ignore";

// Set to false to deactivate the check for updates.
export const LABEL_IMAGEUPDATES_CHECK = "arbour.imageupdates.check";

// Digest of an image version that is to be ignored.
export const LABEL_IMAGEUPDATES_IGNORE = "arbour.imageupdates.ignore";

// Link to the changelog of a service. It's displayed in the update dialog.
export const LABEL_IMAGEUPDATES_CHANGELOG = "arbour.imageupdates.changelog";
