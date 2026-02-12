import React, { useState, useMemo } from 'react';
import { Filter, Settings, Layers, ChevronDown, ChevronRight, Search } from 'lucide-react';
import _ from 'lodash';

// Helper to determine if a column is numeric
const isNumeric = (val) => {
    return !isNaN(parseFloat(val)) && isFinite(val);
};

export default function Sidebar({ data, filters, setFilters, volumeCutoffs, setVolumeCutoffs }) {
    const [expandedSections, setExpandedSections] = useState({
        globalFilters: true,
        benchmarks: false,
        comparison: false,
        settings: false
    });

    const toggleSection = (section) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    // Get available columns
    const columns = useMemo(() => {
        if (!data || data.length === 0) return [];
        return Object.keys(data[0]);
    }, [data]);

    // Handle filter changes
    const updateFilter = (col, type, value) => {
        setFilters(prev => {
            const newFilters = { ...prev };
            if (!newFilters[col]) newFilters[col] = {};
            newFilters[col][type] = value;

            // Cleanup empty filters
            if (value === '' || value === null) {
                delete newFilters[col][type];
                if (Object.keys(newFilters[col]).length === 0) {
                    delete newFilters[col];
                }
            }
            return newFilters;
        });
    };

    return (
        <div className="glass-card sticky top-24 space-y-6 max-h-[calc(100vh-8rem)] overflow-y-auto custom-scrollbar">
            <div className="flex items-center gap-2 font-semibold text-lg border-b border-white/10 pb-2">
                <Settings className="w-5 h-5 text-blue-400" />
                <h2>Control Panel</h2>
            </div>

            {/* Global Filters */}
            <div className="space-y-3">
                <button
                    onClick={() => toggleSection('globalFilters')}
                    className="flex items-center justify-between w-full text-left font-medium text-sm hover:text-white transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4" /> Global Filters
                    </div>
                    {expandedSections.globalFilters ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>

                {expandedSections.globalFilters && (
                    <div className="space-y-4 pl-2 animate-in slide-in-from-top-2 duration-200">
                        {/* TODO: Add dynamic column selector for filters */}
                        <div className="text-sm text-muted-foreground">
                            <p className="mb-2">Select columns to filter:</p>
                            {/* Simplified for prototype: Just show Volume Group if exists */}
                            {/* Dynamic Column Filters */}
                            {columns.filter(c => !c.toLowerCase().includes('date')).slice(0, 10).map(col => {
                                // Heuristic: If > 50 unique values or first value is numeric, treat as appropriate
                                const firstVal = data.find(d => d[col] !== null && d[col] !== undefined)?.[col];
                                const isNum = isNumeric(firstVal);
                                const uniqueCount = _.uniq(data.map(d => d[col])).length;

                                return (
                                    <div key={col} className="space-y-1">
                                        <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 truncate block" title={col}>{col}</label>
                                        {col === 'Volume Group' || (!isNum && uniqueCount < 50) ? (
                                            <select
                                                className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500"
                                                onChange={(e) => updateFilter(col, 'equals', e.target.value)}
                                                value={filters[col]?.equals || ""}
                                            >
                                                <option value="" className="text-black">All</option>
                                                {_.uniq(data.map(d => d[col])).sort().map(g => (
                                                    <option key={g} value={g} className="text-black">{g}</option>
                                                ))}
                                            </select>
                                        ) : isNum ? (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    placeholder="Min"
                                                    className="w-1/2 bg-white/5 border border-white/10 rounded px-2 py-1 text-sm"
                                                    onChange={(e) => updateFilter(col, 'min', e.target.value)}
                                                    value={filters[col]?.min || ""}
                                                />
                                                <input
                                                    type="number"
                                                    placeholder="Max"
                                                    className="w-1/2 bg-white/5 border border-white/10 rounded px-2 py-1 text-sm"
                                                    onChange={(e) => updateFilter(col, 'max', e.target.value)}
                                                    value={filters[col]?.max || ""}
                                                />
                                            </div>
                                        ) : (
                                            <input
                                                type="text"
                                                placeholder={`Search ${col}...`}
                                                className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm"
                                                onChange={(e) => updateFilter(col, 'contains', e.target.value)}
                                                value={filters[col]?.contains || ""}
                                            />
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Benchmarks */}
            <div className="space-y-3">
                <button
                    onClick={() => toggleSection('benchmarks')}
                    className="flex items-center justify-between w-full text-left font-medium text-sm hover:text-white transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4" /> Benchmark Settings
                    </div>
                    {expandedSections.benchmarks ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                {expandedSections.benchmarks && (
                    <div className="space-y-4 pl-2 animate-in slide-in-from-top-2 duration-200">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium">Enable Audit</label>
                            <input
                                type="checkbox"
                                checked={filters.auditEnabled || false}
                                onChange={(e) => setFilters(prev => ({ ...prev, auditEnabled: e.target.checked }))}
                                className="accent-blue-500 w-4 h-4"
                            />
                        </div>

                        {filters.auditEnabled && (
                            <>
                                <div className="space-y-2">
                                    <label className="text-xs uppercase text-gray-400 font-semibold">Audit Logic</label>
                                    <div className="flex bg-white/5 rounded p-1 text-xs">
                                        <button
                                            onClick={() => setFilters(prev => ({ ...prev, auditMode: 'OR' }))}
                                            className={`flex-1 py-1 rounded ${!filters.auditMode || filters.auditMode === 'OR' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                                        >
                                            Match ANY (OR)
                                        </button>
                                        <button
                                            onClick={() => setFilters(prev => ({ ...prev, auditMode: 'AND' }))}
                                            className={`flex-1 py-1 rounded ${filters.auditMode === 'AND' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                                        >
                                            Match ALL (AND)
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-3 border-t border-white/10 pt-3">
                                    <p className="text-xs text-muted-foreground">Define failure conditions:</p>
                                    {columns.filter(c => isNumeric(data[0]?.[c])).slice(0, 10).map(col => (
                                        <div key={col} className="space-y-1">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-gray-400 truncate w-24" title={col}>{col}</span>
                                                <select
                                                    className="bg-white/5 border border-white/10 rounded text-xs px-1 py-0.5 w-24"
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setFilters(prev => {
                                                            const newCriteria = { ...(prev.auditCriteria || {}) };
                                                            if (val === "") {
                                                                delete newCriteria[col];
                                                            } else {
                                                                newCriteria[col] = { op: val, val: newCriteria[col]?.val || 0 };
                                                            }
                                                            return { ...prev, auditCriteria: newCriteria };
                                                        });
                                                    }}
                                                    value={filters.auditCriteria?.[col]?.op || ""}
                                                >
                                                    <option value="" className="text-black">Select...</option>
                                                    <option value="<" className="text-black">Less Than</option>
                                                    <option value="<=" className="text-black">Less Than =</option>
                                                    <option value=">" className="text-black">Greater Than</option>
                                                    <option value=">=" className="text-black">Greater Than =</option>
                                                </select>
                                            </div>
                                            {filters.auditCriteria?.[col] && (
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs"
                                                    placeholder="Threshold"
                                                    value={filters.auditCriteria[col].val}
                                                    onChange={(e) => {
                                                        const val = parseFloat(e.target.value);
                                                        setFilters(prev => {
                                                            const newCriteria = { ...prev.auditCriteria };
                                                            newCriteria[col] = { ...newCriteria[col], val: val };
                                                            return { ...prev, auditCriteria: newCriteria };
                                                        });
                                                    }}
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>

                            </>
                        )}
                    </div>
                )}
            </div>
            {/* Comparison Tool */}
            <div className="space-y-3">
                <button
                    onClick={() => toggleSection('comparison')}
                    className="flex items-center justify-between w-full text-left font-medium text-sm hover:text-white transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4" /> Compare Segments
                    </div>
                    {expandedSections.comparison ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                {expandedSections.comparison && (
                    <div className="space-y-4 pl-2 animate-in slide-in-from-top-2 duration-200">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium">Enable Comparison</label>
                            <input
                                type="checkbox"
                                checked={filters.comparisonEnabled || false}
                                onChange={(e) => setFilters(prev => ({ ...prev, comparisonEnabled: e.target.checked }))}
                                className="accent-blue-500 w-4 h-4"
                            />
                        </div>

                        {filters.comparisonEnabled && (
                            <>
                                <div className="space-y-1">
                                    <label className="text-xs text-gray-400">Column to Compare</label>
                                    <select
                                        className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm"
                                        onChange={(e) => setFilters(prev => ({ ...prev, compareCol: e.target.value }))}
                                        value={filters.compareCol || "Volume Group"}
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
                                        className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm"
                                        placeholder="e.g. 5000-10000"
                                        value={filters.segmentA || ""}
                                        onChange={(e) => setFilters(prev => ({ ...prev, segmentA: e.target.value }))}
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs text-gray-400">Segment B (Search)</label>
                                    <input
                                        type="text"
                                        className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm"
                                        placeholder="e.g. 10000+"
                                        value={filters.segmentB || ""}
                                        onChange={(e) => setFilters(prev => ({ ...prev, segmentB: e.target.value }))}
                                    />
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            <div className="pt-6 mt-auto border-t border-white/10 text-xs text-center text-gray-500 font-mono">
                v{import.meta.env.PACKAGE_VERSION}
            </div>

        </div >
    );
}
