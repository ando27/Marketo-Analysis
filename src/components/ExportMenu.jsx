import { useState, useCallback } from 'react';
import { Download } from 'lucide-react';
import useClickOutside from '../hooks/useClickOutside';
import { countAuditRules } from '../utils/filters';
import {
    exportFileName, downloadTextFile, buildRowsCsv, buildFailuresCsv, buildSummaryCsv, getAuditFailures,
} from '../utils/exportCsv';

export default function ExportMenu({ rows, allColumns, visibleColumns, columnMeta, auditSettings, totals, buttonClass }) {
    const [open, setOpen] = useState(false);
    const [includeAll, setIncludeAll] = useState(false);

    const close = useCallback(() => setOpen(false), []);
    const ref = useClickOutside(open, close);

    const columns = includeAll ? allColumns : visibleColumns;
    const auditReady = auditSettings.enabled && countAuditRules(auditSettings) > 0;
    // Only counted while the menu is open
    const failureCount = open && auditReady ? getAuditFailures(rows, auditSettings).length : 0;
    const noColumns = columns.length === 0;

    const run = (kind, buildCsv) => {
        downloadTextFile(exportFileName(kind), buildCsv());
        setOpen(false);
    };

    const optionClass = 'block w-full px-3 py-2 text-left hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-transparent transition-colors';

    return (
        <div className="relative" ref={ref}>
            <button type="button" onClick={() => setOpen(o => !o)} className={`flex items-center gap-2 text-sm ${buttonClass}`} aria-expanded={open}>
                <Download className="w-4 h-4" /> Export
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-2 z-30 w-72 rounded-lg border border-white/10 bg-zinc-900 shadow-xl">
                    <label className="flex items-center gap-2 px-3 py-2 border-b border-white/10 text-xs text-gray-300 cursor-pointer">
                        <input
                            type="checkbox"
                            className="accent-blue-500 w-4 h-4 shrink-0"
                            checked={includeAll}
                            onChange={(e) => setIncludeAll(e.target.checked)}
                        />
                        Include all columns
                        <span className="ml-auto text-gray-500">{columns.length} of {allColumns.length}</span>
                    </label>

                    <div className="py-1">
                        <button
                            type="button"
                            className={optionClass}
                            disabled={rows.length === 0 || noColumns}
                            onClick={() => run('filtered', () => buildRowsCsv(rows, columns, columnMeta))}
                        >
                            <span className="block text-sm">Filtered rows</span>
                            <span className="block text-xs text-muted-foreground">
                                {rows.length.toLocaleString()} rows matching the current filters{auditReady ? ' and audit' : ''}
                            </span>
                        </button>

                        <button
                            type="button"
                            className={optionClass}
                            disabled={!auditReady || failureCount === 0 || noColumns}
                            onClick={() => run('failures', () => buildFailuresCsv(rows, columns, columnMeta, auditSettings))}
                        >
                            <span className="block text-sm">Audit failures only</span>
                            <span className="block text-xs text-muted-foreground">
                                {auditReady
                                    ? `${failureCount.toLocaleString()} rows, with a "Failed Rules" column`
                                    : 'Turn on the audit and add a rule first'}
                            </span>
                        </button>

                        <button
                            type="button"
                            className={optionClass}
                            onClick={() => run('summary', () => buildSummaryCsv(totals))}
                        >
                            <span className="block text-sm">Summary metrics</span>
                            <span className="block text-xs text-muted-foreground">The summary cards as a small CSV</span>
                        </button>
                    </div>

                    <p className="px-3 py-2 border-t border-white/10 text-[11px] text-gray-500">
                        CSV files are saved to your computer. Percentages are exported as decimals (0.2 = 20%).
                    </p>
                </div>
            )}
        </div>
    );
}
