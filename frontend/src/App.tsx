import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { OverviewPage } from './pages/OverviewPage';
import { RunLoadTestPage } from './pages/RunLoadTestPage';
import { PerformanceAnalyticsPage } from './pages/PerformanceAnalyticsPage';
import { BottleneckAnalysisPage } from './pages/BottleneckAnalysisPage';
import { ExperimentComparisonPage } from './pages/ExperimentComparisonPage';
import { FxAnalyticsPage } from './pages/FxAnalyticsPage';
import { TransactionExplorerPage } from './pages/TransactionExplorerPage';
import { SystemConfigPage } from './pages/SystemConfigPage';
import { api } from './services/api';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [contextRunId, setContextRunId] = useState<string | undefined>(undefined);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  // Poll dashboard summary periodically to reflect active experiment state in navbar
  useEffect(() => {
    const checkActive = async () => {
      try {
        const summary = await api.getDashboardSummary();
        setIsRunning(!!summary.active_run);
      } catch (err) {
        // server might be starting
      }
    };
    checkActive();
    const interval = setInterval(checkActive, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleNavigate = (tab: string, runId?: string) => {
    if (runId) {
      setContextRunId(runId);
    }
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      {/* Navbar with 8 Navigation Tabs & Status */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isRunning={isRunning}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <OverviewPage onNavigate={handleNavigate} />
        )}
        {activeTab === 'load-test' && (
          <RunLoadTestPage onNavigate={handleNavigate} />
        )}
        {activeTab === 'analytics' && (
          <PerformanceAnalyticsPage />
        )}
        {activeTab === 'bottlenecks' && (
          <BottleneckAnalysisPage initialRunId={contextRunId} onNavigate={handleNavigate} />
        )}
        {activeTab === 'comparison' && (
          <ExperimentComparisonPage />
        )}
        {activeTab === 'fx' && (
          <FxAnalyticsPage />
        )}
        {activeTab === 'explorer' && (
          <TransactionExplorerPage initialRunId={contextRunId} />
        )}
        {activeTab === 'config' && (
          <SystemConfigPage />
        )}
      </main>

      {/* Academic FinTech Footer */}
      <footer className="border-t border-gray-900 bg-gray-950 py-6 text-center text-xs text-gray-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>FinTech System Load & Scalability Analyzer with Foreign Exchange Support</span>
          </div>
          <div>
            <span>Academic Performance Benchmark • Synthetic Domestic & Cross-Border Simulation</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
