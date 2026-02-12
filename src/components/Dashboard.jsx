import React, { useMemo } from 'react';
import { Layers } from 'lucide-react';
import _ from 'lodash';
import { PCT_COLS, findCol } from '../utils/dataProcessing';

export default function Dashboard({ data, filters }) {
    // Apply filters
    const filteredData = useMemo(() => {
        if (!data) return [];
        let res = [...data];

        Object.keys(filters).forEach(col => {
            const filter = filters[col];
            if (filter.equals && filter.equals !== "") {
                res = res.filter(row => String(row[col]) === String(filter.equals));
            }
            if (filter.min !== undefined && filter.min !== "") {
                res = res.filter(row => row[col] >= parseFloat(filter.min));
            }
            if (filter.max !== undefined && filter.max !== "") {
                res = res.filter(row => row[col] <= parseFloat(filter.max));
            }
            if (filter.contains && filter.contains !== "") {
                res = res.filter(row => String(row[col]).toLowerCase().includes(filter.contains.toLowerCase()));
            }
        });

        // Audit Filter (Isolation)
        if (filters.auditEnabled && filters.isolateAudit && filters.auditCriteria) {
            res = res.filter(row => checkAuditFail(row, filters));
        }

        return res;
    }, [data, filters]);

    // Helper to check if a row fails the audit
    // Helper to check if a row fails the audit
    const checkAuditFail = (row, currentFilters) => {
        try {
            if (!currentFilters.auditEnabled || !currentFilters.auditCriteria) return false;

            const criteria = currentFilters.auditCriteria || {};
            const results = [];

            Object.keys(criteria).forEach(col => {
                if (!criteria[col]) return;
                const { op, val } = criteria[col];
                const rowVal = row[col];
                let fail = false;

                // Ensure numeric comparison
                const numRowVal = parseFloat(rowVal);
                const numVal = parseFloat(val);

                if (isNaN(numRowVal) || isNaN(numVal)) return; // Skip invalid numbers

                if (op === '<') fail = numRowVal < numVal;
                else if (op === '<=') fail = numRowVal <= numVal;
                else if (op === '>') fail = numRowVal > numVal;
                else if (op === '>=') fail = numRowVal >= numVal;

                results.push(fail);
            });

            if (results.length === 0) return false;

            const mode = currentFilters.auditMode || 'OR';
            return mode === 'AND' ? results.every(r => r) : results.some(r => r);
        } catch (err) {
            console.error("Audit Check Error:", err);
            return false;
        }
    };

    // Calculate Summary Metrics
    const metrics = useMemo(() => {
        if (filteredData.length === 0) return [];

        // Auto-detect key volume and rate columns
        const sentCol = findCol(filteredData, ['sent']);
        const delCol = findCol(filteredData, ['delivered']);
        const openCol = findCol(filteredData, ['opened']);
        const clickCol = findCol(filteredData, ['clicked', 'clicks']);

        const totalSent = sentCol ? _.sumBy(filteredData, sentCol) : 0;
        const totalDelivered = delCol ? _.sumBy(filteredData, delCol) : 0;
        const totalOpened = openCol ? _.sumBy(filteredData, openCol) : 0;

        // Weighted rates
        const openRate = totalDelivered > 0 ? (totalOpened / totalDelivered) : 0;

        const summary = [
            { label: "Total Sent", value: totalSent.toLocaleString(), type: "number" },
            { label: "Total Delivered", value: totalDelivered.toLocaleString(), type: "number" },
            { label: "Weighted Open Rate", value: (openRate * 100).toFixed(2) + "%", type: "percent" },
        ];

        return summary;

    }, [filteredData]);

    // Comparison Logic
    const comparisonResult = useMemo(() => {
        if (!filters.comparisonEnabled || !filters.compareCol || !filters.segmentA || !filters.segmentB) return null;

        const col = filters.compareCol;
        // Basic contains check for segments
        const segA = filteredData.filter(d => String(d[col]).toLowerCase().includes(filters.segmentA.toLowerCase()));
        const segB = filteredData.filter(d => String(d[col]).toLowerCase().includes(filters.segmentB.toLowerCase()));

        const calcMetrics = (subset) => {
            const sentCol = findCol(subset, ['sent']);
            const devCol = findCol(subset, ['delivered']);
            const openCol = findCol(subset, ['opened']);
            const clickCol = findCol(subset, ['clicked email', 'clicks']);

            const sent = sentCol ? _.sumBy(subset, sentCol) : 0;
            const delivered = devCol ? _.sumBy(subset, devCol) : 0;
            const opened = openCol ? _.sumBy(subset, openCol) : 0;
            const clicked = clickCol ? _.sumBy(subset, clickCol) : 0;

            const openRate = delivered > 0 ? (opened / delivered) : 0;
            const clickRate = delivered > 0 ? (clicked / delivered) : 0;
            const ctor = opened > 0 ? (clicked / opened) : 0;

            return { sent, delivered, opened, clicked, openRate, clickRate, ctor, count: subset.length };
        };

        return {
            a: { name: filters.segmentA, ...calcMetrics(segA) },
            b: { name: filters.segmentB, ...calcMetrics(segB) }
        };
    }, [filteredData, filters]);

    if (filteredData.length === 0) {
        return (
            <div className="glass-card p-8 text-center text-muted-foreground">
                No data matches your filters.
            </div>
        );
    }

    return (
        <div className="space-y-6">

            {/* Comparison View */}
            {comparisonResult && (
                <div className="glass-card p-6 space-y-4 border-l-4 border-blue-500">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Layers className="w-5 h-5 text-blue-400" /> Segment Comparison
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Segment A */}
                        <div className="space-y-2 bg-white/5 p-4 rounded-lg">
                            <p className="text-sm text-gray-400 uppercase font-semibold">{comparisonResult.a.name}</p>
                            <p className="text-xs text-gray-500">{comparisonResult.a.count} items</p>
                            <div className="space-y-1 pt-2">
                                <div className="flex justify-between text-sm"><span>Open Rate:</span> <span className="font-mono text-white">{(comparisonResult.a.openRate * 100).toFixed(2)}%</span></div>
                                <div className="flex justify-between text-sm"><span>Click Rate:</span> <span className="font-mono text-white">{(comparisonResult.a.clickRate * 100).toFixed(2)}%</span></div>
                                <div className="flex justify-between text-sm"><span>CTOR:</span> <span className="font-mono text-white">{(comparisonResult.a.ctor * 100).toFixed(2)}%</span></div>
                            </div>
                        </div>

                        {/* Delta */}
                        <div className="flex flex-col justify-center items-center space-y-4">
                            <div className="text-center">
                                <p className="text-xs text-gray-500">Open Rate Delta</p>
                                <p className={`text-xl font-bold ${(comparisonResult.b.openRate - comparisonResult.a.openRate) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {((comparisonResult.b.openRate - comparisonResult.a.openRate) * 100).toFixed(2)}%
                                </p>
                            </div>
                            <div className="text-center">
                                <p className="text-xs text-gray-500">CTOR Delta</p>
                                <p className={`text-xl font-bold ${(comparisonResult.b.ctor - comparisonResult.a.ctor) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {((comparisonResult.b.ctor - comparisonResult.a.ctor) * 100).toFixed(2)}%
                                </p>
                            </div>
                        </div>

                        {/* Segment B */}
                        <div className="space-y-2 bg-white/5 p-4 rounded-lg text-right">
                            <p className="text-sm text-gray-400 uppercase font-semibold">{comparisonResult.b.name}</p>
                            <p className="text-xs text-gray-500">{comparisonResult.b.count} items</p>
                            <div className="space-y-1 pt-2">
                                <div className="flex justify-between text-sm"><span className="font-mono text-white">{(comparisonResult.b.openRate * 100).toFixed(2)}%</span> <span>:Open Rate</span></div>
                                <div className="flex justify-between text-sm"><span className="font-mono text-white">{(comparisonResult.b.clickRate * 100).toFixed(2)}%</span> <span>:Click Rate</span></div>
                                <div className="flex justify-between text-sm"><span className="font-mono text-white">{(comparisonResult.b.ctor * 100).toFixed(2)}%</span> <span>:CTOR</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {metrics.map((m, i) => (
                    <div key={i} className="glass-card p-4 space-y-1">
                        <p className="text-sm text-muted-foreground font-medium">{m.label}</p>
                        <p className="text-2xl font-bold bg-gradient-to-br from-white to-gray-400 bg-clip-text text-transparent">{m.value}</p>
                    </div>
                ))}
            </div>

            {/* Main Table */}
            <div className="glass-card overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-lg">Campaign Data</h3>
                    <span className="text-xs px-2 py-1 rounded bg-white/5 border border-white/10 text-muted-foreground">{filteredData.length} rows</span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs uppercase bg-white/5 text-gray-400">
                            <tr>
                                {Object.keys(filteredData[0]).slice(0, 8).map(header => (
                                    <th key={header} className="px-4 py-3 font-medium whitespace-nowrap">{header}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredData.slice(0, 50).map((row, i) => {
                                const isFail = filters.auditEnabled && checkAuditFail(row, filters);
                                return (
                                    <tr key={i} className={`border-b border-white/5 transition-colors ${isFail ? 'bg-red-500/20 hover:bg-red-500/30' : 'hover:bg-white/5'}`}>
                                        {Object.keys(row).slice(0, 8).map((key, j) => {
                                            let val = row[key];
                                            if (PCT_COLS.includes(key)) val = (val * 100).toFixed(2) + "%";
                                            return (
                                                <td key={j} className="px-4 py-3 whitespace-nowrap text-gray-300">{val}</td>
                                            )
                                        })}
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
                {filteredData.length > 50 && (
                    <div className="p-3 text-center text-xs text-muted-foreground border-t border-white/5">
                        Showing first 50 rows of {filteredData.length}
                    </div>
                )}
            </div>
        </div>
    );
}
