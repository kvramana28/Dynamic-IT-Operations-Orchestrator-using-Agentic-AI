import React, { useState, useMemo } from 'react';
import { useMonitoringData } from '../hooks/useMonitoringData';
import { AlertTriangle, CheckCircle, Search, Filter, ChevronRight, ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';
import { formatDistanceToNow } from 'date-fns';
import IncidentAnalyzer from '../components/IncidentAnalyzer';

export default function Incidents() {
  const { incidents, nodes, loading, error } = useMonitoringData();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedSeverity, setSelectedSeverity] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [searchText, setSearchText] = useState('');

  // All hooks MUST be called before any early returns (React Rules of Hooks)
  const filteredIncidents = useMemo(() => {
    let result = incidents;
    if (selectedSeverity) {
      result = result.filter(i => i.severity.toLowerCase() === selectedSeverity.toLowerCase());
    }
    if (selectedStatus) {
      result = result.filter(i => i.status.toLowerCase() === selectedStatus.toLowerCase());
    }
    if (searchText) {
      const q = searchText.toLowerCase();
      result = result.filter(i => {
        const node = nodes.find(n => n.id === i.nodeId);
        return i.id.toLowerCase().includes(q) || (node?.nodeName || '').toLowerCase().includes(q) || i.nodeId.toLowerCase().includes(q);
      });
    }
    return result;
  }, [incidents, nodes, selectedSeverity, selectedStatus, searchText]);

  if (loading) {
    return <div className="flex items-center justify-center h-full">Loading incidents...</div>;
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

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };


  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Incidents</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage and resolve active system incidents.</p>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full text-sm font-medium text-slate-600 dark:text-slate-300 hover:border-indigo-600 transition-colors">
          <Filter size={18} />
          <select value={selectedSeverity} onChange={e => setSelectedSeverity(e.target.value)} className="bg-transparent border-none outline-none text-sm font-medium text-slate-600 dark:text-slate-300 cursor-pointer">
            <option value="">All Severity</option>
            <option value="Critical">Critical</option>
            <option value="Warning">Warning</option>
          </select>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full text-sm font-medium text-slate-600 dark:text-slate-300 hover:border-indigo-600 transition-colors">
          <Filter size={18} />
          <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)} className="bg-transparent border-none outline-none text-sm font-medium text-slate-600 dark:text-slate-300 cursor-pointer">
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="Resolved">Resolved</option>
          </select>
        </div>
        <div className="flex-1"></div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search incidents..." 
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            className="pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none w-64"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Incident ID</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Severity</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Node</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Detected</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredIncidents.map((incident) => {
              const node = nodes.find(n => n.id === incident.nodeId);
              const getValidDate = (dateField: any) => {
                if (!dateField) return new Date();
                if (dateField.toDate) return dateField.toDate();
                const d = new Date(dateField);
                return isNaN(d.getTime()) ? new Date() : d;
              };
              
              const detectedTime = getValidDate(incident.detectedAt);
              const isExpanded = expandedId === incident.id;
              
              return (
                <React.Fragment key={incident.id}>
                  <tr 
                    onClick={() => toggleExpand(incident.id)}
                    className={clsx(
                      "hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer",
                      isExpanded && "bg-slate-50 dark:bg-slate-800/30"
                    )}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span 
                        title={incident.id}
                        className="text-sm font-medium text-slate-900 dark:text-white font-mono cursor-help border-b border-dotted border-slate-400"
                      >
                        #{incident.id.slice(-6)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={clsx(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                        incident.severity === 'Warning' && "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400",
                        incident.severity === 'Critical' && "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400"
                      )}>
                        <AlertTriangle size={14} />
                        {incident.severity}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={clsx(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                        incident.status === 'Active' && "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 animate-pulse",
                        incident.status === 'Resolved' && "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      )}>
                        {incident.status === 'Active' ? <AlertTriangle size={14} /> : <CheckCircle size={14} />}
                        {incident.status}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-slate-600 dark:text-slate-300">{node?.nodeName || incident.nodeId}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                      {formatDistanceToNow(detectedTime, { addSuffix: true })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button className="text-indigo-600 hover:text-indigo-700 font-medium text-sm inline-flex items-center justify-end gap-1">
                        {isExpanded ? 'Hide Details' : 'View Details'} 
                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
                      <td colSpan={6} className="px-6 py-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Incident Information</h4>
                            <dl className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <dt className="text-slate-500">ID:</dt>
                                <dd className="font-mono text-slate-900 dark:text-white">{incident.id}</dd>
                              </div>
                              <div className="flex justify-between">
                                <dt className="text-slate-500">Detected:</dt>
                                <dd className="text-slate-900 dark:text-white">{detectedTime.toLocaleString()}</dd>
                              </div>
                              {incident.resolvedAt && (
                                <div className="flex justify-between">
                                  <dt className="text-slate-500">Resolved:</dt>
                                  <dd className="text-slate-900 dark:text-white">
                                    {getValidDate(incident.resolvedAt).toLocaleString()}
                                  </dd>
                                </div>
                              )}
                            </dl>
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Node Telemetry</h4>
                            <dl className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <dt className="text-slate-500">Provider:</dt>
                                <dd className="text-slate-900 dark:text-white uppercase">{node?.provider}</dd>
                              </div>
                              <div className="flex justify-between">
                                <dt className="text-slate-500">Region:</dt>
                                <dd className="text-slate-900 dark:text-white">{node?.region}</dd>
                              </div>
                              <div className="flex justify-between">
                                <dt className="text-slate-500">Current CPU:</dt>
                                <dd className={clsx("font-medium", (node?.cpuUsage || 0) > 80 ? "text-rose-600" : "text-emerald-600")}>
                                  {node?.cpuUsage.toFixed(1)}%
                                </dd>
                              </div>
                              <div className="flex justify-between">
                                <dt className="text-slate-500">Current RAM:</dt>
                                <dd className={clsx("font-medium", (node?.ramUsage || 0) > 80 ? "text-rose-600" : "text-emerald-600")}>
                                  {node?.ramUsage.toFixed(1)}%
                                </dd>
                              </div>
                            </dl>
                          </div>
                        </div>
                        
                        <IncidentAnalyzer incident={incident} node={node} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            {filteredIncidents.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                  No incidents found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
