import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { motion } from 'motion/react';
import { Activity, Brain, Wrench, LineChart, type LucideIcon } from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  Monitoring: Activity,
  Predictive: Brain,
  Remediation: Wrench,
  Reporting: LineChart,
};

export interface AgentNodeData {
  label: string;
  agentId: string;
  status: 'Active' | 'Running' | 'Idle';
  accentColor: string;
  description: string;
  accuracy: string;
  version: string;
  creationTime: string;
  instructionsCount: number;
  lastAction: string;
  onNodeClick?: (data: AgentNodeData) => void;
  onContextMenu?: (event: React.MouseEvent, data: AgentNodeData) => void;
}

const colorMap: Record<string, { bg: string; text: string; border: string; glow: string; ring: string }> = {
  emerald: {
    bg: 'bg-emerald-500',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
    glow: 'shadow-emerald-500/20',
    ring: 'ring-emerald-400',
  },
  amber: {
    bg: 'bg-amber-500',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
    glow: 'shadow-amber-500/20',
    ring: 'ring-amber-400',
  },
  rose: {
    bg: 'bg-rose-500',
    text: 'text-rose-400',
    border: 'border-rose-500/30',
    glow: 'shadow-rose-500/20',
    ring: 'ring-rose-400',
  },
  indigo: {
    bg: 'bg-indigo-500',
    text: 'text-indigo-400',
    border: 'border-indigo-500/30',
    glow: 'shadow-indigo-500/20',
    ring: 'ring-indigo-400',
  },
};

function AgentNode({ data }: { data: AgentNodeData }) {
  const Icon = iconMap[data.agentId] || Activity;
  const isActive = data.status === 'Active';
  const colors = colorMap[data.accentColor] || colorMap.indigo;

  const handleClick = () => {
    data.onNodeClick?.(data);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    data.onContextMenu?.(e, data);
  };

  return (
    <>
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !rounded-full !bg-slate-600 !border-2 !border-slate-400 hover:!bg-white transition-colors"
      />

      <motion.div
        whileHover={{ y: -4, scale: 1.02 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        className={`
          relative w-[220px] rounded-2xl overflow-hidden cursor-pointer select-none
          bg-slate-900/80 backdrop-blur-xl
          border ${isActive ? colors.border : 'border-slate-700/50'}
          shadow-2xl ${isActive ? colors.glow : 'shadow-black/30'}
          ${isActive ? `ring-2 ${colors.ring} ring-offset-2 ring-offset-slate-950` : ''}
        `}
      >
        {/* Neon top accent bar */}
        <div className={`h-1 w-full ${colors.bg} ${isActive ? 'animate-pulse' : 'opacity-60'}`} />

        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors.bg} shadow-lg`}>
              <Icon size={20} className="text-white" />
            </div>
            <span className={`
              px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider
              ${isActive ? `${colors.bg} text-white` : 'bg-slate-700/50 text-slate-400'}
            `}>
              {data.status}
            </span>
          </div>

          <h3 className="text-sm font-bold text-white mb-1 truncate">{data.label}</h3>
          <p className="text-[11px] text-slate-400 leading-tight mb-3 line-clamp-2">{data.description}</p>

          <div className="flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-700/50 pt-2">
            <span>v{data.version}</span>
            <span className={colors.text}>{data.accuracy} accuracy</span>
          </div>
        </div>

        {isActive && (
          <motion.div
            className={`absolute inset-0 ${colors.bg} opacity-5 rounded-2xl pointer-events-none`}
            animate={{ opacity: [0.03, 0.08, 0.03] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
      </motion.div>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !rounded-full !bg-slate-600 !border-2 !border-slate-400 hover:!bg-white transition-colors"
      />
    </>
  );
}

export default memo(AgentNode);
