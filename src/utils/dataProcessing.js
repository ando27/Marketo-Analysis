import Papa from 'papaparse';
import * as XLSX from 'xlsx';

// Target columns for specific percentage formatting
export const PCT_COLS = ["% Delivered", "% Opened", "% Clicked Email", "Clicked to Open Ratio", "Open Percentage", "Click Percentage"];

// Marketo activity columns that should be dropped entirely during processing
const DELETE_EXACT = new Set([
    'load date',
    'primary attribute value id',
    'call_webhook',
    'change_status_in_progression',
    'fill_out_form',
    'merge_leads',
    'new_lead',
    // Source percentages are discarded - we recalculate these ourselves below
    'open percentage',
    'click percentage',
]);

// Exact (case-insensitive) header renames for known Marketo activity columns
const RENAME_EXACT = {
    'primary attribute value': 'Email Name',
    'click_email': 'Email Clicks',
    'click_link': 'Link Clicks',
    'email_bounced': 'Email Bounced',
    'email_bounced_soft': 'Email Bounced Soft',
    'email_delivered': 'Emails Delivered',
    'open_email': 'Email Opens',
    'send_email': 'Email Sends',
    'unsubscribe_email': 'Email Unsubscribes',
    'visit_webpage': 'Page Visits',
};

/**
 * Helper to find a column name in a dataframe based on keywords.
 */
export const findCol = (data, possibleNames) => {
    if (!data || data.length === 0) return null;
    const columns = Object.keys(data[0]);
    for (const col of columns) {
        if (possibleNames.some(name => col.toLowerCase().includes(name.toLowerCase()))) {
            return col;
        }
    }
    return null;
};

/**
 * Sanitizes headers and cleans data (removes summary rows).
 * @param {Array} rawData - Array of objects from CSV/Excel
 * @returns {Array} - Cleaned and normalized data
 */
export const processData = (rawData) => {
    if (!rawData || rawData.length === 0) return [];

    // 1. Filter out summary rows (TOTAL, Summary, Grand Total)
    // We check if any value in the row contains "total" or "summary"
    let df = rawData.filter(row => {
        const values = Object.values(row).map(String).join(' ').toLowerCase();
        return !values.includes('total') && !values.includes('summary') && !values.includes('grand');
    });

    if (df.length === 0) return [];

    // 2. Header Normalization (Renaming keys)
    // Since we have an array of objects, we need to map over them and create new objects with new keys
    const originalKeys = Object.keys(df[0]);
    const keyMap = {};
    const deleteKeys = new Set();

    originalKeys.forEach(col => {
        const colLower = col.trim().toLowerCase();

        if (DELETE_EXACT.has(colLower)) {
            deleteKeys.add(col);
            return;
        }

        let newName = RENAME_EXACT[colLower];

        if (!newName) {
            if (['click to open', 'ctor', 'clicked to open'].some(x => colLower.includes(x))) {
                newName = "Clicked to Open Ratio";
            } else if (colLower.includes("% del")) {
                newName = "% Delivered";
            } else if (colLower.includes("% open")) {
                newName = "% Opened";
            } else if (colLower.includes("% click")) {
                newName = "% Clicked Email";
            } else {
                // Remove content in parentheses and specific words
                newName = col.replace(/\s*\([^)]*\)/g, '');
                newName = newName.replace(/\b(Email|Campaign)\b/gi, '').trim();
            }
        }
        keyMap[col] = newName;
    });

    // Apply new keys and numeric casting
    const processed = df.map(row => {
        const newRow = {};
        Object.keys(row).forEach(oldKey => {
            if (deleteKeys.has(oldKey)) return;

            const newKey = keyMap[oldKey];
            let val = row[oldKey];

            // 3. Numeric Casting
            if (PCT_COLS.includes(newKey)) {
                if (typeof val === 'string') {
                    val = parseFloat(val.replace(/[%,\s]/g, ''));
                }
                // Handle percentage as fraction if > 1
                if (val > 1.0) {
                    val = val / 100.0;
                }
            } else {
                const volKeys = ['sent', 'sends', 'delivered', 'opened', 'opens', 'clicked', 'clicks', 'bounced', 'unsubscri', 'visit'];
                const isVol = volKeys.some(k => newKey.toLowerCase().includes(k)) && !PCT_COLS.includes(newKey);

                if (isVol) {
                    if (typeof val === 'string') {
                        val = parseInt(val.replace(/[,]/g, ''), 10);
                    }
                    if (isNaN(val)) val = 0;
                } else if (typeof val === 'string' && !isNaN(parseFloat(val)) && newKey !== 'Campaign Name') {
                    // Try to convert other numeric strings, but be careful not to convert IDs or Names that look like numbers
                    // For now, let's only convert if it looks really numeric and isn't a known string col
                    // Actually, let's keep it safe and only strict number convert specific columns or let them be strings
                }
            }
            newRow[newKey] = val;
        });

        // Calculate Open/Click percentages ourselves rather than trusting the source file
        const opens = Number(newRow["Email Opens"]) || 0;
        const clicks = Number(newRow["Email Clicks"]) || 0;
        const delivered = Number(newRow["Emails Delivered"]) || 0;

        newRow["Open Percentage"] = delivered > 0 ? opens / delivered : 0;
        newRow["Click Percentage"] = delivered > 0 ? clicks / delivered : 0;

        return newRow;
    });

    return processed;
};

/**
 * Calculates volume tiers and adds 'Volume Group' column.
 */
export const addVolumeTiers = (data, cutoffs = [5000, 10000]) => {
    if (!data || data.length === 0) return data;

    const sentCol = findCol(data, ['sent', 'delivered']);
    if (!sentCol) return data;

    const breaks = [...cutoffs].sort((a, b) => a - b);

    return data.map(row => {
        const val = row[sentCol] || 0;
        let group = "";

        if (val < breaks[0]) {
            group = `0-${breaks[0]}`;
        } else if (val >= breaks[breaks.length - 1]) {
            group = `${breaks[breaks.length - 1]}+`;
        } else {
            for (let i = 0; i < breaks.length - 1; i++) {
                if (val >= breaks[i] && val < breaks[i + 1]) {
                    group = `${breaks[i]}-${breaks[i + 1]}`;
                    break;
                }
            }
        }

        return { ...row, "Volume Group": group };
    });
};

/**
 * File parsing wrapper
 */
export const parseFile = async (file) => {
    return new Promise((resolve, reject) => {
        const isCsv = file.name.endsWith('.csv');

        if (isCsv) {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    resolve(results.data);
                },
                error: (error) => {
                    reject(error);
                }
            });
        } else {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet);
                    resolve(jsonData);
                } catch (err) {
                    reject(err);
                }
            };
            reader.readAsArrayBuffer(file);
        }
    });
};
