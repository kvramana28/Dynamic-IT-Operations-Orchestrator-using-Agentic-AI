import { useState, useEffect, useMemo } from 'react';
import { useMonitoringData } from '../hooks/useMonitoringData';
import { Server, Search, Plus, Filter, Globe, Activity, Edit2, Trash2, ChevronLeft, ChevronRight, CheckCircle, AlertTriangle } from 'lucide-react';
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

export default function Nodes() {
  const { nodes: baseNodes, loading, error } = useMonitoringData();

  // State Management - Persisted via localStorage
  const [extraNodes, setExtraNodes] = useState<Node[]>(() => {
    const saved = localStorage.getItem('agentvirtus_extra_nodes');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [editedRegions, setEditedRegions] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('agentvirtus_edited_regions');
    return saved ? JSON.parse(saved) : {};
  });

  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);

  // Sync state changes to localStorage
  useEffect(() => {
    localStorage.setItem('agentvirtus_extra_nodes', JSON.stringify(extraNodes));
  }, [extraNodes]);

  useEffect(() => {
    localStorage.setItem('agentvirtus_edited_regions', JSON.stringify(editedRegions));
  }, [editedRegions]);

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
  
  // Tick counter to force uptime re-computation every interval
  const [, setTick] = useState(0);

  // Helper: compute uptime from createdAt
  const computeUptime = (createdAt: number | string | Date): string => {
    const now = new Date();
    const created = new Date(createdAt);
    const diff = Math.max(0, now.getTime() - created.getTime());

    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 60) {
      if (minutes === 0) {
        const seconds = Math.floor(diff / 1000);
        return `${seconds}s`;
      }
      return `${minutes}m`;
    }
    if (hours < 24) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${days}d ${hours % 24}h`;
  };

  // Dynamic updates for extra nodes (CPU/RAM jitter) + tick for uptime refresh
  useEffect(() => {
    const interval = setInterval(() => {
      // Tick to force uptime recalculation in useMemo
      setTick(t => t + 1);

      setExtraNodes(prev => prev.map(node => {
        const cpuJitter = Math.floor(Math.random() * 21) - 10; // -10 to +10
        const ramJitter = Math.floor(Math.random() * 11) - 5;  // -5 to +5
        
        const newCpu = Math.min(100, Math.max(5, node.cpuUsage + cpuJitter));
        const newRam = Math.min(100, Math.max(10, node.ramUsage + ramJitter));
        
        return {
          ...node,
          cpuUsage: newCpu,
          ramUsage: newRam,
        };
      }));
    }, 2500); // Every 2.5 seconds
    
    return () => clearInterval(interval);
  }, []);

  // Combine base nodes with extra added nodes and apply dynamic status/region/uptime logic
  const nodes = useMemo(() => {
    return [...baseNodes, ...extraNodes].map((n: any) => {
      // Calculate dynamic status based on metrics
      let dynamicStatus: 'Healthy' | 'Warning' | 'Critical' = 'Healthy';
      const cpu = n.cpuUsage;
      const ram = n.ramUsage;

      if (cpu >= 85 || ram >= 85) {
        dynamicStatus = 'Critical';
      } else if (cpu >= 70 || ram >= 70) {
        dynamicStatus = 'Warning';
      }

      // Apply region override if edited
      const region = editedRegions[n.id] || n.region;

      // Compute uptime dynamically from createdAt
      const uptime = n.createdAt ? computeUptime(n.createdAt) : n.uptime;

      return {
        ...n,
        status: dynamicStatus,
        region,
        uptime
      };
    });
  }, [baseNodes, extraNodes, editedRegions]);

  const [filteredNodes, setFilteredNodes] = useState<Node[]>([]);
  const [selectedRegion, setSelectedRegion] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [searchText, setSearchText] = useState("");

  // Filter Logic
  useEffect(() => {
    let result = nodes;

    if (selectedRegion) {
      result = result.filter(n => n.region.toLowerCase() === selectedRegion.toLowerCase());
    }

    if (selectedStatus) {
      result = result.filter(n => n.status === selectedStatus);
    }

    if (searchText) {
      result = result.filter(n =>
        n.nodeName.toLowerCase().includes(searchText.toLowerCase()) ||
        n.region.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    setFilteredNodes(result);
  }, [nodes, selectedRegion, selectedStatus, searchText]);


  const handleAddNode = () => {
    const providers = ['aws', 'gcp', 'azure'];
    const regions: Record<string, string> = { aws: 'us-east-1', gcp: 'eu-west-2', azure: 'asia-south-1' };
    const provider = providers[Math.floor(Math.random() * providers.length)];
    
    setExtraNodes(prev => [...prev, {
      id: `node-${Math.random().toString(36).substring(7)}`,
      nodeName: `${provider}-worker-${Math.floor(Math.random() * 1000)}`,
      provider,
      region: regions[provider],
      status: 'Healthy',
      cpuUsage: Math.floor(Math.random() * 61) + 10, // 10-70
      ramUsage: Math.floor(Math.random() * 51) + 30, // 30-80
      uptime: '0s',
      createdAt: Date.now()
    } as Node]);
  };

  if (loading && baseNodes.length === 0) {
    return <div className="flex items-center justify-center h-full">Loading nodes...</div>;
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

  const avgCpu = nodes.length ? nodes.reduce((acc, n) => acc + n.cpuUsage, 0) / nodes.length : 0;
  const avgRam = nodes.length ? nodes.reduce((acc, n) => acc + n.ramUsage, 0) / nodes.length : 0;
  const fleetHealth = nodes.length 
    ? Math.round((nodes.filter(n => n.status === 'Healthy').length / nodes.length) * 100)
    : 100;

  // Extract unique regions for the filter dropdown
  const uniqueRegions = Array.from(new Set(nodes.map(n => n.region)));

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Infrastructure Nodes</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage and monitor your active fleet across multi-cloud regions.</p>
        </div>
        <button 
          onClick={handleAddNode}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition-all shadow-sm"
        >
          <Plus size={20} />
          Add Node
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="relative">
          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <select 
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="pl-9 pr-8 py-2 appearance-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full text-sm font-medium text-slate-600 dark:text-slate-300 hover:border-indigo-600 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-600/20 cursor-pointer"
          >
            <option value="">All Regions</option>
            {uniqueRegions.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        
        <div className="relative">
          <Activity className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <select 
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="pl-9 pr-8 py-2 appearance-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full text-sm font-medium text-slate-600 dark:text-slate-300 hover:border-indigo-600 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-600/20 cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="Healthy">Healthy</option>
            <option value="Warning">Warning</option>
            <option value="Critical">Critical</option>
          </select>
        </div>
        
        <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full text-sm font-medium text-slate-600 dark:text-slate-300 hover:border-indigo-600 transition-colors">
          <Filter size={18} />
          More Filters
        </button>
        
        <div className="flex-1"></div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search name or region..." 
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none w-64"
          />
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm mb-8">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Node Name</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Region</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">CPU Usage</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">RAM Usage</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Uptime</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredNodes.length > 0 ? filteredNodes.map((node) => (
              <tr key={node.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-medium text-slate-900 dark:text-white">{node.nodeName}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className={clsx(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                    node.status === 'Healthy' && "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                    node.status === 'Warning' && "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400",
                    node.status === 'Critical' && "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400"
                  )}>
                    <span className={clsx(
                      "w-2 h-2 rounded-full",
                      node.status === 'Healthy' && "bg-emerald-500",
                      node.status === 'Warning' && "bg-amber-500",
                      node.status === 'Critical' && "bg-rose-500"
                    )}></span>
                    {node.status}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-500">
                      {node.provider.substring(0, 1).toUpperCase()}
                    </div>
                    {editingNodeId === node.id ? (
                      <input 
                        defaultValue={node.region}
                        autoFocus
                        onBlur={(e) => {
                          setEditedRegions(prev => ({ ...prev, [node.id]: e.target.value }));
                          setEditingNodeId(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            setEditedRegions(prev => ({ ...prev, [node.id]: e.currentTarget.value }));
                            setEditingNodeId(null);
                          } else if (e.key === 'Escape') {
                            setEditingNodeId(null);
                          }
                        }}
                        className="text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-indigo-500 rounded px-1 py-0.5 w-24 outline-none"
                      />
                    ) : (
                      <span className="text-xs text-slate-600 dark:text-slate-300">{node.region}</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="w-32 flex items-center gap-3">
                    <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div 
                        className={clsx(
                          "h-full transition-all duration-500",
                          node.cpuUsage > 90 ? "bg-rose-500" : node.cpuUsage > 80 ? "bg-amber-500" : "bg-indigo-600"
                        )} 
                        style={{ width: `${node.cpuUsage}%` }}
                      ></div>
                    </div>
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{Math.round(node.cpuUsage)}%</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="w-32 flex items-center gap-3">
                    <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div 
                        className={clsx(
                          "h-full transition-all duration-500",
                          node.ramUsage > 90 ? "bg-rose-500" : node.ramUsage > 80 ? "bg-amber-500" : "bg-indigo-600"
                        )} 
                        style={{ width: `${node.ramUsage}%` }}
                      ></div>
                    </div>
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{Math.round(node.ramUsage)}%</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{node.uptime}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3 text-slate-400">
                    <button 
                      title="Edit Region"
                      onClick={() => setEditingNodeId(node.id)}
                      className="hover:text-indigo-600 transition-colors"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      title="Delete Node"
                      onClick={() => {
                        setExtraNodes(prev => prev.filter(n => n.id !== node.id));
                      }}
                      className="hover:text-rose-500 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-slate-500 font-medium">
                  No nodes found matching your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <p className="text-xs text-slate-500">Showing {filteredNodes.length} of {nodes.length} nodes</p>
          <div className="flex items-center gap-2">
            <button className="p-1 rounded border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
              <ChevronLeft size={18} />
            </button>
            <button className="p-1 rounded border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Fleet Overview Cards */}
      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Fleet Overview</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1 */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-500">Total Nodes</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-600/10 text-indigo-600 flex items-center justify-center">
              <Server size={18} />
            </div>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">{nodes.length}</span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-500">Avg CPU Usage</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Activity size={18} />
            </div>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">{Math.round(avgCpu)}%</span>
            {avgCpu > 50 && <span className="text-rose-500 text-xs font-medium mb-1">+5.2% spike</span>}
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-500">Avg RAM Usage</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <Server size={18} />
            </div>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">{Math.round(avgRam)}%</span>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-500">Fleet Health</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CheckCircle size={18} />
            </div>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">{fleetHealth}%</span>
            <span className="text-emerald-500 text-xs font-medium mb-1">Operational</span>
          </div>
        </div>
      </div>
    </div>
  );
}
