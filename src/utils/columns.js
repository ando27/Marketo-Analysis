import { PCT_COLS } from './dataProcessing';

// Text columns with fewer unique values than this get a dropdown filter
const DROPDOWN_LIMIT = 50;

const DATE_PATTERNS = [
    /^\d{4}-\d{1,2}-\d{1,2}/,                  // 2024-03-15, 2024-03-15T10:00:00
    /^\d{1,2}\/\d{1,2}\/\d{2,4}/,              // 3/15/2024
    /^[A-Za-z]{3,9}\.? \d{1,2},? \d{4}/,       // Mar 15, 2024
    /^\d{1,2}[- ][A-Za-z]{3,9}[- ]\d{2,4}/,    // 15-Mar-2024
];

export const isBlank = (val) => val === null || val === undefined || (typeof val === 'string' && val.trim() === '');

const isNumericValue = (val) => {
    if (typeof val === 'number') return Number.isFinite(val);
    if (typeof val === 'string') return val.trim() !== '' && Number.isFinite(Number(val));
    return false;
};

const isDateString = (val) =>
    typeof val === 'string' && DATE_PATTERNS.some(p => p.test(val.trim())) && !isNaN(Date.parse(val));

// Excel stores dates as day counts ("serials"). This range covers roughly 1954-2119.
export const isExcelSerial = (val) => typeof val === 'number' && val > 20000 && val < 80000;

/**
 * Converts a cell value to a local timestamp (ms), or NaN if it isn't a date.
 */
export const toTime = (val) => {
    if (val instanceof Date) return val.getTime();
    if (isExcelSerial(val)) {
        const utc = new Date(Math.round((val - 25569) * 86400000));
        return new Date(
            utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate(),
            utc.getUTCHours(), utc.getUTCMinutes(), utc.getUTCSeconds()
        ).getTime();
    }
    if (typeof val === 'string') {
        let s = val.trim();
        // "2026-03-15 10:30:00" -> "2026-03-15T10:30:00" so every browser can parse it
        if (/^\d{4}-\d{2}-\d{2} \d/.test(s)) s = s.replace(' ', 'T');
        // Date-only ISO strings are parsed as UTC by default; force local time instead
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(`${s}T00:00:00`).getTime();
        if (isDateString(s)) return Date.parse(s);
    }
    return NaN;
};

const naturalSort = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

/**
 * Works out each column's type and the filter control it should get.
 * Returns { [column]: { type, filterKind, uniqueValues, isPct } }
 *   type:       'number' | 'date' | 'text'
 *   filterKind: 'range'  | 'date' | 'select' | 'contains'
 */
export const buildColumnMeta = (data) => {
    if (!data || data.length === 0) return {};
    const meta = {};

    Object.keys(data[0]).forEach(col => {
        const values = [];
        data.forEach(row => { if (!isBlank(row[col])) values.push(row[col]); });

        const isPct = PCT_COLS.includes(col);
        const nameSaysDate = col.toLowerCase().includes('date');

        let type = 'text';
        if (values.length > 0) {
            if (values.every(v => v instanceof Date || isDateString(v))) type = 'date';
            else if (nameSaysDate && values.every(isExcelSerial)) type = 'date';
            else if (values.every(isNumericValue)) type = 'number';
        }

        let filterKind = 'contains';
        let uniqueValues = [];
        if (type === 'number') filterKind = 'range';
        else if (type === 'date') filterKind = 'date';
        else {
            const unique = new Set(values.map(String));
            if (unique.size > 0 && unique.size < DROPDOWN_LIMIT) {
                filterKind = 'select';
                uniqueValues = [...unique].sort(naturalSort);
            }
        }

        meta[col] = { type, filterKind, uniqueValues, isPct };
    });

    return meta;
};

/**
 * Formats a cell for display: percentages as %, numbers with thousands separators.
 */
export const formatCell = (val, col, meta) => {
    if (isBlank(val)) return '';
    const info = meta?.[col];

    if (info?.isPct) {
        const n = Number(val);
        return Number.isFinite(n) ? `${(n * 100).toFixed(2)}%` : '—';
    }
    if (info?.type === 'date') {
        if (val instanceof Date || typeof val === 'number') {
            const t = toTime(val);
            return isNaN(t) ? String(val) : new Date(t).toLocaleDateString();
        }
        return String(val);
    }
    if (info?.type === 'number') {
        // Don't add separators to identifiers like "Email ID"
        if (/\bid\b/i.test(col)) return String(val);
        const n = Number(val);
        return Number.isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: 2 }) : String(val);
    }
    return String(val);
};

/**
 * Picks the columns shown by default: email name, sent, delivered, opened,
 * clicked, the rate columns and Volume Group. Falls back to every column if
 * too few of them are detected.
 */
export const getDefaultVisibleColumns = (columns) => {
    const volumeWords = ['sent', 'sends', 'delivered', 'opened', 'opens', 'clicked', 'clicks'];

    const key = columns.filter(col => {
        const lower = col.toLowerCase();
        if (PCT_COLS.includes(col)) return true;
        if (col === 'Volume Group') return true;
        if (lower === 'name' || lower.includes('email name') || lower.includes('campaign name')) return true;
        return volumeWords.some(w => lower.includes(w));
    });

    return key.length >= 3 ? key : columns;
};
