import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  PieChart, 
  List, 
  Upload, 
  Settings,
  Wallet
} from 'lucide-react';
import Dashboard from '@/pages/Dashboard';
import Transactions from '@/pages/Transactions';
import Analytics from '@/pages/Analytics';
import Import from '@/pages/Import';
import SettingsPage from '@/pages/Settings';

function App() {
  const location = useLocation();
  
  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/transactions', label: 'Transactions', icon: List },
    { path: '/analytics', label: 'Analytics', icon: PieChart },
    { path: '/import', label: 'Import', icon: Upload },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-dark-800 flex">
      <aside className="w-64 bg-dark-700 border-r border-dark-500 fixed h-full z-10">
        <div className="p-6 border-b border-dark-500">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-warm-500 to-amber-500 rounded-xl flex items-center justify-center shadow-glow">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gradient-warm">
                Budget
              </h1>
              <p className="text-xs text-stone-500">Tracker</p>
            </div>
          </div>
        </div>

        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-warm-500/10 text-warm-400 shadow-glow'
                    : 'text-stone-400 hover:bg-dark-600 hover:text-stone-200'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-warm-400' : 'text-stone-500'}`} />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="flex-1 ml-64 p-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/import" element={<Import />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
