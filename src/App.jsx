import { useState, useMemo } from 'react';
import { Upload, AlertCircle, RefreshCw } from 'lucide-react';
import { processData, parseFile, addVolumeTiers } from './utils/dataProcessing';
import { buildColumnMeta } from './utils/columns';
import { parseCutoffs } from './utils/filters';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';

const DEFAULT_CUTOFFS = [5000, 10000];
const DEFAULT_AUDIT = { enabled: false, mode: 'OR', criteria: {} };
const DEFAULT_COMPARISON = { enabled: false, col: 'Volume Group', segmentA: '', segmentB: '' };

function App() {
    // Cleaned data WITHOUT volume tiers; tiers are added below so they can be re-run
    const [processedData, setProcessedData] = useState(null);
    const [loading, setLoading] = useState(false);

    // Column filters, audit and comparison are kept apart so settings are never mistaken for columns
    const [columnFilters, setColumnFilters] = useState({});
    const [auditSettings, setAuditSettings] = useState(DEFAULT_AUDIT);
    const [comparisonSettings, setComparisonSettings] = useState(DEFAULT_COMPARISON);

    // Volume tiers: what's typed in the box vs. the last valid cutoffs actually in use
    const [cutoffsText, setCutoffsText] = useState(DEFAULT_CUTOFFS.join(', '));
    const [appliedCutoffs, setAppliedCutoffs] = useState(DEFAULT_CUTOFFS);

    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    const handleFileUpload = async (e) => {
        const uploadedFile = e.target.files[0];
        if (!uploadedFile) return;

        setLoading(true);
        try {
            const raw = await parseFile(uploadedFile);
            const processed = processData(raw);
            if (processed.length === 0) {
                alert("No data rows were found in that file.");
                return;
            }
            setProcessedData(processed);
        } catch (error) {
            console.error("Error parsing file:", error);
            alert("Error parsing file. Please check the format.");
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setProcessedData(null);
        setColumnFilters({});
        setAuditSettings(DEFAULT_AUDIT);
        setComparisonSettings(DEFAULT_COMPARISON);
        setCutoffsText(DEFAULT_CUTOFFS.join(', '));
        setAppliedCutoffs(DEFAULT_CUTOFFS);
    };

    const handleCutoffsChange = (text) => {
        setCutoffsText(text);
        const parsed = parseCutoffs(text);
        // Invalid input is ignored: the last valid cutoffs stay in use
        if (!parsed || parsed.join() === appliedCutoffs.join()) return;

        setAppliedCutoffs(parsed);
        // The tier names just changed, so a Volume Group filter picked earlier no longer matches anything
        setColumnFilters(prev => {
            if (!prev['Volume Group']) return prev;
            return { ...prev, 'Volume Group': { ...prev['Volume Group'], value: '' } };
        });
    };

    // Re-run volume tiers whenever the data or the cutoffs change
    const currentData = useMemo(() => {
        if (!processedData) return null;
        return addVolumeTiers(processedData, appliedCutoffs);
    }, [processedData, appliedCutoffs]);

    // Column list, types and unique values: computed once per dataset, not on every render
    const columns = useMemo(() => (currentData && currentData.length > 0 ? Object.keys(currentData[0]) : []), [currentData]);
    const columnMeta = useMemo(() => buildColumnMeta(currentData), [currentData]);

    const hasData = currentData && currentData.length > 0;

    return (
        <div className="min-h-screen w-full max-w-[100vw] overflow-x-clip bg-background text-foreground font-sans selection:bg-primary selection:text-primary-foreground">
            {/* Header */}
            <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="flex h-14 w-full max-w-screen-2xl mx-auto items-center px-4 lg:px-6 2xl:px-8 justify-between">
                    <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
                        <span className="text-blue-500">⚡</span> Marketo Auditor
                    </div>
                    {processedData && (
                        <button
                            onClick={handleReset}
                            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-white transition-colors"
                        >
                            <RefreshCw className="w-4 h-4" /> Reset
                        </button>
                    )}
                </div>
            </header>

            <main className="w-full max-w-screen-2xl mx-auto p-4 lg:p-6 2xl:p-8">
                {!hasData ? (
                    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 animate-in fade-in zoom-in duration-500">
                        <div className="text-center space-y-2">
                            <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl bg-gradient-to-r from-blue-400 to-indigo-600 bg-clip-text text-transparent">
                                Audit Your Campaigns
                            </h1>
                            <p className="text-muted-foreground text-lg max-w-[600px]">
                                Upload your Marketo campaign data to instantly analyze performance, benchmark against goals, and identify segments.
                            </p>
                        </div>

                        <div className="w-full max-w-md">
                            <label
                                htmlFor="file-upload"
                                className={`relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-white/20 rounded-2xl cursor-pointer bg-white/5 hover:bg-white/10 hover:border-blue-500/50 transition-all duration-300 group overflow-hidden ${loading ? 'opacity-50 pointer-events-none' : ''}`}
                            >
                                <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    {loading ? (
                                        <div className="p-4 rounded-full bg-white/5 mb-4 animate-spin">
                                            <RefreshCw className="w-8 h-8 text-blue-400" />
                                        </div>
                                    ) : (
                                        <div className="p-4 rounded-full bg-white/5 mb-4 group-hover:scale-110 transition-transform duration-300">
                                            <Upload className="w-8 h-8 text-blue-400" />
                                        </div>
                                    )}
                                    <p className="mb-2 text-sm text-gray-400">
                                        <span className="font-semibold text-white">{loading ? "Processing..." : "Click to upload"}</span> {loading ? "" : "or drag and drop"}
                                    </p>
                                    <p className="text-xs text-gray-500">CSV or Excel files</p>
                                </div>
                                <input id="file-upload" type="file" className="hidden" accept=".csv, .xlsx, .xls" onChange={handleFileUpload} disabled={loading} />
                            </label>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-yellow-500/80 bg-yellow-500/10 px-4 py-2 rounded-full">
                            <AlertCircle className="w-4 h-4" />
                            <span>Client-side processing only. Your data never leaves your browser.</span>
                        </div>
                    </div>
                ) : (
                    <div className={`grid grid-cols-1 gap-4 lg:gap-6 min-w-0 ${sidebarCollapsed ? 'md:grid-cols-[3.5rem_minmax(0,1fr)]' : 'md:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)]'}`}>
                        <aside className="min-w-0">
                            <Sidebar
                                columns={columns}
                                columnMeta={columnMeta}
                                columnFilters={columnFilters}
                                setColumnFilters={setColumnFilters}
                                auditSettings={auditSettings}
                                setAuditSettings={setAuditSettings}
                                comparisonSettings={comparisonSettings}
                                setComparisonSettings={setComparisonSettings}
                                cutoffsText={cutoffsText}
                                onCutoffsChange={handleCutoffsChange}
                                cutoffsValid={parseCutoffs(cutoffsText) !== null}
                                appliedCutoffs={appliedCutoffs}
                                collapsed={sidebarCollapsed}
                                onToggleCollapsed={() => setSidebarCollapsed(c => !c)}
                            />
                        </aside>
                        <section className="min-w-0">
                            <Dashboard
                                data={currentData}
                                columns={columns}
                                columnMeta={columnMeta}
                                columnFilters={columnFilters}
                                setColumnFilters={setColumnFilters}
                                auditSettings={auditSettings}
                                setAuditSettings={setAuditSettings}
                                comparisonSettings={comparisonSettings}
                            />
                        </section>
                    </div>
                )}
            </main>
        </div>
    )
}

export default App
