import { useState, useMemo } from 'react';
import {
    ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { CalendarX } from 'lucide-react';
import { findDateColumns, buildTrend } from '../utils/trends';
import { formatCount, formatRate } from '../utils/metrics';

// Colour-blind-safe series colours chosen for the dark surface
const RATE_SERIES = [
    { key: 'openRate', name: 'Weighted Open Rate', color: '#3987e5' },
    { key: 'clickRate', name: 'Weighted Click Rate', color: '#d95926' },
    { key: 'ctor', name: 'Click-to-Open Rate', color: '#199e70' },
];
const SENT_COLOR = '#3987e5';

const AXIS_TICK = { fill: '#9ca3af', fontSize: 12 };
const GRID_STROKE = 'rgba(255, 255, 255, 0.08)';
const AXIS_LINE = { stroke: 'rgba(255, 255, 255, 0.15)' };

const compactNumber = (n) => new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(n);
const axisPercent = (v) => `${(v * 100).toFixed(v > 0 && v < 0.1 ? 1 : 0)}%`;

function TrendTooltip({ active, payload, granularity, rows }) {
    if (!active || !payload || payload.length === 0) return null;
    const period = payload[0].payload;

    return (
        <div className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 shadow-xl text-xs">
            <p className="font-semibold text-white">{granularity === 'week' ? `Week of ${period.label}` : period.label}</p>
            <p className="text-gray-400 mb-1.5">{period.count.toLocaleString()} email{period.count === 1 ? '' : 's'}</p>
            {rows.map(row => (
                <div key={row.key} className="flex items-center gap-2 py-0.5">
                    <span className="inline-block w-3 h-0.5 rounded shrink-0" style={{ backgroundColor: row.color }} />
                    <span className="font-semibold text-white tabular-nums">{row.format(period[row.key])}</span>
                    <span className="text-gray-400">{row.name}</span>
                </div>
            ))}
        </div>
    );
}

const RATE_TOOLTIP_ROWS = RATE_SERIES.map(s => ({ ...s, format: formatRate }));
const SENT_TOOLTIP_ROWS = [
    { key: 'sent', name: 'Total Sent', color: SENT_COLOR, format: formatCount },
    { key: 'delivered', name: 'Total Delivered', color: 'transparent', format: formatCount },
];

function Message({ title, children }) {
    return (
        <div className="glass rounded-xl p-8 text-center space-y-2">
            <CalendarX className="w-8 h-8 mx-auto text-gray-500" />
            <p className="font-semibold">{title}</p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">{children}</p>
        </div>
    );
}

export default function TrendView({ rows, data, columns, metricCols }) {
    const [granularity, setGranularity] = useState('month');
    const [chosenCol, setChosenCol] = useState(null);
    const [showTable, setShowTable] = useState(false);

    // Detected from the whole file so the choice doesn't jump around as filters change
    const dateColumns = useMemo(() => findDateColumns(data, columns), [data, columns]);
    const dateCol = chosenCol && dateColumns.includes(chosenCol) ? chosenCol : dateColumns[0] || null;

    const trend = useMemo(
        () => (dateCol ? buildTrend(rows, dateCol, granularity, metricCols) : { periods: [], skipped: 0 }),
        [rows, dateCol, granularity, metricCols]
    );

    if (!dateCol) {
        return (
            <Message title="No send date column found">
                Trends need a column with the send date. The column name should contain &quot;date&quot; or &quot;send&quot;
                (for example &quot;Send Date&quot;) and hold dates such as 2026-03-15 or 3/15/2026.
            </Message>
        );
    }

    const { periods, skipped } = trend;
    const hasRates = periods.some(p => p.openRate !== null || p.clickRate !== null || p.ctor !== null);
    const hasSent = metricCols.sent !== null;
    const showDots = periods.length <= 40;

    const toggleBtn = (value, label) => (
        <button
            type="button"
            onClick={() => setGranularity(value)}
            aria-pressed={granularity === value}
            className={`px-3 py-1 rounded ${granularity === value ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
        >
            {label}
        </button>
    );

    return (
        <div className="space-y-4 lg:space-y-6 min-w-0">
            {/* Controls: one row above the charts */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 text-sm">
                    <div className="flex bg-white/5 border border-white/10 rounded p-1 text-xs">
                        {toggleBtn('week', 'Weekly')}
                        {toggleBtn('month', 'Monthly')}
                    </div>
                    {dateColumns.length > 1 ? (
                        <label className="flex items-center gap-2 text-xs text-muted-foreground">
                            Date column
                            <select
                                value={dateCol}
                                onChange={(e) => setChosenCol(e.target.value)}
                                className="bg-white/5 border border-white/10 rounded px-2 py-1 text-foreground focus:outline-none focus:border-blue-500"
                            >
                                {dateColumns.map(c => <option key={c} value={c} className="text-black">{c}</option>)}
                            </select>
                        </label>
                    ) : (
                        <span className="text-xs text-muted-foreground">Grouped by <span className="text-gray-300">{dateCol}</span></span>
                    )}
                </div>
                {skipped > 0 && (
                    <span className="text-xs text-yellow-400">
                        {skipped.toLocaleString()} email{skipped === 1 ? '' : 's'} left out (no valid date)
                    </span>
                )}
            </div>

            {periods.length === 0 ? (
                <Message title="Nothing to chart">
                    No emails with a valid date match your current filters.
                </Message>
            ) : (
                <>
                    {/* Rates */}
                    <div className="glass rounded-xl p-4 min-w-0">
                        <h3 className="font-semibold">Engagement rates by {granularity}</h3>
                        <p className="text-xs text-muted-foreground mb-3">
                            Weighted: total opens and clicks divided by total delivered (or opened) in each period, not an average per email.
                        </p>
                        {hasRates ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={periods} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                                    <CartesianGrid stroke={GRID_STROKE} vertical={false} />
                                    <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={AXIS_LINE} minTickGap={24} />
                                    <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={axisPercent} width={48} />
                                    <Tooltip
                                        content={<TrendTooltip granularity={granularity} rows={RATE_TOOLTIP_ROWS} />}
                                        cursor={{ stroke: 'rgba(255, 255, 255, 0.3)', strokeWidth: 1 }}
                                    />
                                    <Legend
                                        iconType="plainline"
                                        wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                                        formatter={(value) => <span className="text-gray-300">{value}</span>}
                                    />
                                    {RATE_SERIES.map(s => (
                                        <Line
                                            key={s.key}
                                            type="linear"
                                            dataKey={s.key}
                                            name={s.name}
                                            stroke={s.color}
                                            strokeWidth={2}
                                            dot={showDots ? { r: 3, fill: s.color, strokeWidth: 0 } : false}
                                            activeDot={{ r: 5, stroke: '#18181b', strokeWidth: 2 }}
                                            isAnimationActive={false}
                                        />
                                    ))}
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <p className="py-8 text-center text-sm text-muted-foreground">
                                Rates can&apos;t be calculated because the delivered, opened or clicked columns weren&apos;t found.
                            </p>
                        )}
                    </div>

                    {/* Volume */}
                    <div className="glass rounded-xl p-4 min-w-0">
                        <h3 className="font-semibold mb-3">Total sent by {granularity}</h3>
                        {hasSent ? (
                            <ResponsiveContainer width="100%" height={240}>
                                <BarChart data={periods} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                                    <CartesianGrid stroke={GRID_STROKE} vertical={false} />
                                    <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={AXIS_LINE} minTickGap={24} />
                                    <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={compactNumber} width={48} />
                                    <Tooltip
                                        content={<TrendTooltip granularity={granularity} rows={SENT_TOOLTIP_ROWS} />}
                                        cursor={{ fill: 'rgba(255, 255, 255, 0.06)' }}
                                    />
                                    <Bar dataKey="sent" name="Total Sent" fill={SENT_COLOR} radius={[4, 4, 0, 0]} maxBarSize={48} isAnimationActive={false} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <p className="py-8 text-center text-sm text-muted-foreground">No sent column was found in this file.</p>
                        )}
                    </div>

                    {/* The same numbers as a table */}
                    <div className="glass rounded-xl min-w-0">
                        <button
                            type="button"
                            onClick={() => setShowTable(s => !s)}
                            aria-expanded={showTable}
                            className="w-full px-4 py-3 text-left text-sm text-gray-300 hover:text-white transition-colors"
                        >
                            {showTable ? 'Hide' : 'Show'} the numbers behind these charts ({periods.length} {granularity}{periods.length === 1 ? '' : 's'})
                        </button>
                        {showTable && (
                            <div className="overflow-auto max-h-[50vh] custom-scrollbar border-t border-white/10">
                                <table className="w-full text-sm text-right border-separate border-spacing-0">
                                    <thead className="text-xs uppercase text-gray-400">
                                        <tr>
                                            {[granularity === 'week' ? 'Week of' : 'Month', 'Emails', 'Sent', 'Delivered', 'Opened', 'Clicked', 'Open Rate', 'Click Rate', 'CTOR'].map((h, i) => (
                                                <th key={h} scope="col" className={`sticky top-0 bg-zinc-900 border-b border-white/10 px-4 py-2 font-medium whitespace-nowrap ${i === 0 ? 'text-left' : ''}`}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="tabular-nums text-gray-300">
                                        {periods.map(p => (
                                            <tr key={p.key} className="hover:bg-white/5">
                                                <td className="px-4 py-2 border-b border-white/5 text-left whitespace-nowrap">{p.label}</td>
                                                <td className="px-4 py-2 border-b border-white/5">{p.count.toLocaleString()}</td>
                                                <td className="px-4 py-2 border-b border-white/5">{formatCount(p.sent)}</td>
                                                <td className="px-4 py-2 border-b border-white/5">{formatCount(p.delivered)}</td>
                                                <td className="px-4 py-2 border-b border-white/5">{formatCount(p.opened)}</td>
                                                <td className="px-4 py-2 border-b border-white/5">{formatCount(p.clicked)}</td>
                                                <td className="px-4 py-2 border-b border-white/5">{formatRate(p.openRate)}</td>
                                                <td className="px-4 py-2 border-b border-white/5">{formatRate(p.clickRate)}</td>
                                                <td className="px-4 py-2 border-b border-white/5">{formatRate(p.ctor)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
