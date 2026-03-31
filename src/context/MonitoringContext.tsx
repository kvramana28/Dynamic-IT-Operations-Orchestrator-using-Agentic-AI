import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Node {
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

export interface Incident {
  id: string;
  nodeId: string;
  severity: 'Warning' | 'Critical';
  status: 'Active' | 'Resolved';
  detectedAt: string;
  resolvedAt: string | null;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  agent: 'Monitoring' | 'Predictive' | 'Remediation' | 'Reporting' | 'System';
  message: string;
}

interface MonitoringContextType {
  nodes: Node[];
  incidents: Incident[];
  logs: LogEntry[];
  metrics: any[];
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
}

const MonitoringContext = createContext<MonitoringContextType | undefined>(undefined);

export function MonitoringProvider({ children }: { children: ReactNode }) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [nodesRes, incidentsRes, logsRes, metricsRes] = await Promise.all([
        fetch('/api/nodes'),
        fetch('/api/incidents'),
        fetch('/api/logs'),
        fetch('/api/metrics')
      ]);

      if (!nodesRes.ok || !incidentsRes.ok || !logsRes.ok || !metricsRes.ok) {
        throw new Error('Failed to fetch data from backend');
      }

      const [nodesData, incidentsData, logsData, metricsData] = await Promise.all([
        nodesRes.json(),
        incidentsRes.json(),
        logsRes.json(),
        metricsRes.json()
      ]);

      setNodes(nodesData);
      setIncidents(incidentsData);
      setLogs(logsData);
      setMetrics(metricsData);
      setLoading(false);
      setError(null);
    } catch (err: any) {
      console.error("Fetch error:", err);
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <MonitoringContext.Provider value={{ nodes, incidents, logs, metrics, loading, error, refreshData: fetchData }}>
      {children}
    </MonitoringContext.Provider>
  );
}

export function useMonitoring() {
  const context = useContext(MonitoringContext);
  if (context === undefined) {
    throw new Error('useMonitoring must be used within a MonitoringProvider');
  }
  return context;
}
