import { useMemo, useCallback } from 'react';
import { Layers } from 'lucide-react';
import { applyColumnFilters, rowFailsAudit, countAuditRules } from '../utils/filters';
import { detectMetricColumns, computeTotals, formatCount, formatRate } from '../utils/metrics';
import FilterChips from './FilterChips';
import DataTable from './DataTable';

const deltaClass = (delta) => (delta === null ? 'text-gray-400' : delta >= 0 ? 'text-green-400' : 'text-red-400');
const formatDelta = (a, b) => (a === null || b === null ? null : b - a);

export default function Dashboard({
    data, columns, columnMeta,
    columnFilters, setColumnFilters,
    auditSettings, setAuditSettings,
    comparisonSettings,
}) {
    const auditActive = auditSettings.enabled && countAuditRules(auditSettings) > 0;

    // Column filters first, then (if the audit has rules) keep only the rows that fail it
    const filteredData = useMemo(() => {
        let res = applyColumnFilters(data, columnFilters);
        if (auditActive) res = res.filter(row => rowFailsAudit(row, auditSettings));
        return res;
    }, [data, columnFilters, auditSettings, auditActive]);

    const metricCols = useMemo(() => detectMetricColumns(data), [data]);

    const metrics = useMemo(() => {
        const t = computeTotals(filteredData, metricCols);
        return [
            { label: 'Total Sent', value: formatCount(t.sent) },
            { label: 'Total Delivered', value: formatCount(t.delivered) },
            { label: 'Total Opened', value: formatCount(t.opened) },
            { label: 'Total Clicked', value: formatCount(t.clicked) },
            { label: 'Weighted Open Rate', value: formatRate(t.openRate), hint: 'opened ÷ delivered' },
            { label: 'Weighted Click Rate', value: formatRate(t.clickRate), hint: 'clicked ÷ delivered' },
            { label: 'Click-to-Open Rate', value: formatRate(t.ctor), hint: 'clicked ÷ opened' },
        ];
    }, [filteredData, metricCols]);

    const comparisonResult = useMemo(() => {
        const { enabled, col, segmentA, segmentB } = comparisonSettings;
        if (!enabled || !col || !segmentA || !segmentB) return null;

        const segment = (term) =>
            filteredData.filter(d => String(d[col] ?? '').toLowerCase().includes(term.toLowerCase()));

        return {
            a: { name: segmentA, ...computeTotals(segment(segmentA), metricCols) },
            b: { name: segmentB, ...computeTotals(segment(segmentB), metricCols) },
        };
    }, [filteredData, comparisonSettings, metricCols]);

    const isRowFlagged = useCallback((row) => rowFailsAudit(row, auditSettings), [auditSettings]);

    const openDelta = comparisonResult && formatDelta(comparisonResult.a.openRate, comparisonResult.b.openRate);
    const ctorDelta = comparisonResult && formatDelta(comparisonResult.a.ctor, comparisonResult.b.ctor);

    return (
        <div className="space-y-4 lg:space-y-6 min-w-0">

            {/* Comparison View */}
            {comparisonResult && (
                <div className="glass-card p-6 space-y-4 border-l-4 border-blue-500">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Layers className="w-5 h-5 text-blue-400" /> Segment Comparison
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Segment A */}
                        <div className="space-y-2 bg-white/5 p-4 rounded-lg min-w-0">
                            <p className="text-sm text-gray-400 uppercase font-semibold truncate">{comparisonResult.a.name}</p>
                            <p className="text-xs text-gray-500">{comparisonResult.a.count} items</p>
                            <div className="space-y-1 pt-2">
                                <div className="flex justify-between text-sm"><span>Open Rate:</span> <span className="font-mono text-white">{formatRate(comparisonResult.a.openRate)}</span></div>
                                <div className="flex justify-between text-sm"><span>Click Rate:</span> <span className="font-mono text-white">{formatRate(comparisonResult.a.clickRate)}</span></div>
                                <div className="flex justify-between text-sm"><span>CTOR:</span> <span className="font-mono text-white">{formatRate(comparisonResult.a.ctor)}</span></div>
                            </div>
                        </div>

                        {/* Delta */}
                        <div className="flex flex-col justify-center items-center space-y-4">
                            <div className="text-center">
                                <p className="text-xs text-gray-500">Open Rate Delta</p>
                                <p className={`text-xl font-bold ${deltaClass(openDelta)}`}>{formatRate(openDelta)}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-xs text-gray-500">CTOR Delta</p>
                                <p className={`text-xl font-bold ${deltaClass(ctorDelta)}`}>{formatRate(ctorDelta)}</p>
                            </div>
                        </div>

                        {/* Segment B */}
                        <div className="space-y-2 bg-white/5 p-4 rounded-lg text-right min-w-0">
                            <p className="text-sm text-gray-400 uppercase font-semibold truncate">{comparisonResult.b.name}</p>
                            <p className="text-xs text-gray-500">{comparisonResult.b.count} items</p>
                            <div className="space-y-1 pt-2">
                                <div className="flex justify-between text-sm"><span className="font-mono text-white">{formatRate(comparisonResult.b.openRate)}</span> <span>:Open Rate</span></div>
                                <div className="flex justify-between text-sm"><span className="font-mono text-white">{formatRate(comparisonResult.b.clickRate)}</span> <span>:Click Rate</span></div>
                                <div className="flex justify-between text-sm"><span className="font-mono text-white">{formatRate(comparisonResult.b.ctor)}</span> <span>:CTOR</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
                {metrics.map(m => (
                    <div key={m.label} className="glass-card p-4 space-y-1 min-w-0">
                        <p className="text-sm text-muted-foreground font-medium truncate" title={m.hint || m.label}>{m.label}</p>
                        <p className="text-2xl font-bold bg-gradient-to-br from-white to-gray-400 bg-clip-text text-transparent truncate">{m.value}</p>
                    </div>
                ))}
            </div>

            {/* Active filters + row count */}
            <FilterChips
                columnFilters={columnFilters}
                setColumnFilters={setColumnFilters}
                auditSettings={auditSettings}
                setAuditSettings={setAuditSettings}
                shownCount={filteredData.length}
                totalCount={data.length}
            />

            {/* Main Table */}
            <DataTable
                rows={filteredData}
                columns={columns}
                columnMeta={columnMeta}
                isRowFlagged={isRowFlagged}
            />
        </div>
    );
}
