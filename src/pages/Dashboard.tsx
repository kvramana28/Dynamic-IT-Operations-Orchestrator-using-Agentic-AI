import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMonitoringData } from '../hooks/useMonitoringData';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';
import { Server, AlertTriangle, CheckCircle, Activity, MoreVertical } from 'lucide-react';
import { clsx } from 'clsx';

export default function Dashboard() {
  const { nodes, incidents, metrics, loading, error } = useMonitoringData();
  const navigate = useNavigate();
  const [cpuRange, setCpuRange] = useState<'live' | '24h' | '7d'>('live');
  const [memRange, setMemRange] = useState<'live' | '24h' | '7d'>('live');
  const [cpuHistory, setCpuHistory] = useState<any[]>([]);
  const [memHistory, setMemHistory] = useState<any[]>([]);

  // All hooks MUST be called before any early returns (React Rules of Hooks)
  const activeIncidents = incidents.filter(i => i.status === 'Active').length;
  const resolvedIncidents = incidents.filter(i => i.status === 'Resolved').length;
  const systemHealth = Math.max(0, Math.min(100, 100 - (activeIncidents * 5)));

  // Dynamic incident trends: group incidents by day of week
  const incidentTrends = useMemo(() => {
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const counts: Record<string, number> = {};
    days.forEach(d => counts[d] = 0);
    incidents.forEach(inc => {
      const date = new Date(inc.detectedAt);
      if (!isNaN(date.getTime())) {
        counts[days[date.getDay()]]++;
      }
    });
    return days.map(day => ({ day, count: counts[day] }));
  }, [incidents]);

  // Handle CPU data range changes
  useEffect(() => {
    let interval: any;
    
    const fetchCpuHistory = async () => {
      try {
        const res = await fetch(`/api/metrics/history?range=${cpuRange}`);
        const data = await res.json();
        setCpuHistory(data);
      } catch (err) {
        console.error("Error fetching CPU history:", err);
      }
    };

    if (cpuRange === 'live') {
      const fetchLive = async () => {
        try {
          const res = await fetch('/api/metrics');
          const data = await res.json();
          setCpuHistory(data.slice(-30));
        } catch (err) {
          console.error("Error fetching live CPU:", err);
        }
      };
      fetchLive();
      interval = setInterval(fetchLive, 2000);
    } else {
      fetchCpuHistory();
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [cpuRange]);

  // Handle Memory data range changes
  useEffect(() => {
    let interval: any;

    const fetchMemHistory = async () => {
      try {
        const res = await fetch(`/api/metrics/history?range=${memRange}`);
        const data = await res.json();
        setMemHistory(data);
      } catch (err) {
        console.error("Error fetching Mem history:", err);
      }
    };

    if (memRange === 'live') {
      const fetchLive = async () => {
        try {
          const res = await fetch('/api/metrics');
          const data = await res.json();
          setMemHistory(data.slice(-30));
        } catch (err) {
          console.error("Error fetching live Mem:", err);
        }
      };
      fetchLive();
      interval = setInterval(fetchLive, 2000);
    } else {
      fetchMemHistory();
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [memRange]);

  const cpuData = cpuHistory;
  const memData = memHistory;

  if (loading) {
    return <div className="flex items-center justify-center h-full">Loading dashboard...</div>;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-rose-50 dark:bg-rose-900/10 rounded-2xl border border-rose-200 dark:border-rose-900/50">
        <AlertTriangle className="text-rose-600 mb-4" size={48} />
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Connection Error</h3>
        <p className="text-slate-600 dark:text-slate-400 max-w-md mb-6">{error}</p>
        <button onClick={() => window.location.reload()} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold">Retry Connection</button>
      </div>
    );
  }


  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Nodes */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-indigo-600/10 text-indigo-600 flex items-center justify-center">
              <Server size={20} />
            </div>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Total Nodes</p>
          <h3 className="text-2xl font-bold mt-1">{nodes.length}</h3>
        </div>

        {/* Active Incidents */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-red-100 text-red-600 dark:bg-red-900/30 flex items-center justify-center">
              <AlertTriangle size={20} />
            </div>
            {activeIncidents > 0 && (
              <span className="text-red-600 dark:text-red-400 text-xs font-bold uppercase tracking-wider">Critical</span>
            )}
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Active Incidents</p>
          <h3 className="text-2xl font-bold mt-1 text-red-600 dark:text-red-400">{activeIncidents}</h3>
        </div>

        {/* Resolved Incidents */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 flex items-center justify-center">
              <CheckCircle size={20} />
            </div>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Resolved Incidents</p>
          <h3 className="text-2xl font-bold mt-1">{resolvedIncidents}</h3>
        </div>

        {/* System Health */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">System Health</p>
            <h3 className="text-2xl font-bold mt-1">{systemHealth}%</h3>
          </div>
          <div className="relative flex items-center justify-center w-14 h-14">
            <svg className="w-full h-full -rotate-90">
              <circle cx="28" cy="28" r="24" fill="transparent" stroke="currentColor" strokeWidth="4" className="text-slate-200 dark:text-slate-800" />
              <circle cx="28" cy="28" r="24" fill="transparent" stroke="currentColor" strokeWidth="4" strokeDasharray="150" strokeDashoffset={150 - (150 * systemHealth) / 100} className="text-indigo-600 transition-all duration-500" />
            </svg>
            <span className="absolute text-[10px] font-bold text-indigo-600">UP</span>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CPU Usage Area Chart */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold">CPU Usage</h3>
            <select value={cpuRange} onChange={e => setCpuRange(e.target.value as any)} className="text-xs bg-slate-100 dark:bg-slate-800 border-none rounded-lg focus:ring-1 focus:ring-indigo-600 px-3 py-1.5 font-medium outline-none">
              <option value="live">Live</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
            </select>
          </div>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cpuData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Tooltip 
                  labelFormatter={(value, payload) => {
                    if (cpuRange === '7d') return `Day: ${payload?.[0]?.payload?.day || value}`;
                    if (cpuRange === '24h') return `Time: ${payload?.[0]?.payload?.time || value}`;
                    return `Time: ${value}`;
                  }}
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', borderRadius: '0.5rem' }}
                  itemStyle={{ color: '#818cf8' }}
                />
                <Area type="monotone" dataKey="cpu" stroke="#4f46e5" strokeWidth={2} fillOpacity={1} fill="url(#cpuGradient)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Memory Usage Area Chart */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold">Memory Usage</h3>
            <select value={memRange} onChange={e => setMemRange(e.target.value as any)} className="text-xs bg-slate-100 dark:bg-slate-800 border-none rounded-lg focus:ring-1 focus:ring-indigo-600 px-3 py-1.5 font-medium outline-none">
              <option value="live">Live</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
            </select>
          </div>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={memData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="memGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Tooltip 
                  labelFormatter={(value, payload) => {
                    if (memRange === '7d') return `Day: ${payload?.[0]?.payload?.day || value}`;
                    if (memRange === '24h') return `Time: ${payload?.[0]?.payload?.time || value}`;
                    return `Time: ${value}`;
                  }}
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', borderRadius: '0.5rem' }}
                  itemStyle={{ color: '#a78bfa' }}
                />
                <Area type="monotone" dataKey="memory" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#memGradient)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Lower Section */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Incident Trends Bar Chart */}
        <div className="xl:col-span-1 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-lg font-bold mb-6">Incident Trends</h3>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={incidentTrends} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', borderRadius: '0.5rem' }} />
                <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 'bold'}} dy={10} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Infrastructure Health Table */}
        <div className="xl:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold">Infrastructure Health</h3>
            <button onClick={() => navigate('/nodes')} className="text-xs text-indigo-600 font-bold hover:underline">View All Nodes</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-separate border-spacing-y-2">
              <thead>
                <tr className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                  <th className="px-4 pb-2">Node ID</th>
                  <th className="px-4 pb-2">Location</th>
                  <th className="px-4 pb-2">Uptime</th>
                  <th className="px-4 pb-2">Status</th>
                  <th className="px-4 pb-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {nodes.slice(0, 3).map((node) => (
                  <tr key={node.id} className="bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group">
                    <td className="px-4 py-4 rounded-l-xl">
                      <div className="flex items-center gap-3">
                        <Server className="text-indigo-600" size={20} />
                        <span className="font-semibold text-sm">{node.nodeName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-400">
                      {node.region}
                    </td>
                    <td className="px-4 py-4 text-sm font-medium">{node.uptime}</td>
                    <td className="px-4 py-4">
                      <span className={clsx(
                        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold",
                        node.status === 'Healthy' && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
                        node.status === 'Warning' && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                        node.status === 'Critical' && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 animate-pulse"
                      )}>
                        <span className={clsx(
                          "w-1.5 h-1.5 rounded-full",
                          node.status === 'Healthy' && "bg-emerald-500",
                          node.status === 'Warning' && "bg-amber-500",
                          node.status === 'Critical' && "bg-red-500"
                        )}></span> 
                        {node.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 rounded-r-xl text-right">
                      <button className="text-slate-400 hover:text-indigo-600 transition-colors">
                        <MoreVertical size={20} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
