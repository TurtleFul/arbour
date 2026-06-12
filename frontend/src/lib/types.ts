export type SocketRes = {
    ok: boolean;
    msg?: string | { key: string; values?: Record<string, unknown> };
    msgi18n?: boolean;
    [key: string]: unknown;
};
