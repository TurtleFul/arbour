/**
 * Tidy a cron expression for display.
 *
 * - When the input already contains whitespace, only stray/duplicate whitespace
 *   is collapsed. This preserves multi-digit fields (e.g. "*\/15", "30") which
 *   cannot otherwise be recovered.
 * - When the user ran the fields together with no spaces (e.g. "03***"), the
 *   string is split back into tokens ("0 3 * * *"): a new field starts at every
 *   "*" or at a digit that follows another digit/"*", while operators (/ - ,)
 *   keep their operands in the same field so steps/ranges like "*\/5" stay intact.
 */
export function normalizeCron(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) {
        return "";
    }
    if (/\s/.test(trimmed)) {
        return trimmed.replace(/\s+/g, " ");
    }
    const tokens: string[] = [];
    let current = "";
    for (const ch of trimmed) {
        const prev = current[current.length - 1];
        const startNew = current !== "" && (ch === "*" || (/\d/.test(ch) && /[\d*]/.test(prev)));
        if (startNew) {
            tokens.push(current);
            current = ch;
        } else {
            current += ch;
        }
    }
    if (current) {
        tokens.push(current);
    }
    return tokens.join(" ");
}
