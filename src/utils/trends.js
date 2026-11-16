import { isBlank, isExcelSerial, toTime } from './columns';
import { computeTotals } from './metrics';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Anything outside these years is treated as "not a real send date"
const MIN_YEAR = 1990;
const MAX_YEAR = 2100;

/**
 * Parses a cell into a local timestamp (ms), or NaN.
 * Handles ISO dates, US-style dates, month names, Date objects and - when
 * allowSerial is true - Excel date numbers (also when they arrive as text from a CSV).
 */
export const parseDateValue = (val, allowSerial) => {
    let t = NaN;

    if (val instanceof Date) {
        t = val.getTime();
    } else if (typeof val === 'number') {
        if (allowSerial && isExcelSerial(val)) t = toTime(val);
    } else if (typeof val === 'string') {
        const s = val.trim();
        if (/^\d{5}(\.\d+)?$/.test(s)) {
            if (allowSerial && isExcelSerial(Number(s))) t = toTime(Number(s));
        } else {
            t = toTime(s);
        }
    }

    if (isNaN(t)) return NaN;
    const year = new Date(t).getFullYear();
    return year >= MIN_YEAR && year <= MAX_YEAR ? t : NaN;
};

// Excel date numbers are only trusted when the column name actually says "date",
// so a count column like "Email Sends" is never read as dates.
const allowsSerial = (col) => col.toLowerCase().includes('date');

/**
 * Finds columns that look like a send date: the name contains "date" or "send"
 * and at least 80% of the non-blank values parse as dates. Best match first.
 */
export const findDateColumns = (data, columns) => {
    if (!data || data.length === 0) return [];

    const candidates = [];
    columns.forEach((col, index) => {
        const lower = col.toLowerCase();
        const hasDate = lower.includes('date');
        const hasSend = lower.includes('send') || lower.includes('sent');
        if (!hasDate && !lower.includes('send')) return;

        let filled = 0;
        let parsed = 0;
        data.forEach(row => {
            if (isBlank(row[col])) return;
            filled += 1;
            if (!isNaN(parseDateValue(row[col], allowsSerial(col)))) parsed += 1;
        });
        if (filled === 0 || parsed / filled < 0.8) return;

        const rank = hasDate && hasSend ? 3 : hasDate ? 2 : 1;
        candidates.push({ col, rank, index });
    });

    return candidates.sort((a, b) => b.rank - a.rank || a.index - b.index).map(c => c.col);
};

const periodStart = (time, granularity) => {
    const d = new Date(time);
    if (granularity === 'month') return new Date(d.getFullYear(), d.getMonth(), 1);
    // Weeks start on Monday
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    day.setDate(day.getDate() - ((day.getDay() + 6) % 7));
    return day;
};

const periodLabel = (start, granularity) =>
    granularity === 'month'
        ? `${MONTHS[start.getMonth()]} ${start.getFullYear()}`
        : `${MONTHS[start.getMonth()]} ${start.getDate()}, ${start.getFullYear()}`;

/**
 * Groups rows by week or month and works out totals and weighted rates per period.
 * Rates are totals divided by totals (e.g. all opens / all delivered in the period),
 * not an average of each email's rate.
 */
export const buildTrend = (rows, dateCol, granularity, metricCols) => {
    const groups = new Map();
    let skipped = 0;
    const serial = allowsSerial(dateCol);

    rows.forEach(row => {
        const time = parseDateValue(row[dateCol], serial);
        if (isNaN(time)) {
            skipped += 1;
            return;
        }
        const start = periodStart(time, granularity);
        const key = start.getTime();
        if (!groups.has(key)) groups.set(key, { start, rows: [] });
        groups.get(key).rows.push(row);
    });

    const periods = [...groups.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([key, group]) => ({
            key,
            label: periodLabel(group.start, granularity),
            ...computeTotals(group.rows, metricCols),
        }));

    return { periods, skipped };
};
