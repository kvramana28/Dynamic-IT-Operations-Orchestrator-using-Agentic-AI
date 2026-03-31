import { useState, useEffect } from 'react';
import { useMonitoringData } from '../hooks/useMonitoringData';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, LineChart, Line, Legend
} from 'recharts';
import { Activity, Clock, Zap, Target, Download, Loader2 } from 'lucide-react';

export default function Analytics() {
  const { nodes } = useMonitoringData();
  const [range, setRange] = useState('live');
  const [localIncidents, setLocalIncidents] = useState<any[]>([]);
  const [localMetrics, setLocalMetrics] = useState<any[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchAnalyticsData = async () => {
    setIsFetching(true);
    try {
      const [incsRes, metricsRes] = await Promise.all([
        fetch(`/api/incidents?range=${range}`),
        fetch(`/api/metrics/history?range=${range}`)
      ]);

      if (!incsRes.ok || !metricsRes.ok) throw new Error('Failed to fetch analytics data');

      const [incsData, metricsData] = await Promise.all([
        incsRes.json(),
        metricsRes.json()
      ]);

      setLocalIncidents(incsData);
      setLocalMetrics(metricsData);
      setFetchError(null);
    } catch (err: any) {
      setFetchError(err.message);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
    
    let interval: any;
    if (range === 'live') {
      interval = setInterval(fetchAnalyticsData, 5000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [range]);

  const handleDownloadReport = () => {
    const totalNodes = nodes.length;
    const incidents = localIncidents;
    const activeIncidents = incidents.filter(i => i.status === 'Active').length;
    const resolvedIncidents = incidents.filter(i => i.status === 'Resolved').length;
    const avgCpu = totalNodes ? Math.round(nodes.reduce((acc, n) => acc + n.cpuUsage, 0) / totalNodes) : 0;
    const systemHealth = totalNodes ? Math.round((nodes.filter(n => n.status === 'Healthy').length / totalNodes) * 100) : 100;
    const predictionAccuracy = totalNodes && incidents.length > 0 ? Math.round((resolvedIncidents / incidents.length) * 100 * 10) / 10 : 0; 
    const timestamp = new Date().toLocaleString();

    const csvContent = [
      ["Metric", "Value"],
      ["Total Nodes", totalNodes],
      ["Active Incidents", activeIncidents],
      ["Resolved Incidents", resolvedIncidents],
      ["Average CPU Usage", `${avgCpu}%`],
      ["System Health", `${systemHealth}%`],
      ["Prediction Accuracy", `${predictionAccuracy}%`],
      ["Timestamp", timestamp]
    ].map(e => e.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.style.display = 'none';
    link.href = url;
    link.download = `system_report_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    alert("System analytics report downloaded successfully!");
  };

  if (isFetching && localIncidents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
        <p className="text-slate-600 dark:text-slate-400 font-medium">Loading analytics...</p>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-rose-50 dark:bg-rose-900/10 rounded-2xl border border-rose-200 dark:border-rose-900/50">
        <Activity className="text-rose-600 mb-4" size={48} />
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Connection Error</h3>
        <p className="text-slate-600 dark:text-slate-400 max-w-md mb-6">{fetchError}</p>
        <button onClick={() => fetchAnalyticsData()} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold">Retry Connection</button>
      </div>
    );
  }

  // Use localIncidents instead of global incidents
  const incidents = localIncidents;
  const metrics = localMetrics;

  const resolvedIncs = incidents.filter(i => i.status === 'Resolved' && i.resolvedAt && i.detectedAt);

  // Dynamic MTTR calculation from real incident data
  const mttrDisplay = (() => {
    if (resolvedIncs.length === 0) return '0s';

    const totalMs = resolvedIncs.reduce((sum, inc) => {
      const detected = new Date(inc.detectedAt).getTime();
      const resolved = new Date(inc.resolvedAt!).getTime();
      const diff = resolved - detected;
      return sum + (diff > 0 ? diff : 0);
    }, 0);

    const avgMs = totalMs / resolvedIncs.length;
    const totalSeconds = Math.floor(avgMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const hours = Math.floor(minutes / 60);

    if (totalSeconds < 60) return `${totalSeconds}s`;
    if (minutes < 60) return `${minutes}m`;
    return `${hours}h ${minutes % 60}m`;
  })();

  // Dynamic metrics
  const autoRemediatedPct = incidents.length > 0 
    ? Math.round((resolvedIncs.length / incidents.length) * 100) 
    : 0;
  const criticalEvents = incidents.filter(i => i.severity === 'Critical').length;
  const predAccuracy = incidents.length > 0 
    ? Math.round((resolvedIncs.length / incidents.length) * 1000) / 10
    : 0;

  // Dynamic resolution time data grouped by day (Sun-Sat)
  const resolutionData = (() => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    // Default dataset if no resolved incidents exist to ensure chart is never empty
    if (resolvedIncs.length === 0) {
      return dayNames.map(day => ({ 
        day, 
        time: 0.5 // Default minimal value for visualization
      }));
    }

    const dayTotals: Record<string, { sum: number; count: number }> = {};
    dayNames.forEach(day => {
      dayTotals[day] = { sum: 0, count: 0 };
    });

    resolvedIncs.forEach(inc => {
      const date = new Date(inc.detectedAt);
      if (!isNaN(date.getTime())) {
        const dayName = dayNames[date.getDay()];
        const detected = new Date(inc.detectedAt).getTime();
        const resolved = new Date(inc.resolvedAt!).getTime();
        const seconds = (resolved - detected) / 1000;
        dayTotals[dayName].sum += Math.max(0, seconds);
        dayTotals[dayName].count++;
      }
    });

    return dayNames.map(day => ({
      day,
      time: dayTotals[day].count > 0 
        ? Math.round((dayTotals[day].sum / dayTotals[day].count) * 10) / 10 
        : 0.5 // Minimal value to ensure chart is never visually empty
    }));
  })();

  // Use metrics from history
  const loadData = metrics.map((m, i) => ({
    time: m.time || m.day,
    load: m.cpu ? Math.round(m.cpu * 0.8 + m.memory * 0.2) : 0,
    capacity: 100
  }));

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Analytics</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Deep dive into system performance and agent efficiency.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleDownloadReport}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-all shadow-sm active:scale-95"
          >
            <Download size={18} />
            Download Report
          </button>
          {range === 'live' && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/30 rounded-full">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Live</span>
            </div>
          )}
          <select 
            value={range}
            onChange={(e) => setRange(e.target.value)}
            disabled={isFetching && range !== 'live'}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-600 disabled:opacity-50 transition-opacity"
          >
            <option value="live">Live Mode</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center">
              <Zap size={20} />
            </div>
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Auto-Remediated</h3>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-white">{autoRemediatedPct}%</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center">
              <Clock size={20} />
            </div>
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">MTTR</h3>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-white">{mttrDisplay}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 flex items-center justify-center">
              <Target size={20} />
            </div>
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Prediction Accuracy</h3>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-white">{predAccuracy}%</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-rose-100 dark:bg-rose-900/30 text-rose-600 flex items-center justify-center">
              <Activity size={20} />
            </div>
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Critical Events</h3>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-white">{criticalEvents}</span>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Load vs Capacity */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-lg font-bold mb-6">System Load vs Capacity</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={loadData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', borderRadius: '0.5rem' }}
                />
                <Legend />
                <Line type="monotone" dataKey="load" name="Current Load" stroke="#4f46e5" strokeWidth={3} dot={false} />
                <Line type="stepAfter" dataKey="capacity" name="Total Capacity" stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Mean Time To Resolution */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-lg font-bold mb-6">Mean Time To Resolution</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={resolutionData} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{fill: 'transparent'}}
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', borderRadius: '0.5rem' }}
                />
                <Bar dataKey="time" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
