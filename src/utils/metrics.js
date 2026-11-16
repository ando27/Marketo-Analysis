import { PCT_COLS, findCol } from './dataProcessing';

/**
 * Finds the sent / delivered / opened / clicked count columns.
 * Percentage columns are hidden from findCol first so that e.g. "% Opened"
 * or "Clicked to Open Ratio" is never mistaken for a count column.
 */
export const detectMetricColumns = (data) => {
    if (!data || data.length === 0) return { sent: null, delivered: null, opened: null, clicked: null };

    const countsOnly = {};
    Object.keys(data[0]).forEach(col => {
        if (!PCT_COLS.includes(col)) countsOnly[col] = true;
    });
    const view = [countsOnly];

    return {
        sent: findCol(view, ['sent', 'sends']),
        delivered: findCol(view, ['delivered']),
        opened: findCol(view, ['opened', 'opens']),
        clicked: findCol(view, ['clicked', 'clicks']),
    };
};

const sumCol = (rows, col) => rows.reduce((total, row) => total + (Number(row[col]) || 0), 0);

/**
 * Totals and weighted rates for a set of rows. A value is null when the
 * column it needs wasn't found (or the rate would divide by zero).
 */
export const computeTotals = (rows, cols) => {
    const total = (col) => (col ? sumCol(rows, col) : null);
    const rate = (num, den) => (num !== null && den !== null && den > 0 ? num / den : null);

    const sent = total(cols.sent);
    const delivered = total(cols.delivered);
    const opened = total(cols.opened);
    const clicked = total(cols.clicked);

    return {
        sent, delivered, opened, clicked,
        openRate: rate(opened, delivered),
        clickRate: rate(clicked, delivered),
        ctor: rate(clicked, opened),
        count: rows.length,
    };
};

export const formatCount = (n) => (n === null ? '—' : n.toLocaleString());
export const formatRate = (n) => (n === null ? '—' : `${(n * 100).toFixed(2)}%`);
