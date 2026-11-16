import { useState, useMemo, useCallback } from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown, Columns3, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatCell, getDefaultVisibleColumns, toTime } from '../utils/columns';
import useClickOutside from '../hooks/useClickOutside';

const PAGE_SIZES = [25, 50, 100];

const sortValue = (val, type) => {
    if (val === null || val === undefined || val === '') return null;
    if (type === 'number') {
        const n = Number(val);
        return Number.isFinite(n) ? n : null;
    }
    if (type === 'date') {
        const t = toTime(val);
        return isNaN(t) ? null : t;
    }
    return String(val);
};

export default function DataTable({ rows, columns, columnMeta, isRowFlagged }) {
    const [visible, setVisible] = useState(() => new Set(getDefaultVisibleColumns(columns)));
    const [menuOpen, setMenuOpen] = useState(false);
    const [sort, setSort] = useState({ col: null, dir: null });
    const [pageSize, setPageSize] = useState(25);
    const [pageState, setPageState] = useState(1);

    const closeMenu = useCallback(() => setMenuOpen(false), []);
    const menuRef = useClickOutside(menuOpen, closeMenu);

    const shownColumns = useMemo(() => columns.filter(c => visible.has(c)), [columns, visible]);

    const sortedRows = useMemo(() => {
        if (!sort.col || !sort.dir) return rows;
        const type = columnMeta[sort.col]?.type;
        const direction = sort.dir === 'asc' ? 1 : -1;

        return [...rows].sort((a, b) => {
            const av = sortValue(a[sort.col], type);
            const bv = sortValue(b[sort.col], type);
            // Blank values always go last
            if (av === null && bv === null) return 0;
            if (av === null) return 1;
            if (bv === null) return -1;
            if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * direction;
            return String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' }) * direction;
        });
    }, [rows, sort, columnMeta]);

    const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
    const page = Math.min(pageState, totalPages);
    const start = (page - 1) * pageSize;
    const pageRows = sortedRows.slice(start, start + pageSize);

    // Click cycle: ascending -> descending -> off
    const toggleSort = (col) => {
        setSort(prev => {
            if (prev.col !== col) return { col, dir: 'asc' };
            if (prev.dir === 'asc') return { col, dir: 'desc' };
            return { col: null, dir: null };
        });
        setPageState(1);
    };

    const toggleColumn = (col) => {
        setVisible(prev => {
            const next = new Set(prev);
            if (next.has(col)) next.delete(col);
            else next.add(col);
            return next;
        });
    };

    const smallBtn = 'px-2 py-1 rounded border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-white/5 transition-colors';

    return (
        <div className="glass rounded-xl min-w-0">
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10">
                <h3 className="font-semibold text-lg">Campaign Data</h3>

                <div className="relative" ref={menuRef}>
                    <button
                        type="button"
                        onClick={() => setMenuOpen(o => !o)}
                        className={`flex items-center gap-2 text-sm ${smallBtn}`}
                        aria-expanded={menuOpen}
                    >
                        <Columns3 className="w-4 h-4" /> Columns
                        <span className="text-xs text-muted-foreground">{shownColumns.length}/{columns.length}</span>
                    </button>

                    {menuOpen && (
                        <div className="absolute right-0 top-full mt-2 z-30 w-64 rounded-lg border border-white/10 bg-zinc-900 shadow-xl">
                            <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 text-xs">
                                <button type="button" className="text-blue-400 hover:text-blue-300" onClick={() => setVisible(new Set(columns))}>
                                    Show all
                                </button>
                                <button type="button" className="text-blue-400 hover:text-blue-300" onClick={() => setVisible(new Set(getDefaultVisibleColumns(columns)))}>
                                    Key columns only
                                </button>
                            </div>
                            <div className="max-h-72 overflow-y-auto py-1">
                                {columns.map(col => (
                                    <label key={col} className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-white/5 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="accent-blue-500 w-4 h-4 shrink-0"
                                            checked={visible.has(col)}
                                            onChange={() => toggleColumn(col)}
                                        />
                                        <span className="truncate" title={col}>{col}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Table: scrolls inside this box only, header stays pinned */}
            {rows.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No data matches your filters.</div>
            ) : shownColumns.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">All columns are hidden. Use the Columns menu to show some.</div>
            ) : (
                <div className="overflow-auto max-h-[70vh] custom-scrollbar">
                    <table className="w-full text-sm text-left border-separate border-spacing-0">
                        <thead className="text-xs uppercase text-gray-400">
                            <tr>
                                {shownColumns.map(col => {
                                    const isSorted = sort.col === col;
                                    const numeric = columnMeta[col]?.type === 'number';
                                    return (
                                        <th
                                            key={col}
                                            scope="col"
                                            aria-sort={isSorted ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                                            className="sticky top-0 z-10 bg-zinc-900 border-b border-white/10 p-0 font-medium"
                                        >
                                            <button
                                                type="button"
                                                onClick={() => toggleSort(col)}
                                                title={`${col} — click to sort`}
                                                className={`flex items-center gap-1 w-full px-4 py-3 uppercase hover:text-white transition-colors ${numeric ? 'justify-end' : ''} ${isSorted ? 'text-white' : ''}`}
                                            >
                                                <span className="truncate max-w-[280px]">{col}</span>
                                                {isSorted && sort.dir === 'asc' && <ArrowUp className="w-3 h-3 shrink-0 text-blue-400" />}
                                                {isSorted && sort.dir === 'desc' && <ArrowDown className="w-3 h-3 shrink-0 text-blue-400" />}
                                                {!isSorted && <ArrowUpDown className="w-3 h-3 shrink-0 opacity-30" />}
                                            </button>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {pageRows.map((row, i) => {
                                const flagged = isRowFlagged ? isRowFlagged(row) : false;
                                return (
                                    <tr key={start + i} className={`transition-colors ${flagged ? 'bg-red-500/20 hover:bg-red-500/30' : 'hover:bg-white/5'}`}>
                                        {shownColumns.map(col => {
                                            const text = formatCell(row[col], col, columnMeta);
                                            const numeric = columnMeta[col]?.type === 'number';
                                            return (
                                                <td key={col} className="px-4 py-3 border-b border-white/5 text-gray-300">
                                                    <div
                                                        className={`truncate max-w-[280px] ${numeric ? 'text-right tabular-nums' : ''}`}
                                                        title={text}
                                                    >
                                                        {text}
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination */}
            {rows.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-white/10 text-xs text-muted-foreground">
                    <label className="flex items-center gap-2">
                        Rows per page
                        <select
                            value={pageSize}
                            onChange={(e) => { setPageSize(Number(e.target.value)); setPageState(1); }}
                            className="bg-white/5 border border-white/10 rounded px-2 py-1 text-foreground focus:outline-none focus:border-blue-500"
                        >
                            {PAGE_SIZES.map(size => (
                                <option key={size} value={size} className="text-black">{size}</option>
                            ))}
                        </select>
                    </label>

                    <div className="flex items-center gap-3">
                        <span>
                            {(start + 1).toLocaleString()}–{Math.min(start + pageSize, sortedRows.length).toLocaleString()} of {sortedRows.length.toLocaleString()}
                        </span>
                        <button type="button" className={`flex items-center gap-1 ${smallBtn}`} disabled={page <= 1} onClick={() => setPageState(page - 1)}>
                            <ChevronLeft className="w-3 h-3" /> Prev
                        </button>
                        <span>Page {page} of {totalPages}</span>
                        <button type="button" className={`flex items-center gap-1 ${smallBtn}`} disabled={page >= totalPages} onClick={() => setPageState(page + 1)}>
                            Next <ChevronRight className="w-3 h-3" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
