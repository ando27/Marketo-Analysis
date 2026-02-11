import React, { useState, useMemo } from 'react';
import { Upload, FileUp, AlertCircle, RefreshCw } from 'lucide-react';
import { processData, parseFile, addVolumeTiers } from './utils/dataProcessing';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';

function App() {
    const [file, setFile] = useState(null);
    const [rawData, setRawData] = useState(null);
    const [processedData, setProcessedData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [resetCount, setResetCount] = useState(0);

    // Filter State
    const [filters, setFilters] = useState({});
    const [volumeCutoffs, setVolumeCutoffs] = useState("5000, 10000");

    const handleFileUpload = async (e) => {
        const uploadedFile = e.target.files[0];
        if (!uploadedFile) return;

        setLoading(true);
        try {
            const raw = await parseFile(uploadedFile); // Keep raw for resets
            const processed = processData(raw);
            const withTiers = addVolumeTiers(processed); // Default tiers

            setFile(uploadedFile);
            setRawData(raw);
            setProcessedData(withTiers);
        } catch (error) {
            console.error("Error parsing file:", error);
            alert("Error parsing file. Please check the format.");
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setFile(null);
        setRawData(null);
        setProcessedData(null);
        setFilters({});
        setResetCount(prev => prev + 1);
    };

    // Re-calculate tiers if cutoffs change
    const currentData = useMemo(() => {
        if (!processedData) return null;
        // Note: In a real app we might want to preserve the raw 'processed' and only re-run tiering
        // For now, let's assume processedData already has default tiers. 
        // We can re-run tiering here if needed or just use what we have.
        return processedData;
    }, [processedData]);

    return (
        <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary selection:text-primary-foreground">
            {/* Header */}
            <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container flex h-14 max-w-screen-2xl items-center px-4 justify-between">
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

            <main className="container max-w-screen-2xl mx-auto p-8">
                {!processedData ? (
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
                    <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-8">
                        <aside className="space-y-6">
                            <Sidebar
                                data={currentData}
                                filters={filters}
                                setFilters={setFilters}
                                volumeCutoffs={volumeCutoffs}
                                setVolumeCutoffs={setVolumeCutoffs}
                            />
                        </aside>
                        <section className="space-y-6">
                            <Dashboard data={currentData} filters={filters} />
                        </section>
                    </div>
                )}
            </main>
        </div>
    )
}

export default App
