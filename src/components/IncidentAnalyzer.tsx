import { useState } from 'react';
import Markdown from 'react-markdown';
import { Sparkles, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Node, Incident } from '../hooks/useMonitoringData';
import { clsx } from 'clsx';

interface IncidentAnalyzerProps {
  incident: Incident;
  node?: Node;
}

export default function IncidentAnalyzer({ incident, node }: IncidentAnalyzerProps) {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeIncident = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incident, node })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to analyze incident.");
      }

      setAnalysis(data.analysis);
    } catch (err: any) {
      console.error("AI Analysis Error:", err);
      setError(err.message || "Failed to analyze incident.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
      {!analysis && !loading && !error && (
        <button
          onClick={analyzeIncident}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
        >
          <Sparkles size={16} />
          Analyze Root Cause with AI
        </button>
      )}

      {loading && (
        <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400">
          <Loader2 size={18} className="animate-spin" />
          <span className="text-sm font-medium">Agentic AI is analyzing the incident...</span>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 p-3 rounded-lg">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium">Analysis Failed</p>
            <p className="opacity-80 mt-1">{error}</p>
          </div>
        </div>
      )}

      {analysis && !loading && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-2">
            <CheckCircle2 size={18} />
            <span className="text-sm font-bold uppercase tracking-wider">AI Analysis Complete</span>
          </div>
          <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-indigo-900 dark:prose-headings:text-indigo-300 prose-a:text-indigo-600">
            <Markdown>{analysis}</Markdown>
          </div>
          <button
            onClick={() => setAnalysis(null)}
            className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline mt-4"
          >
            Clear Analysis
          </button>
        </div>
      )}
    </div>
  );
}
