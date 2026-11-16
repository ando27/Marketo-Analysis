import { useState, useMemo } from 'react';
import {
    Filter, Settings, Layers, GitCompare, SlidersHorizontal, ChevronDown, ChevronRight,
    Search, Plus, X, PanelLeftClose, PanelLeftOpen,
} from 'lucide-react';
import { isFilterActive, countAuditRules } from '../utils/filters';

const inputClass = 'w-full min-w-0 bg-white/5 border border-white/10 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500';

const KIND_LABELS = { select: 'List', range: 'Number', contains: 'Text', date: 'Date' };

const emptyFilter = (kind) => {
    switch (kind) {
        case 'select': return { kind, value: '' };
        case 'range': return { kind, min: '', max: '' };
        case 'date': return { kind, from: '', to: '' };
        default: return { kind: 'contains', contains: '' };
    }
};

function FilterControl({ col, filter, meta, onChange }) {
    if (filter.kind === 'select') {
        return (
            <select className={inputClass} value={filter.value} onChange={(e) => onChange({ value: e.target.value })}>
                <option value="" className="text-black">All</option>
                {(meta?.uniqueValues || []).map(v => (
                    <option key={v} value={v} className="text-black">{v}</option>
                ))}
            </select>
        );
    }
    if (filter.kind === 'range') {
        return (
            <>
                <div className="flex items-center gap-2">
                    <input type="number" step="any" placeholder="Min" className={inputClass} value={filter.min} onChange={(e) => onChange({ min: e.target.value })} />
                    <input type="number" step="any" placeholder="Max" className={inputClass} value={filter.max} onChange={(e) => onChange({ max: e.target.value })} />
                </div>
                {meta?.isPct && <p className="text-[11px] text-gray-500">Enter as a decimal: 0.2 = 20%</p>}
            </>
        );
    }
    if (filter.kind === 'date') {
        return (
            <div className="space-y-1">
                <label className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="w-8 shrink-0">From</span>
                    <input type="date" className={`${inputClass} [color-scheme:dark]`} value={filter.from} onChange={(e) => onChange({ from: e.target.value })} />
                </label>
                <label className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="w-8 shrink-0">To</span>
                    <input type="date" className={`${inputClass} [color-scheme:dark]`} value={filter.to} onChange={(e) => onChange({ to: e.target.value })} />
                </label>
            </div>
        );
    }
    return (
        <input type="text" placeholder={`${col} contains...`} className={inputClass} value={filter.contains} onChange={(e) => onChange({ contains: e.target.value })} />
    );
}

function SectionHeader({ icon: Icon, title, open, onToggle, badge }) {
    return (
        <button
            type="button"
            onClick={onToggle}
            className="flex items-center justify-between w-full text-left font-medium text-sm hover:text-white transition-colors"
        >
            <div className="flex items-center gap-2">
                <Icon className="w-4 h-4" /> {title}
                {badge ? <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-600 text-white">{badge}</span> : null}
            </div>
            {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
    );
}

export default function Sidebar({
    columns, columnMeta,
    columnFilters, setColumnFilters,
    auditSettings, setAuditSettings,
    comparisonSettings, setComparisonSettings,
    cutoffsText, onCutoffsChange, cutoffsValid, appliedCutoffs,
    collapsed, onToggleCollapsed,
}) {
    const [expandedSections, setExpandedSections] = useState({
        filters: true,
        benchmarks: false,
        comparison: false,
        tiers: false,
    });
    const [pickerOpen, setPickerOpen] = useState(false);
    const [pickerSearch, setPickerSearch] = useState('');

    const toggleSection = (section) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const addedColumns = Object.keys(columnFilters);
    const activeCount = Object.values(columnFilters).filter(isFilterActive).length;
    const ruleCount = countAuditRules(auditSettings);

    const numericColumns = useMemo(
        () => columns.filter(c => columnMeta[c]?.type === 'number'),
        [columns, columnMeta]
    );

    const pickerOptions = useMemo(() => {
        const term = pickerSearch.trim().toLowerCase();
        return columns.filter(c => !(c in columnFilters) && c.toLowerCase().includes(term));
    }, [columns, columnFilters, pickerSearch]);

    const addFilter = (col) => {
        setColumnFilters(prev => ({ ...prev, [col]: emptyFilter(columnMeta[col]?.filterKind) }));
        setPickerOpen(false);
        setPickerSearch('');
    };

    const updateFilter = (col, patch) => {
        setColumnFilters(prev => ({ ...prev, [col]: { ...prev[col], ...patch } }));
    };

    const removeFilter = (col) => {
        setColumnFilters(prev => {
            const next = { ...prev };
            delete next[col];
            return next;
        });
    };

    const setAuditRule = (col, rule) => {
        setAuditSettings(prev => {
            const criteria = { ...prev.criteria };
            if (rule === null) delete criteria[col];
            else criteria[col] = rule;
            return { ...prev, criteria };
        });
    };

    // ---- Collapsed: thin icon rail ----
    if (collapsed) {
        const openTo = (section) => {
            setExpandedSections(prev => ({ ...prev, [section]: true }));
            onToggleCollapsed();
        };
        const railBtn = 'relative flex items-center justify-center w-9 h-9 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors';
        const dot = 'absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-blue-600 text-white text-[10px] leading-4 text-center';

        return (
            <div className="glass rounded-xl sticky top-[4.5rem] flex flex-col items-center gap-2 py-3">
                <button type="button" className={railBtn} onClick={onToggleCollapsed} title="Expand sidebar" aria-label="Expand sidebar">
                    <PanelLeftOpen className="w-5 h-5 text-blue-400" />
                </button>
                <div className="w-6 border-t border-white/10" />
                <button type="button" className={railBtn} onClick={() => openTo('filters')} title="Filters" aria-label="Filters">
                    <Filter className="w-4 h-4" />
                    {activeCount > 0 && <span className={dot}>{activeCount}</span>}
                </button>
                <button type="button" className={railBtn} onClick={() => openTo('benchmarks')} title="Benchmark settings" aria-label="Benchmark settings">
                    <Layers className="w-4 h-4" />
                    {auditSettings.enabled && <span className={`${dot} bg-red-500`}>{ruleCount}</span>}
                </button>
                <button type="button" className={railBtn} onClick={() => openTo('comparison')} title="Compare segments" aria-label="Compare segments">
                    <GitCompare className="w-4 h-4" />
                </button>
                <button type="button" className={railBtn} onClick={() => openTo('tiers')} title="Volume tiers" aria-label="Volume tiers">
                    <SlidersHorizontal className="w-4 h-4" />
                </button>
            </div>
        );
    }

    // ---- Expanded ----
    return (
        <div className="glass rounded-xl p-4 lg:p-5 sticky top-[4.5rem] space-y-6 max-h-[calc(100vh-5.5rem)] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
                <div className="flex items-center gap-2 font-semibold text-lg">
                    <Settings className="w-5 h-5 text-blue-400" />
                    <h2>Control Panel</h2>
                </div>
                <button
                    type="button"
                    onClick={onToggleCollapsed}
                    title="Collapse sidebar"
                    aria-label="Collapse sidebar"
                    className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                    <PanelLeftClose className="w-5 h-5" />
                </button>
            </div>

            {/* Filters */}
            <div className="space-y-3">
                <SectionHeader icon={Filter} title="Filters" open={expandedSections.filters} onToggle={() => toggleSection('filters')} badge={activeCount || null} />

                {expandedSections.filters && (
                    <div className="space-y-3 pl-2">
                        {addedColumns.length === 0 && !pickerOpen && (
                            <p className="text-xs text-muted-foreground">No filters yet. Add one to narrow down the data.</p>
                        )}

                        {addedColumns.map(col => (
                            <div key={col} className="space-y-1.5 rounded-lg bg-white/5 border border-white/10 p-2">
                                <div className="flex items-center justify-between gap-2">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 truncate" title={col}>{col}</label>
                                    <button
                                        type="button"
                                        onClick={() => removeFilter(col)}
                                        aria-label={`Remove ${col} filter`}
                                        title="Remove filter"
                                        className="shrink-0 p-0.5 rounded text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                                <FilterControl col={col} filter={columnFilters[col]} meta={columnMeta[col]} onChange={(patch) => updateFilter(col, patch)} />
                            </div>
                        ))}

                        {pickerOpen ? (
                            <div className="rounded-lg border border-white/10 bg-white/5">
                                <div className="flex items-center gap-2 px-2 py-1.5 border-b border-white/10">
                                    <Search className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                                    <input
                                        autoFocus
                                        type="text"
                                        placeholder="Search columns..."
                                        className="w-full min-w-0 bg-transparent text-sm focus:outline-none"
                                        value={pickerSearch}
                                        onChange={(e) => setPickerSearch(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Escape') { setPickerOpen(false); setPickerSearch(''); }
                                            if (e.key === 'Enter' && pickerOptions.length > 0) addFilter(pickerOptions[0]);
                                        }}
                                    />
                                    <button type="button" aria-label="Close column picker" className="shrink-0 text-gray-500 hover:text-white" onClick={() => { setPickerOpen(false); setPickerSearch(''); }}>
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                                <div className="max-h-48 overflow-y-auto custom-scrollbar py-1">
                                    {pickerOptions.length === 0 && (
                                        <p className="px-2 py-2 text-xs text-muted-foreground">No matching columns.</p>
                                    )}
                                    {pickerOptions.map(col => (
                                        <button
                                            key={col}
                                            type="button"
                                            onClick={() => addFilter(col)}
                                            className="flex items-center justify-between gap-2 w-full px-2 py-1.5 text-sm text-left hover:bg-white/10 transition-colors"
                                        >
                                            <span className="truncate" title={col}>{col}</span>
                                            <span className="shrink-0 text-[10px] uppercase text-gray-500">{KIND_LABELS[columnMeta[col]?.filterKind] || 'Text'}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between gap-2">
                                <button
                                    type="button"
                                    onClick={() => setPickerOpen(true)}
                                    className="flex items-center gap-1 text-sm px-2 py-1 rounded border border-dashed border-white/20 text-blue-300 hover:text-white hover:border-blue-500/60 hover:bg-white/5 transition-colors"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Add filter
                                </button>
                                {addedColumns.length > 0 && (
                                    <button type="button" onClick={() => setColumnFilters({})} className="text-xs text-gray-400 hover:text-white underline underline-offset-2">
                                        Clear all
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Benchmarks */}
            <div className="space-y-3">
                <SectionHeader icon={Layers} title="Benchmark Settings" open={expandedSections.benchmarks} onToggle={() => toggleSection('benchmarks')} />
                {expandedSections.benchmarks && (
                    <div className="space-y-4 pl-2">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium" htmlFor="audit-enabled">Enable Audit</label>
                            <input
                                id="audit-enabled"
                                type="checkbox"
                                checked={auditSettings.enabled}
                                onChange={(e) => setAuditSettings(prev => ({ ...prev, enabled: e.target.checked }))}
                                className="accent-blue-500 w-4 h-4"
                            />
                        </div>

                        {auditSettings.enabled && (
                            <>
                                <div className="space-y-2">
                                    <label className="text-xs uppercase text-gray-400 font-semibold">Audit Logic</label>
                                    <div className="flex bg-white/5 rounded p-1 text-xs">
                                        <button
                                            type="button"
                                            onClick={() => setAuditSettings(prev => ({ ...prev, mode: 'OR' }))}
                                            className={`flex-1 py-1 rounded ${auditSettings.mode !== 'AND' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                                        >
                                            Match ANY (OR)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setAuditSettings(prev => ({ ...prev, mode: 'AND' }))}
                                            className={`flex-1 py-1 rounded ${auditSettings.mode === 'AND' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                                        >
                                            Match ALL (AND)
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-3 border-t border-white/10 pt-3">
                                    <p className="text-xs text-muted-foreground">Define failure conditions (rates as decimals, 0.2 = 20%):</p>
                                    {numericColumns.map(col => {
                                        const rule = auditSettings.criteria[col];
                                        return (
                                            <div key={col} className="space-y-1">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-xs text-gray-400 truncate min-w-0" title={col}>{col}</span>
                                                    <select
                                                        className="shrink-0 bg-white/5 border border-white/10 rounded text-xs px-1 py-0.5 w-28"
                                                        value={rule?.op || ''}
                                                        onChange={(e) => {
                                                            const op = e.target.value;
                                                            setAuditRule(col, op === '' ? null : { op, val: rule?.val ?? 0 });
                                                        }}
                                                    >
                                                        <option value="" className="text-black">Select...</option>
                                                        <option value="<" className="text-black">Less Than</option>
                                                        <option value="<=" className="text-black">Less Than =</option>
                                                        <option value=">" className="text-black">Greater Than</option>
                                                        <option value=">=" className="text-black">Greater Than =</option>
                                                    </select>
                                                </div>
                                                {rule && (
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        className={`${inputClass} text-xs`}
                                                        placeholder="Threshold"
                                                        value={rule.val}
                                                        onChange={(e) => setAuditRule(col, { ...rule, val: e.target.value })}
                                                    />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Comparison Tool */}
            <div className="space-y-3">
                <SectionHeader icon={GitCompare} title="Compare Segments" open={expandedSections.comparison} onToggle={() => toggleSection('comparison')} />
                {expandedSections.comparison && (
                    <div className="space-y-4 pl-2">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium" htmlFor="comparison-enabled">Enable Comparison</label>
                            <input
                                id="comparison-enabled"
                                type="checkbox"
                                checked={comparisonSettings.enabled}
                                onChange={(e) => setComparisonSettings(prev => ({ ...prev, enabled: e.target.checked }))}
                                className="accent-blue-500 w-4 h-4"
                            />
                        </div>

                        {comparisonSettings.enabled && (
                            <>
                                <div className="space-y-1">
                                    <label className="text-xs text-gray-400">Column to Compare</label>
                                    <select
                                        className={inputClass}
                                        value={comparisonSettings.col}
                                        onChange={(e) => setComparisonSettings(prev => ({ ...prev, col: e.target.value }))}
                                    >
                                        {columns.map(c => (
                                            <option key={c} value={c} className="text-black">{c}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs text-gray-400">Segment A (Search)</label>
                                    <input
                                        type="text"
                                        className={inputClass}
                                        placeholder="e.g. 5000-10000"
                                        value={comparisonSettings.segmentA}
                                        onChange={(e) => setComparisonSettings(prev => ({ ...prev, segmentA: e.target.value }))}
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs text-gray-400">Segment B (Search)</label>
                                    <input
                                        type="text"
                                        className={inputClass}
                                        placeholder="e.g. 10000+"
                                        value={comparisonSettings.segmentB}
                                        onChange={(e) => setComparisonSettings(prev => ({ ...prev, segmentB: e.target.value }))}
                                    />
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Volume Tiers */}
            <div className="space-y-3">
                <SectionHeader icon={SlidersHorizontal} title="Volume Tiers" open={expandedSections.tiers} onToggle={() => toggleSection('tiers')} />
                {expandedSections.tiers && (
                    <div className="space-y-2 pl-2">
                        <label className="text-xs text-gray-400" htmlFor="volume-cutoffs">Cutoffs (comma-separated)</label>
                        <input
                            id="volume-cutoffs"
                            type="text"
                            inputMode="numeric"
                            className={`${inputClass} ${cutoffsValid ? '' : 'border-red-500/70 focus:border-red-500'}`}
                            placeholder="5000, 10000"
                            value={cutoffsText}
                            onChange={(e) => onCutoffsChange(e.target.value)}
                        />
                        {!cutoffsValid && (
                            <p className="text-[11px] text-red-400">Not valid, so it&apos;s being ignored. Use positive numbers separated by commas.</p>
                        )}
                        <p className="text-[11px] text-gray-500">
                            Current tiers: 0-{appliedCutoffs[0]}
                            {appliedCutoffs.slice(1).map((c, i) => `, ${appliedCutoffs[i]}-${c}`).join('')}
                            , {appliedCutoffs[appliedCutoffs.length - 1]}+
                        </p>
                    </div>
                )}
            </div>

            <div className="pt-4 border-t border-white/10 text-xs text-center text-gray-500 font-mono">
                v{import.meta.env.PACKAGE_VERSION}
            </div>
        </div>
    );
}
