import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Cpu,
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Activity,
  Server,
  Radio,
  Send,
  Copy,
  Check,
  Terminal,
  FileCode,
  ExternalLink
} from 'lucide-react';
import api from '../../services/api';
import { StatusBadge } from '../../components/common/Badge';

export const DeviceManagement = () => {
  const navigate = useNavigate();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pingStatus, setPingStatus] = useState({});
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [testLoading, setTestLoading] = useState(false);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const res = await api.get('/devices');
      setDevices(res.data);
    } catch (err) {
      console.error('Fetch devices error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
    const interval = setInterval(fetchDevices, 10000);
    return () => clearInterval(interval);
  }, []);

  const handlePing = async (dev) => {
    setPingStatus((prev) => ({ ...prev, [dev.id]: 'PINGING' }));
    try {
      await api.post('/edge/heartbeat', {
        deviceId: dev.deviceId,
        bedNumber: dev.bedNumber,
        status: 'ONLINE'
      });
      setPingStatus((prev) => ({ ...prev, [dev.id]: 'SUCCESS' }));
      setTimeout(() => {
        setPingStatus((prev) => ({ ...prev, [dev.id]: null }));
        fetchDevices();
      }, 1500);
    } catch (err) {
      setPingStatus((prev) => ({ ...prev, [dev.id]: 'FAILED' }));
    }
  };

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'key') {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } else {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  const sendTestHardwarePacket = async () => {
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await api.post('/iot/vitals', {
        bedNumber: 1,
        deviceId: 'RPI_NODE_RED_TEST_PANEL',
        heartRate: Math.round(75 + (Math.random() - 0.5) * 6),
        spo2: Number((98.5 + (Math.random() - 0.5) * 0.5).toFixed(1)),
        temperature: Number((36.8 + (Math.random() - 0.5) * 0.2).toFixed(1)),
        timestamp: Date.now()
      }, {
        headers: {
          'x-api-key': 'lnmiit_nodered_secure_key_2026'
        }
      });
      setTestResult({ success: true, data: res.data });
      fetchDevices();
    } catch (err) {
      setTestResult({
        success: false,
        error: err.response?.data?.message || err.message
      });
    } finally {
      setTestLoading(false);
    }
  };

  const endpointUrl = `${window.location.protocol}//${window.location.hostname}:5000/api/iot/vitals`;
  const apiKey = 'lnmiit_nodered_secure_key_2026';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            IoT Edge Devices & Hardware Infrastructure
          </h2>
          <p className="text-sm text-slate-500">
            Real-time status of ESP32 sensor microcontrollers, Raspberry Pi Node-RED edge gateway, and telemetry streams
          </p>
        </div>
        <button
          onClick={fetchDevices}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Nodes
        </button>
      </div>

      {/* Node-RED & Raspberry Pi Stream Gateway Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 rounded-3xl p-6 text-white border border-slate-700 shadow-xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                Raspberry Pi & Node-RED Telemetry Gateway
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  HTTP INGEST ACTIVE
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Live sensor streams from MAX30102 and LM35 bypass the simulator automatically when incoming hardware packets arrive
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/admin/nodered')}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 font-bold rounded-xl text-xs transition shadow-sm"
            >
              <Radio className="w-3.5 h-3.5 text-red-400" />
              Node-RED Live Console
            </button>
            <button
              onClick={sendTestHardwarePacket}
              disabled={testLoading}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-lg shadow-emerald-600/30 transition"
            >
              <Send className="w-3.5 h-3.5" />
              {testLoading ? 'Emitting Packet...' : 'Emit Test Hardware Packet'}
            </button>
          </div>
        </div>

        {/* Credentials & Endpoint Quick Copy */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 space-y-1.5">
            <span className="text-slate-400 text-[11px] block font-sans font-semibold uppercase tracking-wider">
              Node-RED HTTP Ingest URL (POST)
            </span>
            <div className="flex items-center justify-between gap-2 bg-slate-900 px-3 py-2 rounded-xl border border-slate-800 text-sky-300 text-xs truncate">
              <span className="truncate">{endpointUrl}</span>
              <button
                onClick={() => copyToClipboard(endpointUrl, 'url')}
                className="text-slate-400 hover:text-white shrink-0"
                title="Copy URL"
              >
                {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 space-y-1.5">
            <span className="text-slate-400 text-[11px] block font-sans font-semibold uppercase tracking-wider">
              Header Authentication (x-api-key)
            </span>
            <div className="flex items-center justify-between gap-2 bg-slate-900 px-3 py-2 rounded-xl border border-slate-800 text-amber-300 text-xs truncate">
              <span className="truncate">{apiKey}</span>
              <button
                onClick={() => copyToClipboard(apiKey, 'key')}
                className="text-slate-400 hover:text-white shrink-0"
                title="Copy API Key"
              >
                {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Live Packet Test Output Banner */}
        {testResult && (
          <div className={`p-3.5 rounded-2xl border text-xs font-mono flex items-start gap-2.5 ${
            testResult.success
              ? 'bg-emerald-950/40 text-emerald-200 border-emerald-500/30'
              : 'bg-red-950/40 text-red-200 border-red-500/30'
          }`}>
            {testResult.success ? (
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-bold font-sans">
                {testResult.success ? 'Hardware Packet Accepted & Broadcasted via Socket.IO' : 'Packet Transmission Error'}
              </p>
              <pre className="text-[11px] mt-1 text-slate-300 overflow-x-auto whitespace-pre-wrap">
                {testResult.success ? JSON.stringify(testResult.data, null, 2) : testResult.error}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Hardware Distinction Banner */}
      <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 flex items-start gap-3 text-sky-900">
        <Radio className="w-5 h-5 text-sky-600 mt-0.5 shrink-0" />
        <div className="text-xs space-y-1">
          <p className="font-bold text-sky-950">
            Hardware Sensor Interface & Simulator Transparency Note:
          </p>
          <p className="text-sky-800">
            The LNMIIT Smart Healthcare backend receives sensor telemetry from Raspberry Pi (via Node-RED) and ESP32 nodes formatted for MAX30102 (Heart Rate & SpO₂) and LM35 (Body Temperature). Whenever a real hardware packet is received, the system badging dynamically flips to <strong className="text-emerald-700">REAL HARDWARE (Node-RED)</strong> and pauses synthetic values for that bed.
          </p>
        </div>
      </div>

      {/* Device Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {devices.map((dev) => {
          const isPinging = pingStatus[dev.id] === 'PINGING';
          const pingSuccess = pingStatus[dev.id] === 'SUCCESS';

          return (
            <div
              key={dev.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg border ${
                    dev.type === 'AI_SERVICE' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                    dev.type === 'EDGE_GATEWAY' ? 'bg-brand-50 text-brand-700 border-brand-200' :
                    'bg-sky-50 text-sky-700 border-sky-200'
                  }`}>
                    {dev.type === 'AI_SERVICE' ? <Server className="w-6 h-6" /> : <Cpu className="w-6 h-6" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{dev.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-xs text-slate-500 font-semibold">{dev.deviceId}</span>
                      {dev.bedNumber && (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-bold">
                          Bed {dev.bedNumber}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <StatusBadge status={dev.status} />
              </div>

              {/* Hardware / Simulator Badge */}
              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                <span className="text-slate-500 font-medium">Operating Mode:</span>
                <span className={`px-2.5 py-0.5 rounded-full font-mono font-bold text-[10px] border ${
                  dev.isRealHardware ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  {dev.isRealHardware ? 'REAL HARDWARE (Node-RED)' : 'DEMO SIMULATION'}
                </span>
              </div>

              {/* Network Details */}
              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200/60 font-mono">
                <div>
                  <span className="text-slate-400 block text-[10px]">IP Address</span>
                  <span className="font-semibold text-slate-700">{dev.ipAddress || '192.168.1.101'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">MAC Address</span>
                  <span className="font-semibold text-slate-700 truncate block">{dev.macAddress || '24:6F:28:B4:E1:01'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Firmware / Protocol</span>
                  <span className="text-slate-700">{dev.firmwareVersion || 'v1.2.4-lnmiit'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Last Heartbeat</span>
                  <span className="text-slate-700">
                    {new Date(dev.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
              </div>

              {/* Action: Send Ping Heartbeat */}
              <div className="flex items-center justify-between pt-2">
                <div className="text-[11px] text-slate-400">
                  {pingSuccess ? (
                    <span className="text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> Heartbeat Acknowledged
                    </span>
                  ) : (
                    'Periodic 10s ping active'
                  )}
                </div>
                <button
                  onClick={() => handlePing(dev)}
                  disabled={isPinging}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition disabled:opacity-50"
                >
                  {isPinging ? 'Pinging...' : 'Send Heartbeat Ping'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
