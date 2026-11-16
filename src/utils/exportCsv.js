import Papa from 'papaparse';
import { isBlank, toTime } from './columns';
import { rowFailsAudit, getFailedRules } from './filters';

const pad = (n) => String(n).padStart(2, '0');

/** Local date as YYYY-MM-DD */
export const dateStamp = (date = new Date()) =>
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const exportFileName = (kind) => `marketo-audit_${kind}_${dateStamp()}.csv`;

/** Saves text as a file on the user's computer. Nothing is uploaded anywhere. */
export const downloadTextFile = (fileName, text, mimeType = 'text/csv;charset=utf-8') => {
    const url = URL.createObjectURL(new Blob([text], { type: mimeType }));
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
};

// Trims floating-point noise such as 0.9690000000000001 -> 0.969
const cleanDecimal = (n) => Number(n.toFixed(6));

// Percentages are exported as decimals, so the header says so
const exportHeader = (col, meta) => (meta[col]?.isPct ? `${col} (decimal)` : col);

// Raw values, not the formatted strings shown in the table
const exportValue = (val, col, meta) => {
    if (isBlank(val)) return '';
    const info = meta[col];

    if (info?.isPct) {
        const n = Number(val);
        return Number.isFinite(n) ? cleanDecimal(n) : '';
    }
    // Excel date numbers / Date objects become readable dates
    if (info?.type === 'date' && (typeof val === 'number' || val instanceof Date)) {
        const t = toTime(val);
        if (isNaN(t)) return val;
        const d = new Date(t);
        const hasTime = d.getHours() + d.getMinutes() + d.getSeconds() > 0;
        return hasTime ? `${dateStamp(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}` : dateStamp(d);
    }
    return val;
};

// escapeFormulae stops text like "=SUM(...)" from running as a formula when opened in Excel
const toCsv = (fields, data) => Papa.unparse({ fields, data }, { escapeFormulae: true });

export const buildRowsCsv = (rows, columns, meta) =>
    toCsv(
        columns.map(col => exportHeader(col, meta)),
        rows.map(row => columns.map(col => exportValue(row[col], col, meta)))
    );

export const getAuditFailures = (rows, audit) => rows.filter(row => rowFailsAudit(row, audit));

export const buildFailuresCsv = (rows, columns, meta, audit) =>
    toCsv(
        [...columns.map(col => exportHeader(col, meta)), 'Failed Rules'],
        getAuditFailures(rows, audit).map(row => [
            ...columns.map(col => exportValue(row[col], col, meta)),
            getFailedRules(row, audit).join('; '),
        ])
    );

export const buildSummaryCsv = (totals) => {
    const value = (v) => (v === null || v === undefined ? '' : cleanDecimal(v));
    return toCsv(['Metric', 'Value'], [
        ['Emails', totals.count],
        ['Total Sent', value(totals.sent)],
        ['Total Delivered', value(totals.delivered)],
        ['Total Opened', value(totals.opened)],
        ['Total Clicked', value(totals.clicked)],
        ['Weighted Open Rate (decimal)', value(totals.openRate)],
        ['Weighted Click Rate (decimal)', value(totals.clickRate)],
        ['Click-to-Open Rate (decimal)', value(totals.ctor)],
    ]);
};
