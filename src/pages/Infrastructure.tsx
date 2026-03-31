import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useMonitoringData } from '../hooks/useMonitoringData';
import { 
  Activity, Plus, Shield, 
  Zap, Cloud, Database, PieChart as PieIcon,
  Terminal, AlertCircle, RefreshCw
} from 'lucide-react';
import { 
  PieChart as RePieChart, Pie, Cell, Sector,
  ResponsiveContainer, Tooltip as ReTooltip 
} from 'recharts';
import { clsx } from 'clsx';

interface Node {
  id: string;
  nodeName: string;
  provider: string;
  region: string;
  status: 'Healthy' | 'Warning' | 'Critical';
  cpuUsage: number;
  ramUsage: number;
  uptime: string;
  createdAt?: number;
}

interface InfraLog {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

// Custom active shape for the donut chart
const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g>
      <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 10}
        startAngle={startAngle} endAngle={endAngle} fill={fill} />
      <Sector cx={cx} cy={cy} innerRadius={outerRadius + 14} outerRadius={outerRadius + 16}
        startAngle={startAngle} endAngle={endAngle} fill={fill} opacity={0.5} />
    </g>
  );
};

export default function Infrastructure() {
  const { nodes: baseNodes, loading } = useMonitoringData();
  const [extraNodes, setExtraNodes] = useState<Node[]>(() => {
    const saved = localStorage.getItem('agentvirtus_extra_nodes');
    return saved ? JSON.parse(saved) : [];
  });
  const [logs, setLogs] = useState<InfraLog[]>([]);

  // Sync state changes to localStorage
  useEffect(() => {
    localStorage.setItem('agentvirtus_extra_nodes', JSON.stringify(extraNodes));
  }, [extraNodes]);

  // Listen for storage changes from other pages/tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'agentvirtus_extra_nodes' && e.newValue) {
        setExtraNodes(JSON.parse(e.newValue));
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Feature toggles
  const [autoScaleEnabled, setAutoScaleEnabled] = useState(false);
  const [failoverEnabled, setFailoverEnabled] = useState(false);
  const [autoHealEnabled, setAutoHealEnabled] = useState(false);

  // Failover state
  const [failedRegion, setFailedRegion] = useState<string | null>(null);
  const [healConfidence, setHealConfidence] = useState(0);

  // Donut chart state
  const [activeIndex, setActiveIndex] = useState(0);
  const [donutData, setDonutData] = useState([
    { name: 'AWS', value: 33 },
    { name: 'GCP', value: 40 },
    { name: 'Azure', value: 27 },
  ]);

  // Refs for intervals
  const autoScaleRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const failoverRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoHealRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const allNodesRef = useRef<Node[]>([]);

  // Merge base nodes with locally deployed nodes
  const allNodes = useMemo(() => [...baseNodes, ...extraNodes], [baseNodes, extraNodes]);

  // Keep ref in sync
  useEffect(() => { allNodesRef.current = allNodes; }, [allNodes]);

  // Add Log Helper
  const addLog = useCallback((message: string, type: InfraLog['type'] = 'info') => {
    setLogs(prev => [{
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toLocaleTimeString(),
      message,
      type
    }, ...prev].slice(0, 20));
  }, []);

  // Add Node Function
  const handleAddNode = useCallback(() => {
    const providers = ['aws', 'gcp', 'azure'];
    const regions: Record<string, string> = { aws: 'us-east-1', gcp: 'eu-west-2', azure: 'asia-south-1' };
    const provider = providers[Math.floor(Math.random() * providers.length)];
    const newNode: Node = {
      id: `dynamic-${Math.random().toString(36).substring(7)}`,
      nodeName: `${provider}-dynamic-${Math.floor(Math.random() * 1000)}`,
      provider, region: regions[provider],
      status: 'Healthy',
      cpuUsage: Math.floor(Math.random() * 40) + 10,
      ramUsage: Math.floor(Math.random() * 30) + 20,
      uptime: '0s',
      createdAt: Date.now()
    };
    setExtraNodes(prev => [...prev, newNode]);
    addLog(`Deployed new node ${newNode.nodeName} on ${provider.toUpperCase()}`, 'success');
    return newNode;
  }, [addLog]);

  // ─── DONUT CHART INTERVALS ───
  useEffect(() => {
    // Drift data every 5s
    const dataInterval = setInterval(() => {
      setDonutData(prev => prev.map(d => ({
        ...d,
        value: Math.max(20, Math.min(75, d.value + Math.floor(Math.random() * 11) - 5))
      })));
    }, 5000);
    // Rotate active slice every 2s
    const rotateInterval = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % 3);
    }, 2000);
    return () => { clearInterval(dataInterval); clearInterval(rotateInterval); };
  }, []);

  // Sync donut with real cloudStats
  const cloudStats = useMemo(() => {
    const stats = {
      aws: { count: 0, cpuSum: 0, status: 'Healthy' as Node['status'] },
      gcp: { count: 0, cpuSum: 0, status: 'Healthy' as Node['status'] },
      azure: { count: 0, cpuSum: 0, status: 'Healthy' as Node['status'] }
    };
    allNodes.forEach(node => {
      const p = node.provider.toLowerCase() as keyof typeof stats;
      if (stats[p]) {
        stats[p].count++;
        stats[p].cpuSum += node.cpuUsage;
        if (node.status === 'Critical') stats[p].status = 'Critical';
        else if (node.status === 'Warning' && stats[p].status !== 'Critical') stats[p].status = 'Warning';
      }
    });
    return Object.entries(stats).map(([key, val]) => {
      const providerUpper = key.toUpperCase();
      let avgCpu = val.count ? Math.round(val.cpuSum / val.count) : 0;
      let status = val.status;
      if (failedRegion === providerUpper) { status = 'Critical'; avgCpu = Math.min(100, avgCpu + 30); }
      else if (failedRegion && providerUpper !== failedRegion) { avgCpu = Math.min(95, avgCpu + 15); }
      return {
        provider: providerUpper,
        region: key === 'aws' ? 'us-east-1' : key === 'gcp' ? 'eu-west-2' : 'asia-south-1',
        count: val.count, avgCpu, status,
        isFailed: failedRegion === providerUpper
      };
    });
  }, [allNodes, failedRegion]);

  // Update donut with real data when available
  useEffect(() => {
    if (cloudStats.some(s => s.count > 0)) {
      setDonutData(cloudStats.map(s => ({
        name: s.provider,
        value: s.avgCpu || Math.floor(Math.random() * 40) + 20
      })));
    }
  }, [cloudStats]);

  const healthScore = useMemo(() => {
    if (!allNodes.length) return 100;
    let score = Math.round((allNodes.filter(n => n.status === 'Healthy').length / allNodes.length) * 100);
    if (failedRegion) score = Math.max(40, score - 20);
    return score;
  }, [allNodes, failedRegion]);

  const avgLoad = Math.round(donutData.reduce((s, d) => s + d.value, 0) / donutData.length);
  const COLORS = ['#6366f1', '#f59e0b', '#10b981'];

  // ─── AUTO-SCALING LOGIC ───
  useEffect(() => {
    if (autoScaleEnabled) {
      addLog('⚡ Auto-scaling ENABLED — monitoring system load', 'info');
      autoScaleRef.current = setInterval(() => {
        const nodes = allNodesRef.current;
        const avgCpu = nodes.length > 0 ? nodes.reduce((s, n) => s + n.cpuUsage, 0) / nodes.length : 0;
        if (avgCpu > 70) {
          addLog(`Auto-scaling triggered → Avg CPU at ${Math.round(avgCpu)}%`, 'warning');
          setTimeout(() => {
            handleAddNode();
            addLog(`Scale-up complete — load rebalanced across ${allNodesRef.current.length + 1} nodes`, 'success');
          }, 1500);
        } else {
          addLog(`Auto-scale scan: Avg CPU ${Math.round(avgCpu)}% — within threshold`, 'success');
        }
      }, 8000);
    } else {
      if (autoScaleRef.current) { clearInterval(autoScaleRef.current); autoScaleRef.current = null; addLog('Auto-scaling DISABLED', 'info'); }
    }
    return () => { if (autoScaleRef.current) clearInterval(autoScaleRef.current); };
  }, [autoScaleEnabled]);

  // ─── REGION FAILOVER SIMULATION ───
  useEffect(() => {
    if (failoverEnabled) {
      addLog('🌐 Region failover simulation ENABLED', 'info');
      const triggerFailover = () => {
        const regions = ['AWS', 'GCP', 'AZURE'];
        const target = regions[Math.floor(Math.random() * regions.length)];
        setFailedRegion(target);
        addLog(`🔴 CRITICAL: Region ${target} failure detected!`, 'error');
        addLog(`Initiating failover — shifting load to healthy regions...`, 'warning');
        setTimeout(() => {
          setFailedRegion(null);
          addLog(`✓ Failover complete — ${target} recovered, system stabilized`, 'success');
        }, 8000);
      };
      setTimeout(triggerFailover, 5000);
      failoverRef.current = setInterval(triggerFailover, 25000);
    } else {
      if (failoverRef.current) { clearInterval(failoverRef.current); failoverRef.current = null; setFailedRegion(null); addLog('Region failover simulation DISABLED', 'info'); }
    }
    return () => { if (failoverRef.current) clearInterval(failoverRef.current); };
  }, [failoverEnabled]);

  // ─── AI AUTO-HEALING / INCIDENT RESPONSE ───
  useEffect(() => {
    if (autoHealEnabled) {
      addLog('🤖 AI Incident Response ENABLED — scanning for anomalies', 'info');
      setHealConfidence(Math.floor(Math.random() * 10) + 88);
      autoHealRef.current = setInterval(() => {
        const nodes = allNodesRef.current;
        const criticalNodes = nodes.filter(n => n.cpuUsage > 85);
        const warningNodes = nodes.filter(n => n.cpuUsage > 65 && n.cpuUsage <= 85);
        const confidence = Math.floor(Math.random() * 10) + 88;
        setHealConfidence(confidence);
        if (criticalNodes.length > 0) {
          const target = criticalNodes[0];
          addLog(`AI detected anomaly on ${target.nodeName} (CPU: ${Math.round(target.cpuUsage)}%)`, 'warning');
          setTimeout(() => { addLog(`Auto-remediation executed — restarting ${target.nodeName}`, 'info'); }, 1000);
          setTimeout(() => { addLog(`✓ System stabilized — confidence: ${confidence}%`, 'success'); }, 2500);
        } else if (warningNodes.length > 0) {
          addLog(`AI monitoring: ${warningNodes.length} node(s) in warning — watching...`, 'info');
        } else {
          addLog(`AI scan complete — all systems nominal (confidence: ${confidence}%)`, 'success');
        }
      }, 6000);
    } else {
      if (autoHealRef.current) { clearInterval(autoHealRef.current); autoHealRef.current = null; setHealConfidence(0); addLog('AI Incident Response DISABLED', 'info'); }
    }
    return () => { if (autoHealRef.current) clearInterval(autoHealRef.current); };
  }, [autoHealEnabled]);

  if (loading && baseNodes.length === 0) {
    return <div className="flex items-center justify-center h-full">Loading Infrastructure...</div>;
  }

  const anyFeatureActive = autoScaleEnabled || failoverEnabled || autoHealEnabled;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">System Architecture</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Global infrastructure control panel and autonomous scaling monitor.</p>
        </div>
        <div className="flex items-center gap-3">
          {anyFeatureActive && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-full">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Live</span>
            </div>
          )}
          <button
            onClick={async () => {
              const res = await fetch('/api/simulate', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nodeId: allNodes[Math.floor(Math.random() * allNodes.length)]?.id })
              });
              if (res.ok) addLog('🔥 Manual chaos injection successful', 'warning');
            }}
            className="bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition-all shadow-sm active:scale-95"
          >
            <Zap size={20} /> Simulate Chaos
          </button>
          <button onClick={handleAddNode} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition-all shadow-sm active:scale-95">
            <Plus size={20} /> Add Node
          </button>
        </div>
      </div>

      {/* Region Overview & Health Score */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {cloudStats.map((stat) => (
          <div key={stat.provider} className={clsx(
            "bg-white dark:bg-slate-900 p-6 rounded-2xl border shadow-sm hover:shadow-md transition-all duration-500",
            stat.isFailed ? "border-rose-400 dark:border-rose-600 ring-2 ring-rose-200 dark:ring-rose-900/50 animate-pulse" : "border-slate-200 dark:border-slate-800"
          )}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={clsx("p-2.5 rounded-xl transition-colors duration-500",
                  stat.isFailed ? "bg-rose-500/10 text-rose-500" :
                  stat.provider === 'AWS' ? "bg-orange-500/10 text-orange-500" :
                  stat.provider === 'GCP' ? "bg-blue-500/10 text-blue-500" : "bg-indigo-500/10 text-indigo-500"
                )}>
                  <Cloud size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">{stat.provider}</h3>
                  <p className="text-xs text-slate-500">{stat.region}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {stat.isFailed && <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">FAILED</span>}
                <div className={clsx("w-2.5 h-2.5 rounded-full animate-pulse",
                  stat.isFailed ? "bg-rose-500" : stat.status === 'Healthy' ? "bg-emerald-500" : stat.status === 'Warning' ? "bg-amber-500" : "bg-rose-500"
                )}></div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Active Nodes</span>
                <span className="font-semibold text-slate-900 dark:text-white">{stat.count}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Avg CPU</span>
                <span className={clsx("font-semibold", stat.avgCpu > 80 ? "text-rose-500" : stat.avgCpu > 50 ? "text-amber-500" : "text-emerald-500")}>{stat.avgCpu}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className={clsx("h-full transition-all duration-1000",
                  stat.isFailed ? "bg-rose-500" : stat.avgCpu > 80 ? "bg-rose-500" : stat.avgCpu > 50 ? "bg-amber-500" : "bg-indigo-600"
                )} style={{ width: `${stat.avgCpu}%` }}></div>
              </div>
            </div>
          </div>
        ))}

        {/* Health Score Card */}
        <div className={clsx("p-6 rounded-2xl border shadow-lg text-white relative overflow-hidden transition-all duration-500",
          failedRegion ? "bg-rose-600 border-rose-500 shadow-rose-500/20" : "bg-indigo-600 border-indigo-500 shadow-indigo-500/20"
        )}>
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium opacity-80">Infrastructure Health</span>
              <Shield size={20} />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black">{healthScore}%</span>
              <span className="text-xs opacity-80 font-medium">{failedRegion ? 'DEGRADED' : 'Operational'}</span>
            </div>
            <p className="text-xs mt-4 opacity-70 leading-relaxed font-medium">
              Based on {allNodes.length} active nodes across 3 global regions.
              {failedRegion && ` ⚠ ${failedRegion} region currently down.`}
            </p>
          </div>
          <div className="absolute -right-4 -bottom-4 opacity-10"><Activity size={120} /></div>
        </div>
      </div>

      {/* Middle Section: Animated Donut Chart & Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Animated Donut Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <PieIcon className="text-indigo-600" size={20} />
              <h3 className="font-bold text-slate-900 dark:text-white">Load Distribution</h3>
              <div className="flex items-center gap-1.5 ml-2 px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/20 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Live</span>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
              {donutData.map((d, i) => (
                <div
                  key={d.name}
                  className={clsx('flex items-center gap-1.5 cursor-pointer transition-opacity duration-300', activeIndex === i ? 'opacity-100' : 'opacity-50')}
                  onMouseEnter={() => setActiveIndex(i)}
                >
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }}></span>
                  {d.name}
                </div>
              ))}
            </div>
          </div>

          {/* Chart + Center Label */}
          <div className="h-[260px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                  isAnimationActive={true}
                  animationBegin={0}
                  animationDuration={1000}
                  activeIndex={activeIndex}
                  activeShape={renderActiveShape}
                  onMouseEnter={(_, index) => setActiveIndex(index)}
                >
                  {donutData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                      opacity={activeIndex === index ? 1 : 0.6}
                      style={{ cursor: 'pointer' }}
                    />
                  ))}
                </Pie>
                <ReTooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  formatter={(value: number, name: string) => [`${value}% Load`, name]}
                />
              </RePieChart>
            </ResponsiveContainer>
            {/* Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Avg Load</span>
              <span className="text-3xl font-black transition-all duration-700" style={{ color: COLORS[activeIndex] }}>
                {avgLoad}%
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5">{donutData[activeIndex]?.name}</span>
            </div>
          </div>

          {/* Bottom Stats */}
          <div className="grid grid-cols-3 gap-4 mt-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            {donutData.map((d, i) => (
              <div
                key={d.name}
                className={clsx('text-center cursor-pointer transition-all duration-300 rounded-lg p-1', activeIndex === i && 'bg-slate-50 dark:bg-slate-800')}
                onMouseEnter={() => setActiveIndex(i)}
              >
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">{d.name}</p>
                <p className="text-xl font-bold transition-all duration-500" style={{ color: COLORS[i] }}>{d.value}%</p>
              </div>
            ))}
          </div>
        </div>

        {/* Infra Events Log Panel */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
            <div className="flex items-center gap-2 text-indigo-400">
              <Terminal size={18} />
              <span className="text-xs font-bold uppercase tracking-widest">Infra Events</span>
            </div>
            {anyFeatureActive && (
              <div className="flex items-center gap-2 text-emerald-500 text-[10px] font-bold">
                <RefreshCw size={12} className="animate-spin" /> MONITORING
              </div>
            )}
          </div>
          <div className="flex-1 p-4 overflow-y-auto space-y-3 font-mono text-[11px] max-h-[320px]">
            {logs.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-600 italic">
                Waiting for system events...
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="flex gap-3 animate-in slide-in-from-left-2 duration-300">
                  <span className="text-slate-600 shrink-0">{log.timestamp}</span>
                  <span className={clsx("flex-1",
                    log.type === 'success' ? "text-emerald-400" :
                    log.type === 'warning' ? "text-amber-400" :
                    log.type === 'error' ? "text-rose-400" : "text-slate-300"
                  )}>
                    {log.type === 'success' && '✓ '}
                    {log.type === 'warning' && '⚠ '}
                    {log.type === 'error' && '✕ '}
                    {log.message}
                  </span>
                </div>
              ))
            )}
          </div>
          <div className="p-3 bg-slate-950/50 border-t border-slate-800 text-[10px] text-slate-500 flex justify-between items-center">
            <span>{anyFeatureActive ? 'ACTIVE_SCAN' : 'READY_SCAN_01'}</span>
            <div className={clsx("flex items-center gap-1.5 font-bold", failedRegion ? "text-rose-500" : "text-emerald-500")}>
              <div className={clsx("w-1.5 h-1.5 rounded-full", failedRegion ? "bg-rose-500" : "bg-emerald-500")}></div>
              {failedRegion ? 'ALERT' : 'ONLINE'}
            </div>
          </div>
        </div>
      </div>

      {/* Control Panel — Interactive Toggles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Auto-Scaling */}
        <div className={clsx("bg-white dark:bg-slate-900 p-6 rounded-2xl border shadow-sm transition-all duration-300",
          autoScaleEnabled ? "border-indigo-400 dark:border-indigo-600 ring-1 ring-indigo-200 dark:ring-indigo-900/50" : "border-slate-200 dark:border-slate-800"
        )}>
          <div className="flex items-center gap-4">
            <div className={clsx("p-3 rounded-xl transition-colors", autoScaleEnabled ? "bg-indigo-600 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-500")}>
              <Zap size={24} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-slate-900 dark:text-white">Auto-Scaling</h4>
                {autoScaleEnabled && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>}
              </div>
              <p className="text-xs text-slate-500">{autoScaleEnabled ? 'Monitoring CPU > 70% — auto-deploying' : 'Click toggle to enable auto-scaling'}</p>
            </div>
            <button onClick={() => setAutoScaleEnabled(!autoScaleEnabled)}
              className={clsx("w-12 h-6 rounded-full relative transition-colors duration-300 cursor-pointer",
                autoScaleEnabled ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-700"
              )}>
              <div className={clsx("absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-sm",
                autoScaleEnabled ? "right-1" : "left-1")}></div>
            </button>
          </div>
        </div>

        {/* Region Failover */}
        <div className={clsx("bg-white dark:bg-slate-900 p-6 rounded-2xl border shadow-sm transition-all duration-300",
          failoverEnabled ? "border-emerald-400 dark:border-emerald-600 ring-1 ring-emerald-200 dark:ring-emerald-900/50" : "border-slate-200 dark:border-slate-800"
        )}>
          <div className="flex items-center gap-4">
            <div className={clsx("p-3 rounded-xl transition-colors", failoverEnabled ? "bg-emerald-500 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-500")}>
              <Database size={24} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-slate-900 dark:text-white">Region Failover</h4>
                {failoverEnabled && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>}
              </div>
              <p className="text-xs text-slate-500">
                {failedRegion ? `⚠ ${failedRegion} region down — failover active` : failoverEnabled ? 'Simulating random region failures' : 'Click toggle to simulate failovers'}
              </p>
            </div>
            <button onClick={() => setFailoverEnabled(!failoverEnabled)}
              className={clsx("w-12 h-6 rounded-full relative transition-colors duration-300 cursor-pointer",
                failoverEnabled ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
              )}>
              <div className={clsx("absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-sm",
                failoverEnabled ? "right-1" : "left-1")}></div>
            </button>
          </div>
        </div>

        {/* Incident Response */}
        <div className={clsx("bg-white dark:bg-slate-900 p-6 rounded-2xl border shadow-sm transition-all duration-300",
          autoHealEnabled ? "border-rose-400 dark:border-rose-600 ring-1 ring-rose-200 dark:ring-rose-900/50" : "border-slate-200 dark:border-slate-800"
        )}>
          <div className="flex items-center gap-4">
            <div className={clsx("p-3 rounded-xl transition-colors", autoHealEnabled ? "bg-rose-500 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-500")}>
              <AlertCircle size={24} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-slate-900 dark:text-white">Incident Response</h4>
                {autoHealEnabled && <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></div>}
              </div>
              <p className="text-xs text-slate-500">
                {autoHealEnabled ? `AI auto-healing active — confidence: ${healConfidence}%` : 'Click toggle to enable AI auto-healing'}
              </p>
            </div>
            <button onClick={() => setAutoHealEnabled(!autoHealEnabled)}
              className={clsx("w-12 h-6 rounded-full relative transition-colors duration-300 cursor-pointer",
                autoHealEnabled ? "bg-rose-500" : "bg-slate-300 dark:bg-slate-700"
              )}>
              <div className={clsx("absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-sm",
                autoHealEnabled ? "right-1" : "left-1")}></div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
