import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeTypes,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { motion, AnimatePresence } from 'motion/react';
import AgentNode, { type AgentNodeData } from '../components/AgentNode';
import { Cpu, X, Clock, Terminal, Layers, CheckCircle2, ScrollText, RotateCcw, Settings2 } from 'lucide-react';

const nodeTypes: NodeTypes = { agentNode: AgentNode };

function glowEdge(color: string): Partial<Edge> {
  return {
    animated: true,
    type: 'smoothstep',
    style: { stroke: color, strokeWidth: 2.5, filter: `drop-shadow(0 0 6px ${color}80)` },
    markerEnd: { type: MarkerType.ArrowClosed, color, width: 16, height: 16 },
  };
}

// Static agent metadata
const agentMeta = [
  { id: 'monitoring', agentId: 'Monitoring', label: 'Monitoring Agent', accentColor: 'emerald', description: 'Continuously monitors system metrics across all nodes.', position: { x: 50, y: 180 } },
  { id: 'predictive', agentId: 'Predictive', label: 'Prediction & Incident Agent', accentColor: 'amber', description: 'Analyzes anomalies and predicts critical failures.', position: { x: 370, y: 60 } },
  { id: 'remediation', agentId: 'Remediation', label: 'Remediation Agent', accentColor: 'rose', description: 'Executes automated fixes for critical incidents.', position: { x: 700, y: 180 } },
  { id: 'reporting', agentId: 'Reporting', label: 'Reporting Agent', accentColor: 'indigo', description: 'Generates reports and provides actionable insights.', position: { x: 370, y: 320 } },
];

const accentHex: Record<string, string> = {
  emerald: '#10b981', amber: '#f59e0b', rose: '#f43f5e', indigo: '#6366f1',
};

export default function Workflow() {
  const [activeAgentName, setActiveAgentName] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<AgentNodeData | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; agent: AgentNodeData } | null>(null);
  const [agentStats, setAgentStats] = useState<Record<string, any>>({});

  const handleNodeClick = useCallback((data: AgentNodeData) => {
    setContextMenu(null);
    setSelectedAgent(data);
  }, []);

  const handleNodeContextMenu = useCallback((event: React.MouseEvent, data: AgentNodeData) => {
    setSelectedAgent(null);
    setContextMenu({ x: event.clientX, y: event.clientY, agent: data });
  }, []);

  // Build nodes from live stats
  const buildNodes = useCallback((): any[] => {
    const timeIndex = Math.floor(Date.now() / 2000);
    const predictiveMsgs = [
      "Monitoring data received",
      "Analyzing CPU and RAM trends",
      "Generating prediction insights"
    ];

    return agentMeta.map((meta) => {
      const stats = agentStats[meta.agentId] || {};
      const isActive = activeAgentName === meta.agentId;
      
      let description = meta.description;
      if (meta.id === 'predictive') {
        description = isActive 
          ? "High load detected, generating prediction" 
          : predictiveMsgs[timeIndex % predictiveMsgs.length];
      }

      return {
        id: meta.id,
        type: 'agentNode',
        position: meta.position,
        data: {
          label: meta.label,
          agentId: meta.agentId,
          status: isActive ? 'Active' : 'Running',
          accentColor: meta.accentColor,
          description,
          accuracy: stats.accuracy || '—',
          version: stats.version || '—',
          creationTime: stats.creationTime || 'Not yet active',
          instructionsCount: stats.instructionsCount || 0,
          lastAction: stats.lastAction || 'No actions recorded yet',
          onNodeClick: handleNodeClick,
          onContextMenu: handleNodeContextMenu,
        } as AgentNodeData,
      };
    });
  }, [agentStats, activeAgentName, handleNodeClick, handleNodeContextMenu]);

  const initialEdges: Edge[] = [
    { id: 'e-mon-pred', source: 'monitoring', target: 'predictive', ...glowEdge('#10b981') },
    { id: 'e-pred-rem', source: 'predictive', target: 'remediation', ...glowEdge('#f59e0b') },
    { id: 'e-rem-rep', source: 'remediation', target: 'reporting', ...glowEdge('#f43f5e') },
    { id: 'e-rep-mon', source: 'reporting', target: 'monitoring', ...glowEdge('#6366f1') },
  ];

  const [nodes, setNodes, onNodesChange] = useNodesState(buildNodes());
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  // Poll backend for active agent status + agent stats
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [statusRes, statsRes] = await Promise.all([
          fetch('/api/status'),
          fetch('/api/agent-stats'),
        ]);
        const statusData = await statusRes.json();
        const statsData = await statsRes.json();
        setActiveAgentName(statusData.activeAgent);
        setAgentStats(statsData);
      } catch (e) {}
    };
    fetchAll();
    const interval = setInterval(fetchAll, 2000);
    return () => clearInterval(interval);
  }, []);

  // Update nodes when stats or active agent changes
  useEffect(() => {
    setNodes(buildNodes());
  }, [agentStats, activeAgentName, buildNodes, setNodes]);

  // Close context menu on outside click
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-4 flex justify-between items-center flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
            Agent Workflow
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1 text-sm">
            Live N8N-style pipeline. Stats update in real-time from system telemetry.
          </p>
        </div>
        {activeAgentName && (
          <div className="px-4 py-2 bg-indigo-600/10 text-indigo-600 rounded-xl border border-indigo-600/20 text-sm font-bold flex items-center gap-2 animate-pulse">
            <Cpu size={18} />
            Active: {activeAgentName}
          </div>
        )}
      </div>

      {/* React Flow Canvas */}
      <div className="flex-1 rounded-2xl overflow-hidden border border-slate-700/50 shadow-2xl bg-slate-950 min-h-[500px]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          proOptions={{ hideAttribution: true }}
          className="bg-slate-950"
          onPaneClick={() => { setContextMenu(null); setSelectedAgent(null); }}
        >
          <Background color="#334155" gap={24} size={1.5} />
          <Controls className="!bg-slate-800/80 !border-slate-700 !rounded-xl !shadow-xl [&>button]:!bg-slate-700 [&>button]:!border-slate-600 [&>button]:!text-white [&>button:hover]:!bg-slate-600" />
          <MiniMap
            nodeColor={(node) => accentHex[(node.data as any)?.accentColor] || '#6366f1'}
            maskColor="rgba(15, 23, 42, 0.8)"
            className="!bg-slate-900/80 !border-slate-700 !rounded-xl"
          />
        </ReactFlow>
      </div>

      {/* ==================== CONTEXT MENU ==================== */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -4 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            style={{ position: 'fixed', top: contextMenu.y, left: contextMenu.x, zIndex: 200 }}
            className="w-52 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl shadow-black/50 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-2 border-b border-slate-700/50">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">{contextMenu.agent.label}</p>
            </div>
            {[
              { icon: ScrollText, label: 'View Logs', color: 'text-emerald-400' },
              { icon: RotateCcw, label: 'Restart Agent', color: 'text-amber-400' },
              { icon: Settings2, label: 'Configure', color: 'text-indigo-400' },
            ].map((item) => (
              <button key={item.label} onClick={() => setContextMenu(null)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
                <item.icon size={15} className={item.color} />
                {item.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==================== DETAILS MODAL ==================== */}
      <AnimatePresence>
        {selectedAgent && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
              onClick={() => setSelectedAgent(null)}
              className="fixed inset-0 bg-slate-950/60 z-[99]"
              style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl z-[100] overflow-hidden border border-slate-200 dark:border-slate-800"
            >
              <div className="h-28 relative" style={{ background: `linear-gradient(135deg, ${accentHex[selectedAgent.accentColor] || '#6366f1'}, ${accentHex[selectedAgent.accentColor] || '#6366f1'}88)` }}>
                <button onClick={() => setSelectedAgent(null)} className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors">
                  <X size={20} />
                </button>
                <div className="absolute -bottom-7 left-8 p-3.5 bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-800">
                  <Cpu size={28} style={{ color: accentHex[selectedAgent.accentColor] || '#6366f1' }} />
                </div>
              </div>

              <div className="pt-12 p-8">
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{selectedAgent.label}</h2>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${selectedAgent.status === 'Active' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                      {selectedAgent.status}
                    </span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">{selectedAgent.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs mb-1"><Clock size={14} /><span>Creation Time</span></div>
                    <p className="font-semibold text-slate-900 dark:text-white text-sm">{selectedAgent.creationTime}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs mb-1"><Terminal size={14} /><span>Instructions Implemented</span></div>
                    <p className="font-semibold text-slate-900 dark:text-white text-sm">{selectedAgent.instructionsCount.toLocaleString()}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs mb-1"><Layers size={14} /><span>Version</span></div>
                    <p className="font-semibold text-slate-900 dark:text-white text-sm">{selectedAgent.version}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs mb-1"><CheckCircle2 size={14} /><span>Decision Accuracy</span></div>
                    <p className="font-semibold text-slate-900 dark:text-white text-sm">{selectedAgent.accuracy}</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl border" style={{ backgroundColor: `${accentHex[selectedAgent.accentColor] || '#6366f1'}08`, borderColor: `${accentHex[selectedAgent.accentColor] || '#6366f1'}20` }}>
                  <div className="flex items-center gap-2 text-xs mb-1" style={{ color: accentHex[selectedAgent.accentColor] || '#6366f1' }}>
                    <Cpu size={14} /><span>Last Automated Action</span>
                  </div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white italic">"{selectedAgent.lastAction}"</p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
