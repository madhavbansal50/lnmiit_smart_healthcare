import React, { useState } from 'react';
import { Sliders, Cpu, Activity, AlertTriangle, ShieldCheck, Zap, Radio } from 'lucide-react';
import { useVitals } from '../../context/VitalsContext';

export const SimulatorBar = () => {
  const { scenarios, changeScenario, bed1Vitals, bed2Vitals } = useVitals();
  const [selectedBed, setSelectedBed] = useState(1);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const currentScenario = scenarios[selectedBed] || 'NORMAL';
  const currentBedVitals = selectedBed === 1 ? bed1Vitals : bed2Vitals;
  const isHardwareStreaming = currentBedVitals?.source === 'HARDWARE' || currentBedVitals?.isRealHardware === true;

  const scenarioOptions = [
    { id: 'NORMAL', label: 'Simulate Normal' },
    { id: 'MONITOR', label: 'Simulate Monitor' },
    { id: 'ATTENTION', label: 'Simulate Attention' },
    { id: 'EMERGENCY', label: 'Simulate Emergency' }
  ];

  if (isCollapsed) {
    return (
      <div className="fixed bottom-4 right-4 z-40">
        <button
          onClick={() => setIsCollapsed(false)}
          className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 text-white rounded-full shadow-xl hover:bg-slate-800 transition text-xs font-semibold border border-slate-700"
        >
          <Sliders className="w-3.5 h-3.5 text-sky-400" />
          IoT Node-RED / Telemetry Controls
        </button>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border-b border-slate-800 text-slate-200 px-4 py-2.5 text-xs font-medium">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Left Badge: Hardware vs Simulator distinction */}
        <div className="flex items-center gap-2.5">
          {isHardwareStreaming ? (
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 font-mono text-[11px] font-bold">
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              REAL HARDWARE STREAM ACTIVE (Bed {selectedBed} via Node-RED)
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-[11px] font-bold">
              <Cpu className="w-3.5 h-3.5" />
              DEMO SIMULATION ACTIVE (Bed {selectedBed})
            </span>
          )}
          <span className="text-slate-400 hidden lg:inline">
            Node-RED Ingest: <code className="text-sky-300 font-mono">POST /api/iot/vitals</code>
          </span>
        </div>

        {/* Center: Bed Selector & Scenario Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
            <button
              onClick={() => setSelectedBed(1)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${selectedBed === 1 ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
            >
              Bed 1
            </button>
            <button
              onClick={() => setSelectedBed(2)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${selectedBed === 2 ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
            >
              Bed 2
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            {scenarioOptions.map((opt) => {
              const isActive = currentScenario === opt.id && !isHardwareStreaming;
              return (
                <button
                  key={opt.id}
                  onClick={() => changeScenario(selectedBed, opt.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${isActive
                    ? opt.id === 'EMERGENCY'
                      ? 'bg-red-600 border-red-500 text-white shadow-sm shadow-red-500/40'
                      : opt.id === 'ATTENTION'
                        ? 'bg-amber-600 border-amber-500 text-white'
                        : opt.id === 'MONITOR'
                          ? 'bg-sky-600 border-sky-500 text-white'
                          : 'bg-emerald-600 border-emerald-500 text-white'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
                    }`}
                  title={isHardwareStreaming ? 'Clicking will switch Bed to simulated test mode' : ''}
                >
                  {opt.label.replace('Simulate ', '')}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Collapse toggle */}
        <button
          onClick={() => setIsCollapsed(true)}
          className="text-slate-400 hover:text-slate-200 transition text-[11px]"
        >
          Minimize
        </button>
      </div>
    </div>
  );
};
