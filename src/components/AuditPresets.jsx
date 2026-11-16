import { useState, useRef } from 'react';
import { Save, Pencil, Trash2, Download, Upload, AlertTriangle, Check, X } from 'lucide-react';
import {
    loadPresets, savePresets, makePreset, cleanName, sanitizePresets, mergePresets, presetsToJson,
} from '../utils/presets';
import { downloadTextFile, dateStamp } from '../utils/exportCsv';
import { countAuditRules } from '../utils/filters';

const inputClass = 'w-full min-w-0 bg-white/5 border border-white/10 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500';
const iconBtn = 'flex items-center justify-center gap-1 px-2 py-1 rounded border border-white/10 bg-white/5 text-xs text-gray-300 hover:text-white hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-white/5 disabled:hover:text-gray-300 transition-colors';

const MAX_IMPORT_BYTES = 1024 * 1024;

export default function AuditPresets({ auditSettings, setAuditSettings, numericColumns }) {
    const [presets, setPresets] = useState(() => loadPresets());
    const [selectedId, setSelectedId] = useState('');
    const [naming, setNaming] = useState(null); // null | 'save' | 'rename'
    const [nameInput, setNameInput] = useState('');
    const [notice, setNotice] = useState(null); // { tone: 'warn' | 'ok', text }
    const importRef = useRef(null);

    const selected = presets.find(p => p.id === selectedId) || null;
    const ruleCount = countAuditRules(auditSettings);

    // Keeps working in memory even if the browser blocks storage
    const persist = (next, okText) => {
        setPresets(next);
        if (savePresets(next)) {
            setNotice(okText ? { tone: 'ok', text: okText } : null);
        } else {
            setNotice({ tone: 'warn', text: 'Browser storage is blocked, so presets will only last until you close this tab. Use Export to keep them.' });
        }
    };

    const applyPreset = (preset) => {
        const available = new Set(numericColumns);
        const criteria = {};
        const skipped = [];

        Object.entries(preset.criteria).forEach(([col, rule]) => {
            if (available.has(col)) criteria[col] = { ...rule };
            else skipped.push(col);
        });

        setAuditSettings(prev => ({ ...prev, enabled: true, mode: preset.mode, criteria }));
        setNotice(skipped.length > 0
            ? { tone: 'warn', text: `Skipped ${skipped.length} rule${skipped.length === 1 ? '' : 's'} for columns not in this file: ${skipped.join(', ')}` }
            : { tone: 'ok', text: `Loaded "${preset.name}".` });
    };

    const handleSelect = (id) => {
        setSelectedId(id);
        setNaming(null);
        const preset = presets.find(p => p.id === id);
        if (preset) applyPreset(preset);
        else setNotice(null);
    };

    const startNaming = (mode) => {
        setNaming(mode);
        setNameInput(mode === 'rename' && selected ? selected.name : '');
        setNotice(null);
    };

    const confirmName = () => {
        const name = cleanName(nameInput);
        if (!name) return;
        const clash = presets.find(p => p.name.toLowerCase() === name.toLowerCase());

        if (naming === 'rename' && selected) {
            if (clash && clash.id !== selected.id) {
                setNotice({ tone: 'warn', text: `A preset named "${clash.name}" already exists.` });
                return;
            }
            persist(presets.map(p => (p.id === selected.id ? { ...p, name } : p)), `Renamed to "${name}".`);
        } else {
            const preset = makePreset(name, auditSettings);
            if (clash) {
                // Same name: update that preset with the current rules
                preset.id = clash.id;
                persist(presets.map(p => (p.id === clash.id ? preset : p)), `Updated "${name}".`);
            } else {
                persist([...presets, preset], `Saved "${name}".`);
            }
            setSelectedId(preset.id);
        }
        setNaming(null);
        setNameInput('');
    };

    const handleDelete = () => {
        if (!selected) return;
        if (!window.confirm(`Delete the preset "${selected.name}"?`)) return;
        persist(presets.filter(p => p.id !== selected.id), `Deleted "${selected.name}".`);
        setSelectedId('');
    };

    const handleExport = () => {
        downloadTextFile(`marketo-auditor-presets_${dateStamp()}.json`, presetsToJson(presets), 'application/json');
    };

    const handleImport = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = ''; // allow picking the same file again
        if (!file) return;

        try {
            if (file.size > MAX_IMPORT_BYTES) throw new Error('too large');
            const imported = sanitizePresets(JSON.parse(await file.text()));
            if (imported.length === 0) {
                setNotice({ tone: 'warn', text: 'No presets were found in that file.' });
                return;
            }
            persist(mergePresets(presets, imported), `Imported ${imported.length} preset${imported.length === 1 ? '' : 's'}.`);
        } catch (err) {
            setNotice({ tone: 'warn', text: 'That file could not be read. Choose a presets .json file exported from this app.' });
        }
    };

    return (
        <div className="space-y-2 rounded-lg bg-white/5 border border-white/10 p-2">
            <label className="text-xs uppercase text-gray-400 font-semibold" htmlFor="audit-preset">Presets</label>

            <select id="audit-preset" className={inputClass} value={selectedId} onChange={(e) => handleSelect(e.target.value)}>
                <option value="" className="text-black">{presets.length === 0 ? 'No saved presets' : 'Load a preset...'}</option>
                {presets.map(p => (
                    <option key={p.id} value={p.id} className="text-black">{p.name}</option>
                ))}
            </select>

            {naming ? (
                <div className="flex items-center gap-1">
                    <input
                        autoFocus
                        type="text"
                        maxLength={60}
                        aria-label="Preset name"
                        placeholder={naming === 'rename' ? 'New name' : 'Preset name'}
                        className={inputClass}
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') confirmName();
                            if (e.key === 'Escape') setNaming(null);
                        }}
                    />
                    <button type="button" className={iconBtn} onClick={confirmName} disabled={!cleanName(nameInput)} aria-label="Confirm name" title="Confirm">
                        <Check className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" className={iconBtn} onClick={() => setNaming(null)} aria-label="Cancel" title="Cancel">
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            ) : (
                <>
                    <button
                        type="button"
                        className={`${iconBtn} w-full`}
                        onClick={() => startNaming('save')}
                        disabled={ruleCount === 0}
                        title={ruleCount === 0 ? 'Add at least one audit rule first' : 'Save the current audit rules as a preset'}
                    >
                        <Save className="w-3.5 h-3.5" /> Save as preset
                    </button>
                    <div className="grid grid-cols-2 gap-1">
                        <button type="button" className={iconBtn} onClick={() => startNaming('rename')} disabled={!selected}>
                            <Pencil className="w-3.5 h-3.5" /> Rename
                        </button>
                        <button type="button" className={iconBtn} onClick={handleDelete} disabled={!selected}>
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                        <button type="button" className={iconBtn} onClick={handleExport} disabled={presets.length === 0} title="Download all presets as a .json file to share">
                            <Download className="w-3.5 h-3.5" /> Export
                        </button>
                        <button type="button" className={iconBtn} onClick={() => importRef.current?.click()} title="Add presets from a .json file">
                            <Upload className="w-3.5 h-3.5" /> Import
                        </button>
                    </div>
                </>
            )}

            <input ref={importRef} type="file" accept=".json,application/json" className="hidden" onChange={handleImport} />

            {notice && (
                <p role="status" className={`flex items-start gap-1 text-[11px] ${notice.tone === 'warn' ? 'text-yellow-400' : 'text-gray-400'}`}>
                    {notice.tone === 'warn' && <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />}
                    <span className="min-w-0 break-words">{notice.text}</span>
                </p>
            )}
        </div>
    );
}
