import React, { useState } from 'react';
import {
  Radio,
  Gauge,
  ExternalLink,
  RefreshCw,
  Maximize2,
  Minimize2,
  Sliders,
  AlertCircle,
  CheckCircle,
  Layers,
  Terminal,
  Activity,
  ArrowRight
} from 'lucide-react';

export const NodeRedDashboard = () => {
  const [dashboardUrl, setDashboardUrl] = useState('http://172.20.10.2:1880/dashboard/page1');
  const [activeUrl, setActiveUrl] = useState('http://172.20.10.2:1880/dashboard/page1');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeKey, setIframeKey] = useState(1);
  const [viewMode, setViewMode] = useState('dashboard2'); // 'dashboard2', 'dashboard', 'editor'

  const handleApplyUrl = (e) => {
    e?.preventDefault();
    let url = dashboardUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'http://' + url;
    }
    setActiveUrl(url);
    setIframeKey((prev) => prev + 1);
  };

  const setPreset = (type) => {
    let newUrl = '';
    if (type === 'laptop2') {
      newUrl = 'http://172.20.10.2:1880/dashboard/page1';
      setViewMode('dashboard2');
    } else if (type === 'ui') {
      const base = dashboardUrl.replace(/\/dashboard\/.*$/, '').replace(/\/ui\/?$/, '').replace(/\/$/, '');
      newUrl = `${base || 'http://172.20.10.2:1880'}/ui`;
      setViewMode('dashboard');
    } else {
      const base = dashboardUrl.replace(/\/dashboard\/.*$/, '').replace(/\/ui\/?$/, '').replace(/\/$/, '');
      newUrl = `${base || 'http://172.20.10.2:1880'}/`;
      setViewMode('editor');
    }
    setDashboardUrl(newUrl);
    setActiveUrl(newUrl);
    setIframeKey((prev) => prev + 1);
  };

  const handleRefresh = () => {
    setIframeKey((prev) => prev + 1);
  };

  return (
    <div className={`space-y-6 ${isFullscreen ? 'fixed inset-0 z-50 bg-slate-900 p-4 space-y-3' : ''}`}>
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className={`font-extrabold tracking-tight flex items-center gap-2.5 ${isFullscreen ? 'text-xl text-white' : 'text-2xl text-slate-900'}`}>
            <Radio className="w-6 h-6 text-red-500 animate-pulse" />
            Node-RED Live Console & Embedded Dashboard
          </h2>
          <p className={`text-xs ${isFullscreen ? 'text-slate-400' : 'text-slate-500'}`}>
            Direct interactive view of Node-RED Dashboard (<code className="font-mono text-red-500">/ui</code>) and Flow Editor running on Raspberry Pi or localhost
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.open(activeUrl, '_blank')}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition"
            title="Open in new browser tab"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Open in Tab</span>
          </button>
          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition"
            title="Reload iFrame"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reload</span>
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl text-xs transition shadow-md shadow-sky-600/20"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          </button>
        </div>
      </div>

      {/* Control Strip & URL Config */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
        <form onSubmit={handleApplyUrl} className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[260px] relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
              URL:
            </span>
            <input
              type="text"
              value={dashboardUrl}
              onChange={(e) => setDashboardUrl(e.target.value)}
              placeholder="e.g. http://localhost:1880/ui or http://192.168.1.100:1880/ui"
              className="w-full pl-12 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium focus:ring-2 focus:ring-sky-500 focus:bg-white transition"
            />
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition shadow-sm"
          >
            Connect Stream
          </button>

          {/* Quick Presets */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setPreset('laptop2')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                viewMode === 'dashboard2'
                  ? 'bg-white text-emerald-600 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Laptop 2 (:1880/dashboard/page1)
            </button>
            <button
              type="button"
              onClick={() => setPreset('ui')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                viewMode === 'dashboard'
                  ? 'bg-white text-red-600 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Dashboard (/ui)
            </button>
            <button
              type="button"
              onClick={() => setPreset('editor')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                viewMode === 'editor'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Flow Editor (/)
            </button>
          </div>
        </form>

        {/* Live URL helper status */}
        <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 gap-2 pt-1 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Target Node-RED Host: <strong className="font-mono text-slate-700">{activeUrl}</strong></span>
          </div>
          <span className="text-slate-400">
            For Raspberry Pi over Wi-Fi, change <code className="font-mono text-slate-600">localhost</code> to your Pi's LAN IP (e.g. <code className="font-mono text-slate-600">192.168.1.X</code>)
          </span>
        </div>
      </div>

      {/* Embedded iFrame Frame */}
      <div className={`relative bg-slate-950 rounded-2xl border border-slate-300 shadow-lg overflow-hidden flex flex-col ${
        isFullscreen ? 'h-[calc(100vh-140px)]' : 'h-[650px]'
      }`}>
        <iframe
          key={iframeKey}
          src={activeUrl}
          title="Node-RED Live Dashboard"
          className="w-full h-full border-0 bg-white"
          allow="geolocation; microphone; camera; midi"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
        />
      </div>

      {/* Troubleshooting & Guide Box (Shown when not fullscreen) */}
      {!isFullscreen && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 space-y-2 text-xs text-sky-900">
            <div className="flex items-center gap-2 font-bold text-sky-950 text-sm">
              <CheckCircle className="w-4 h-4 text-sky-600" />
              Two Ways Node-RED Displays on this Website:
            </div>
            <ul className="list-disc pl-4 space-y-1 text-sky-800">
              <li>
                <strong>1. Embedded Dashboard (This Page):</strong> Displays your raw Node-RED gauges, charts, and buttons via direct live iFrame integration.
              </li>
              <li>
                <strong>2. Native Healthcare UI (Automatic):</strong> When Node-RED sends data via <code className="font-mono text-sky-900">POST /api/iot/vitals</code>, our backend automatically broadcasts it to the <strong>Doctor Live Monitoring</strong> page with clinical waveforms, risk scoring, and triage badges.
              </li>
            </ul>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2 text-xs text-amber-900">
            <div className="flex items-center gap-2 font-bold text-amber-950 text-sm">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              If the frame displays "Refused to Connect" or Blank:
            </div>
            <ul className="list-disc pl-4 space-y-1 text-amber-800">
              <li>Ensure Node-RED is running (<code className="font-mono text-amber-950">node-red</code> in terminal).</li>
              <li>Make sure <code className="font-mono text-amber-950">node-red-dashboard</code> palette is installed on Node-RED.</li>
              <li>If testing Raspberry Pi from a PC browser, verify both devices are on the same Wi-Fi/LAN.</li>
              <li>You can also click <strong>"Open in Tab"</strong> above to launch directly.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

