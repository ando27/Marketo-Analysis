import { AUDIT_OPS } from './filters';

// Presets hold audit settings only (rules, thresholds, AND/OR). Never any uploaded data.
export const PRESETS_KEY = 'marketo-auditor:presets';

const MAX_PRESETS = 100;
const MAX_NAME_LENGTH = 60;
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

const makeId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const cleanName = (name) => (typeof name === 'string' ? name.trim().slice(0, MAX_NAME_LENGTH) : '');

/**
 * Keeps only well-formed rules: { column: { op: '<' | '<=' | '>' | '>=', val: number } }
 */
export const cleanCriteria = (criteria) => {
    const clean = {};
    if (!criteria || typeof criteria !== 'object' || Array.isArray(criteria)) return clean;

    Object.keys(criteria).forEach(col => {
        if (UNSAFE_KEYS.has(col)) return;
        const rule = criteria[col];
        if (!rule || typeof rule !== 'object') return;
        const val = typeof rule.val === 'number' ? rule.val : parseFloat(rule.val);
        if (!AUDIT_OPS.includes(rule.op) || !Number.isFinite(val)) return;
        clean[col] = { op: rule.op, val };
    });

    return clean;
};

export const makePreset = (name, auditSettings) => ({
    id: makeId(),
    name: cleanName(name),
    mode: auditSettings.mode === 'AND' ? 'AND' : 'OR',
    criteria: cleanCriteria(auditSettings.criteria),
});

/**
 * Turns anything (stored JSON, an imported file) into a safe list of presets.
 */
export const sanitizePresets = (input) => {
    const list = Array.isArray(input) ? input : Array.isArray(input?.presets) ? input.presets : [];
    const presets = [];

    list.slice(0, MAX_PRESETS).forEach(item => {
        if (!item || typeof item !== 'object') return;
        const name = cleanName(item.name);
        if (!name) return;
        presets.push({
            id: typeof item.id === 'string' && item.id ? item.id : makeId(),
            name,
            mode: item.mode === 'AND' ? 'AND' : 'OR',
            criteria: cleanCriteria(item.criteria),
        });
    });

    return presets;
};

/** Reads presets from localStorage. Returns [] if storage is blocked or the data is corrupt. */
export const loadPresets = () => {
    try {
        const raw = window.localStorage.getItem(PRESETS_KEY);
        return raw ? sanitizePresets(JSON.parse(raw)) : [];
    } catch (err) {
        return [];
    }
};

/** Writes presets to localStorage. Returns false if storage is blocked or full. */
export const savePresets = (presets) => {
    try {
        window.localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
        return true;
    } catch (err) {
        return false;
    }
};

/** The text of a shareable .json file. */
export const presetsToJson = (presets) =>
    JSON.stringify({ app: 'marketo-auditor', type: 'audit-presets', version: 1, presets }, null, 2);

/**
 * Adds imported presets to the existing list. A name that is already taken
 * gets " (imported)" added instead of overwriting the existing preset.
 */
export const mergePresets = (existing, imported) => {
    const merged = [...existing];
    const names = new Set(existing.map(p => p.name.toLowerCase()));

    imported.forEach(preset => {
        let name = preset.name;
        while (names.has(name.toLowerCase())) name = `${name} (imported)`;
        names.add(name.toLowerCase());
        merged.push({ ...preset, id: makeId(), name });
    });

    return merged.slice(0, MAX_PRESETS);
};
