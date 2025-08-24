'use client';

import React, { useState, useEffect } from 'react';
import { backgroundProcessor } from '../utils/BackgroundProcessor';
import { serviceWorkerManager, BackgroundData } from '../utils/ServiceWorkerManager';

export const BackgroundDebugPanel: React.FC = () => {
  const [stats, setStats] = useState(backgroundProcessor.getStats());
  const [swStats, setSWStats] = useState<BackgroundData | null>(null);
  const [swRegistration, setSWRegistration] = useState(serviceWorkerManager.getRegistrationState());
  const [isCollapsed, setIsCollapsed] = useState(true);

  useEffect(() => {
    const updateStats = async () => {
      setStats(backgroundProcessor.getStats());
      setSWRegistration(serviceWorkerManager.getRegistrationState());
      
      try {
        const backgroundData = await serviceWorkerManager.getBackgroundData();
        setSWStats(backgroundData);
      } catch (error) {
        // Silent fail for now
      }
    };
    
    const interval = setInterval(updateStats, 1000);
    return () => clearInterval(interval);
  }, []);

  if (process.env.NODE_ENV === 'production') return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl max-w-sm">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full px-4 py-2 text-left text-sm font-medium text-gray-300 hover:text-white"
        >
          🧠 Background Tracking Debug {isCollapsed ? '▶' : '▼'}
        </button>
        
        {!isCollapsed && (
          <div className="p-4 border-t border-gray-700 text-xs space-y-3">
            {/* Service Worker Status */}
            <div className="border border-gray-600 rounded p-2">
              <div className="text-gray-300 font-semibold mb-2">Service Worker Status</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-gray-400">Registered</div>
                  <div className={`font-mono ${swRegistration.isRegistered ? 'text-green-400' : 'text-red-400'}`}>
                    {swRegistration.isRegistered ? 'YES' : 'NO'}
                  </div>
                </div>
                <div>
                  <div className="text-gray-400">Controlled</div>
                  <div className={`font-mono ${swRegistration.isControlled ? 'text-green-400' : 'text-red-400'}`}>
                    {swRegistration.isControlled ? 'YES' : 'NO'}
                  </div>
                </div>
              </div>
            </div>

            {/* Background Data */}
            {swStats && (
              <div className="border border-gray-600 rounded p-2">
                <div className="text-gray-300 font-semibold mb-2">Background Processing</div>
                <div className="space-y-1">
                  <div>
                    <span className="text-gray-400">Keystroke Data:</span> 
                    <span className="font-mono text-cyan-400 ml-1">{swStats.keystrokeCount}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Risk History:</span> 
                    <span className="font-mono text-purple-400 ml-1">{swStats.riskHistory.length}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Last Processed:</span> 
                    <span className="font-mono text-green-400 ml-1">
                      {Math.round((Date.now() - swStats.lastProcessed) / 1000)}s ago
                    </span>
                  </div>
                  {swStats.riskHistory.length > 0 && (
                    <div>
                      <span className="text-gray-400">Latest Risk:</span> 
                      <span className="font-mono text-orange-400 ml-1">
                        {(swStats.riskHistory[swStats.riskHistory.length - 1].risk * 100).toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab Status */}
            <div className="border border-gray-600 rounded p-2">
              <div className="text-gray-300 font-semibold mb-2">Tab Status</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-gray-400">Visibility</div>
                  <div className={`font-mono ${stats.isVisible ? 'text-green-400' : 'text-blue-400'}`}>
                    {stats.isVisible ? 'VISIBLE' : 'HIDDEN'}
                  </div>
                </div>
                <div>
                  <div className="text-gray-400">Tasks</div>
                  <div className="font-mono text-cyan-400">{stats.activeTaskCount}</div>
                </div>
              </div>
            </div>
            
            <div className="pt-2 border-t border-gray-800">
              <div className="text-gray-500 text-[10px] leading-relaxed">
                <div className="text-yellow-400 font-semibold mb-1">⚠️ Browser Limitation:</div>
                Web browsers prevent capturing keystrokes from other applications or tabs for security. 
                The Service Worker processes existing data in background but can't capture new events when this tab is inactive.
                <div className="mt-1 text-blue-400">💡 Switch tabs to test background processing of existing data.</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};