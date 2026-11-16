import { X } from 'lucide-react';
import { isFilterActive, describeFilter, countAuditRules } from '../utils/filters';

function Chip({ label, onRemove, tone = 'blue' }) {
    const tones = {
        blue: 'bg-blue-500/15 border-blue-400/30 text-blue-100',
        red: 'bg-red-500/15 border-red-400/30 text-red-100',
    };
    return (
        <span className={`inline-flex items-center gap-1 max-w-full rounded-full border pl-3 pr-1 py-1 text-xs ${tones[tone]}`}>
            <span className="truncate max-w-[260px]" title={label}>{label}</span>
            <button
                type="button"
                onClick={onRemove}
                aria-label={`Remove ${label}`}
                className="shrink-0 rounded-full p-0.5 hover:bg-white/20 transition-colors"
            >
                <X className="w-3 h-3" />
            </button>
        </span>
    );
}

export default function FilterChips({
    columnFilters, setColumnFilters,
    auditSettings, setAuditSettings,
    shownCount, totalCount,
}) {
    const active = Object.entries(columnFilters).filter(([, f]) => isFilterActive(f));

    const removeFilter = (col) => {
        setColumnFilters(prev => {
            const next = { ...prev };
            delete next[col];
            return next;
        });
    };

    const ruleCount = countAuditRules(auditSettings);
    const auditLabel = ruleCount > 0
        ? `Audit: ${ruleCount} rule${ruleCount === 1 ? '' : 's'} (match ${auditSettings.mode === 'AND' ? 'all' : 'any'})`
        : 'Audit on (no rules yet)';

    return (
        <div className="flex flex-wrap items-center gap-2 min-w-0">
            <span className="text-sm text-muted-foreground mr-1">
                Showing <span className="text-white font-semibold">{shownCount.toLocaleString()}</span> of {totalCount.toLocaleString()} emails
            </span>

            {active.map(([col, filter]) => (
                <Chip key={col} label={describeFilter(col, filter)} onRemove={() => removeFilter(col)} />
            ))}

            {auditSettings.enabled && (
                <Chip
                    tone="red"
                    label={auditLabel}
                    onRemove={() => setAuditSettings(prev => ({ ...prev, enabled: false }))}
                />
            )}
        </div>
    );
}
