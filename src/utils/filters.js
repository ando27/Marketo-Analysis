import { toTime } from './columns';

const hasValue = (v) => v !== undefined && v !== null && v !== '';

/**
 * A filter can be added to the sidebar but still be empty. It only
 * affects the data (and gets a chip) once it has a value.
 */
export const isFilterActive = (filter) => {
    if (!filter) return false;
    switch (filter.kind) {
        case 'select': return hasValue(filter.value);
        case 'range': return hasValue(filter.min) || hasValue(filter.max);
        case 'contains': return hasValue(filter.contains);
        case 'date': return hasValue(filter.from) || hasValue(filter.to);
        default: return false;
    }
};

const rowMatches = (row, col, filter) => {
    const cell = row[col];
    switch (filter.kind) {
        case 'select':
            return String(cell ?? '') === String(filter.value);
        case 'contains':
            return String(cell ?? '').toLowerCase().includes(String(filter.contains).toLowerCase());
        case 'range': {
            if (cell === null || cell === undefined || cell === '') return false;
            const n = Number(cell);
            if (!Number.isFinite(n)) return false;
            const min = parseFloat(filter.min);
            const max = parseFloat(filter.max);
            if (!isNaN(min) && n < min) return false;
            if (!isNaN(max) && n > max) return false;
            return true;
        }
        case 'date': {
            const t = toTime(cell);
            if (isNaN(t)) return false;
            if (hasValue(filter.from) && t < new Date(`${filter.from}T00:00:00`).getTime()) return false;
            if (hasValue(filter.to) && t > new Date(`${filter.to}T23:59:59.999`).getTime()) return false;
            return true;
        }
        default:
            return true;
    }
};

export const applyColumnFilters = (data, columnFilters) => {
    if (!data) return [];
    const active = Object.entries(columnFilters).filter(([, f]) => isFilterActive(f));
    if (active.length === 0) return data;
    return data.filter(row => active.every(([col, f]) => rowMatches(row, col, f)));
};

/**
 * Short text for a filter chip, e.g. "Volume Group: 5000-10000" or "% Opened ≥ 0.2".
 */
export const describeFilter = (col, filter) => {
    switch (filter.kind) {
        case 'select':
            return `${col}: ${filter.value}`;
        case 'contains':
            return `${col} contains "${filter.contains}"`;
        case 'range': {
            const min = hasValue(filter.min), max = hasValue(filter.max);
            if (min && max) return `${col}: ${filter.min} – ${filter.max}`;
            return min ? `${col} ≥ ${filter.min}` : `${col} ≤ ${filter.max}`;
        }
        case 'date': {
            const from = hasValue(filter.from), to = hasValue(filter.to);
            if (from && to) return `${col}: ${filter.from} → ${filter.to}`;
            return from ? `${col} from ${filter.from}` : `${col} until ${filter.to}`;
        }
        default:
            return col;
    }
};

export const countAuditRules = (audit) => Object.keys(audit?.criteria || {}).length;

/**
 * True when a row breaks the audit rules (i.e. should be flagged).
 */
export const rowFailsAudit = (row, audit) => {
    if (!audit?.enabled) return false;
    const results = [];

    Object.entries(audit.criteria || {}).forEach(([col, rule]) => {
        if (!rule) return;
        const rowVal = parseFloat(row[col]);
        const threshold = parseFloat(rule.val);
        if (isNaN(rowVal) || isNaN(threshold)) return;

        if (rule.op === '<') results.push(rowVal < threshold);
        else if (rule.op === '<=') results.push(rowVal <= threshold);
        else if (rule.op === '>') results.push(rowVal > threshold);
        else if (rule.op === '>=') results.push(rowVal >= threshold);
    });

    if (results.length === 0) return false;
    return audit.mode === 'AND' ? results.every(Boolean) : results.some(Boolean);
};

/**
 * Parses "5000, 10000" into [5000, 10000]. Returns null when the text is not
 * a clean comma-separated list of positive numbers.
 */
export const parseCutoffs = (text) => {
    if (typeof text !== 'string') return null;
    const parts = text.split(',').map(p => p.trim());
    if (parts.length === 0 || parts.some(p => !/^\d+(\.\d+)?$/.test(p))) return null;
    const nums = parts.map(Number);
    if (nums.some(n => !Number.isFinite(n) || n <= 0)) return null;
    return [...new Set(nums)].sort((a, b) => a - b);
};
