import { useState, useRef, useEffect, useMemo } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Server, 
  AlertTriangle, 
  Database, 
  LineChart, 
  Settings, 
  LogOut,
  Search,
  Bell,

  Bot,
  ShieldAlert,
  Network
} from 'lucide-react';
import { clsx } from 'clsx';
import { useMonitoringData } from '../hooks/useMonitoringData';
import { useUser } from '../context/UserContext';


export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { nodes, incidents, logs, error } = useMonitoringData();
  const { user } = useUser();

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);

  const searchRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearch(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtering logic for search
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return { nodes: [], incidents: [], logs: [] };
    const query = searchQuery.toLowerCase();

    return {
      nodes: nodes.filter(n => 
        n.nodeName.toLowerCase().includes(query) || 
        n.provider.toLowerCase().includes(query) || 
        n.region.toLowerCase().includes(query) ||
        n.status.toLowerCase().includes(query)
      ).slice(0, 5),
      incidents: incidents.filter(i => 
        i.id.toLowerCase().includes(query) || 
        i.severity.toLowerCase().includes(query) || 
        i.status.toLowerCase().includes(query)
      ).slice(0, 5),
      logs: logs.filter(l => 
        l.message.toLowerCase().includes(query) || 
        l.agent.toLowerCase().includes(query)
      ).slice(0, 5)
    };
  }, [searchQuery, nodes, incidents, logs]);

  const hasResults = searchResults.nodes.length > 0 || searchResults.incidents.length > 0 || searchResults.logs.length > 0;

  const notifications = useMemo(() => {
    const criticalIncidents: any[] = incidents.filter(i => i.status === 'Active' && i.severity === 'Critical')
      .map(i => ({ 
        id: i.id, 
        type: 'incident', 
        message: `Critical incident on node ${i.nodeId}`, 
        time: i.detectedAt, 
        severity: 'Critical' 
      }));
    
    const recentLogs: any[] = logs.filter(l => l.agent !== 'System').slice(0, 10)
      .map(l => ({ 
        id: l.id, 
        type: 'log', 
        message: l.message, 
        time: l.timestamp, 
        agent: l.agent 
      }));

    return [...criticalIncidents, ...recentLogs].sort((a, b) => 
      new Date(b.time).getTime() - new Date(a.time).getTime()
    ).slice(0, 10);
  }, [incidents, logs]);

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Workflow', path: '/workflow', icon: Network },
    { name: 'Nodes', path: '/nodes', icon: Server },
    { name: 'Incidents', path: '/incidents', icon: AlertTriangle },
    { name: 'Infrastructure', path: '/infrastructure', icon: Database },
    { name: 'Analytics', path: '/analytics', icon: LineChart },
  ];

  if (error === 'permission-denied') {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <div className="max-w-2xl w-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-rose-200 dark:border-rose-900/50 p-8 text-center">
          <div className="w-20 h-20 bg-rose-100 dark:bg-rose-900/30 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldAlert size={40} />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Firebase Permission Denied</h1>
          <p className="text-lg text-slate-600 dark:text-slate-300 mb-8">
            Your Firestore Security Rules are currently blocking access to the database. To continue testing the application, you need to update your rules.
          </p>
          
          <div className="bg-slate-50 dark:bg-slate-950 rounded-xl p-6 text-left border border-slate-200 dark:border-slate-800 mb-8">
            <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center text-sm">1</span>
              Go to the Firebase Console
            </h3>
            <p className="text-slate-600 dark:text-slate-400 ml-8 mb-6">Open your project and navigate to <strong>Firestore Database &gt; Rules</strong>.</p>
            
            <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center text-sm">2</span>
              Update the rules
            </h3>
            <p className="text-slate-600 dark:text-slate-400 ml-8 mb-4">Replace the existing rules with the following for development purposes:</p>
            
            <div className="ml-8 bg-slate-900 rounded-lg p-4 font-mono text-sm text-emerald-400 overflow-x-auto">
<pre>{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`}</pre>
            </div>
            
            <h3 className="font-bold text-slate-900 dark:text-white mt-6 mb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center text-sm">3</span>
              Click Publish
            </h3>
            <p className="text-slate-600 dark:text-slate-400 ml-8">Once published, refresh this page to continue.</p>
          </div>
          
          <button 
            onClick={() => window.location.reload()} 
            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-colors shadow-lg shadow-indigo-600/20"
          >
            I've updated the rules, refresh page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
      {/* Sidebar */}
      <aside className="w-64 flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
            <Bot size={24} />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-none">Agentic AI</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">System Management</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.name}
                to={item.path}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors',
                  isActive 
                    ? 'bg-indigo-600 text-white' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                )}
              >
                <item.icon size={20} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-1">
          <Link to="/settings" className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <Settings size={20} />
            <span>Settings</span>
          </Link>
          <Link to="/login" className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <LogOut size={20} />
            <span>Sign Out</span>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        {/* Top Header */}
        <header className="h-16 flex items-center justify-between px-8 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
          <div className="flex items-center gap-4 flex-1 max-w-xl relative" ref={searchRef}>
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search system logs, nodes, or incidents..." 
                value={searchQuery}
                onFocus={() => setShowSearch(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearch(true);
                }}
                className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-indigo-600 text-sm outline-none"
              />
            </div>

            {/* Search Results Dropdown */}
            {showSearch && searchQuery.trim() && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-50 max-h-[80vh] flex flex-col">
                {!hasResults ? (
                  <div className="p-8 text-center">
                    <p className="text-slate-500 dark:text-slate-400">No results found for "{searchQuery}"</p>
                  </div>
                ) : (
                  <div className="overflow-y-auto p-2 space-y-4">
                    {searchResults.nodes.length > 0 && (
                      <div className="space-y-1">
                        <h4 className="px-3 py-1 text-xs font-bold text-slate-400 uppercase tracking-wider">Nodes</h4>
                        {searchResults.nodes.map(node => (
                          <button 
                            key={node.id} 
                            onClick={() => { navigate('/nodes'); setShowSearch(false); }}
                            className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
                          >
                            <div className="flex items-center gap-3">
                              <Server size={16} className="text-indigo-500" />
                              <span className="text-sm font-medium">{node.nodeName}</span>
                            </div>
                            <span className={clsx(
                              "text-xs px-2 py-0.5 rounded-full font-bold",
                              node.status === 'Healthy' ? "bg-green-100 dark:bg-green-900/30 text-green-600" :
                              node.status === 'Warning' ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600" :
                              "bg-rose-100 dark:bg-rose-900/30 text-rose-600"
                            )}>{node.status}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {searchResults.incidents.length > 0 && (
                      <div className="space-y-1">
                        <h4 className="px-3 py-1 text-xs font-bold text-slate-400 uppercase tracking-wider">Incidents</h4>
                        {searchResults.incidents.map(inc => (
                          <button 
                            key={inc.id} 
                            onClick={() => { navigate('/incidents'); setShowSearch(false); }}
                            className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
                          >
                            <div className="flex items-center gap-3">
                              <AlertTriangle size={16} className="text-rose-500" />
                              <span className="text-sm font-medium">{inc.id}</span>
                            </div>
                            <span className="text-xs text-slate-500">{inc.severity}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {searchResults.logs.length > 0 && (
                      <div className="space-y-1">
                        <h4 className="px-3 py-1 text-xs font-bold text-slate-400 uppercase tracking-wider">Logs</h4>
                        {searchResults.logs.map(log => (
                          <div key={log.id} className="px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left cursor-default">
                             <p className="text-sm line-clamp-1">{log.message}</p>
                             <p className="text-[10px] text-slate-500 font-mono mt-0.5">{log.agent} • {new Date(log.timestamp).toLocaleTimeString()}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="relative" ref={notificationsRef}>
              <button 
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setHasUnread(false);
                }}
                className={clsx(
                  "w-10 h-10 flex items-center justify-center rounded-xl transition-colors relative",
                  showNotifications ? "bg-indigo-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-indigo-600"
                )}
              >
                <Bell size={20} />
                {hasUnread && (
                  <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-slate-800 animate-pulse"></span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                  <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">Notifications</h3>
                    <button className="text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline">Mark all as read</button>
                  </div>
                  <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center">
                        <p className="text-xs text-slate-500">No new notifications</p>
                      </div>
                    ) : (
                      notifications.map((notif: any) => (
                        <div key={notif.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group">
                          <div className="flex gap-3">
                            <div className={clsx(
                              "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                              notif.severity === 'Critical' ? "bg-rose-100 dark:bg-rose-900/30 text-rose-600" :
                              notif.type === 'incident' ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600" :
                              "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600"
                            )}>
                              {notif.type === 'incident' ? <AlertTriangle size={14} /> : <Database size={14} />}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm text-slate-900 dark:text-slate-100 leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{notif.message}</p>
                              <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider font-bold">
                                {new Date(notif.time).toLocaleTimeString()} • {notif.agent || 'Alert'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 text-center">
                    <button className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-600 transition-colors uppercase tracking-wider">View all logs</button>
                  </div>
                </div>
              )}
            </div>

            <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-2"></div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold">{user.firstName} {user.lastName}</p>
                <p className="text-xs text-slate-500">System Admin</p>
              </div>
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-indigo-600/20 bg-indigo-600/10">
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Alex" alt="User Avatar" />
              </div>
            </div>
          </div>
        </header>

        <div className="p-8">
          <Outlet />
        </div>
      </main>

    </div>
  );
}
