const port = process.env.ARBOUR_PORT ?? "5001";
const scheme = process.env.ARBOUR_SSL_KEY ? "https" : "http";
const url = `${scheme}://127.0.0.1:${port}/`;

try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    process.exit(res.ok || res.status === 302 ? 0 : 1);
} catch {
    process.exit(1);
}
