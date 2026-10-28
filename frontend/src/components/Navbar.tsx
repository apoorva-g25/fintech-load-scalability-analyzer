import React from 'react';
import {
  Activity,
  PlayCircle,
  BarChart3,
  AlertTriangle,
  GitCompare,
  Globe2,
  Database,
  Settings,
  Download,
  Cpu
} from 'lucide-react';
import { api } from '../services/api';

interface Props {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isRunning?: boolean;
}

export const Navbar: React.FC<Props> = ({ activeTab, setActiveTab, isRunning }) => {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: <Activity className="w-4 h-4" /> },
    { id: 'load-test', label: 'Run Load Test', icon: <PlayCircle className="w-4 h-4" /> },
    { id: 'analytics', label: 'Performance Analytics', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'bottlenecks', label: 'Bottleneck Analysis', icon: <AlertTriangle className="w-4 h-4" /> },
    { id: 'comparison', label: 'Experiment Comparison', icon: <GitCompare className="w-4 h-4" /> },
    { id: 'fx', label: 'FX Analytics', icon: <Globe2 className="w-4 h-4" /> },
    { id: 'explorer', label: 'Transaction Explorer', icon: <Database className="w-4 h-4" /> },
    { id: 'config', label: 'System Configuration', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-50 bg-gray-950/90 backdrop-blur-md border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & System Title */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('overview')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Cpu className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                FinTech Load Analyzer
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                  FX Scalability Engine
                </span>
              </div>
              <p className="text-xs text-gray-400">Domestic & Cross-Border Payment Pipeline</p>
            </div>
          </div>

          {/* Quick Actions & Live indicator */}
          <div className="flex items-center space-x-3">
            {isRunning && (
              <div className="flex items-center space-x-2 bg-cyan-950/60 border border-cyan-700/60 px-3 py-1.5 rounded-lg text-xs text-cyan-300">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                <span className="font-medium">Experiment Running</span>
              </div>
            )}
            <a
              href={api.getExportExcelUrl()}
              download="Experimental_Results.xlsx"
              className="flex items-center space-x-2 bg-gray-900 hover:bg-gray-800 text-gray-300 hover:text-white px-3 py-1.5 rounded-lg border border-gray-700 text-xs font-medium transition"
              title="Download Experimental Results Excel Workbook"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Export Excel</span>
            </a>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex space-x-1 overflow-x-auto pb-2 scrollbar-none">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900/60 border border-transparent'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
