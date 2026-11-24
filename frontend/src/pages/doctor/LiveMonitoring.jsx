import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Activity,
  Thermometer,
  Radio,
  Gauge,
  Play,
  Square,
  Clock,
  User,
  Sliders,
  CheckCircle,
  AlertTriangle,
  ShieldAlert,
  Settings,
  RefreshCw,
  ExternalLink,
  Info,
  Check,
  ChevronRight,
  Wifi,
  WifiOff
} from 'lucide-react';
import { useVitals } from '../../context/VitalsContext';
import {
  TemperatureSensorCard,
  UltrasonicSensorCard,
  ForceSensorCard
} from '../../components/common/HardwareSensorCards';
import { HardwareTelemetryChart } from '../../components/charts/HardwareTelemetryChart';
import { Modal } from '../../components/common/Modal';
import api from '../../services/api';

export const LiveMonitoring = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialBed = parseInt(searchParams.get('bed') || '1', 10);

  const [activeBed, setActiveBed] = useState(initialBed);
  const [activeSessions, setActiveSessions] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modals
  const [isStartModalOpen, setIsStartModalOpen] = useState(false);
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [complaint, setComplaint] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [isEndModalOpen, setIsEndModalOpen] = useState(false);
  const [endSummary, setEndSummary] = useState('');

  // Configurable Sensor Alert Thresholds Modal
  const [isThresholdModalOpen, setIsThresholdModalOpen] = useState(false);
  const [thresholds, setThresholds] = useState(() => {
    try {
      const saved = localStorage.getItem('doctor_sensor_thresholds');
      return saved
        ? JSON.parse(saved)
        : {
            tempMax: 38.0,
            tempMin: 35.5,
            distanceMax: 90,
            distanceMin: 10,
            forceMin: 5
          };
    } catch (e) {
      return {
        tempMax: 38.0,
        tempMin: 35.5,
        distanceMax: 90,
        distanceMin: 10,
        forceMin: 5
      };
    }
  });

  const [tempThresholds, setTempThresholds] = useState(thresholds);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const { bed1Vitals, bed2Vitals, bed1History, bed2History } = useVitals();

  const fetchActiveSessions = async () => {
    try {
      const res = await api.get('/sessions/active');
      setActiveSessions(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchActiveSessions();
    const interval = setInterval(fetchActiveSessions, 5000);
    return () => clearInterval(interval);
  }, []);

  const currentVitals = activeBed === 1 ? bed1Vitals : bed2Vitals;
  const currentHistory = activeBed === 1 ? bed1History : bed2History;
  const currentSession = activeSessions.find((s) => s.bedNumber === activeBed);

  // Stale packet detection (> 15 seconds)
  const lastPacketTime = currentVitals?.timestamp ? new Date(currentVitals.timestamp) : null;
  const secondsSincePacket = lastPacketTime
    ? Math.max(0, Math.floor((Date.now() - lastPacketTime.getTime()) / 1000))
    : null;
  const isStale = secondsSincePacket !== null && secondsSincePacket > 15;

  const isRealHardware = currentVitals?.isRealHardware === true || currentVitals?.source === 'HARDWARE';
  const isNodeRedOnline = isRealHardware && !isStale;

  const openStart = async () => {
    setErrorMsg('');
    try {
      const res = await api.get('/doctors/patients');
      setStudents(res.data || []);
      if (res.data?.length > 0) {
        setSelectedStudentId(res.data[0].id);
      }
      setIsStartModalOpen(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleStart = async (e) => {
    e.preventDefault();
    if (!selectedStudentId) return;
    try {
      await api.post('/sessions/start', {
        studentId: selectedStudentId,
        bedNumber: activeBed,
        chiefComplaint: complaint || 'Continuous hardware sensor telemetry'
      });
      setIsStartModalOpen(false);
      setComplaint('');
      fetchActiveSessions();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to start session');
    }
  };

  const handleEnd = async (e) => {
    e.preventDefault();
    if (!currentSession) return;
    try {
      await api.put(`/sessions/${currentSession.id}/end`, {
        summary: endSummary || 'Session concluded. Normal stability.'
      });
      setIsEndModalOpen(false);
      fetchActiveSessions();
    } catch (err) {
      alert('Failed to end session');
    }
  };

  const handleSaveThresholds = (e) => {
    e.preventDefault();
    setThresholds(tempThresholds);
    try {
      localStorage.setItem('doctor_sensor_thresholds', JSON.stringify(tempThresholds));
    } catch (e) {}
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setIsThresholdModalOpen(false);
    }, 1000);
  };

  const handleResetThresholds = () => {
    const defaults = {
      tempMax: 38.0,
      tempMin: 35.5,
      distanceMax: 90,
      distanceMin: 10,
      forceMin: 5
    };
    setTempThresholds(defaults);
    setThresholds(defaults);
    localStorage.removeItem('doctor_sensor_thresholds');
  };

  return (
    <div className="space-y-6">
      {/* =========================================================================
          SECTION A: TOP STATUS & LIVE CONTROL BAR
         ========================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Activity className="w-6 h-6 text-sky-600 animate-pulse" />
            Doctor Live Hardware Telemetry Monitor
          </h2>
          <p className="text-sm text-slate-500">
            Real-time multi-channel feed from Node-RED • Temperature, Ultrasonic Proximity, and Force sensors
          </p>
        </div>

        {/* Action Controls & Bed Switcher */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              setTempThresholds(thresholds);
              setIsThresholdModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition border border-slate-200/80"
          >
            <Settings className="w-3.5 h-3.5 text-slate-500" />
            Alert Thresholds
          </button>

          <button
            onClick={() => navigate('/admin/nodered')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-sky-300 font-bold rounded-xl text-xs transition shadow-sm"
          >
            <Radio className="w-3.5 h-3.5 text-red-400 animate-pulse" />
            Node-RED Console
          </button>

          {/* Bed Switcher Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
            <button
              onClick={() => setActiveBed(1)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                activeBed === 1
                  ? 'bg-white text-sky-700 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${bed1Vitals?.isEmergency ? 'bg-red-500 animate-ping' : 'bg-emerald-500'}`} />
              Bed 1 Unit
            </button>
            <button
              onClick={() => setActiveBed(2)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                activeBed === 2
                  ? 'bg-white text-sky-700 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${bed2Vitals?.isEmergency ? 'bg-red-500 animate-ping' : 'bg-emerald-500'}`} />
              Bed 2 Unit
            </button>
          </div>
        </div>
      </div>

      {/* Connection & Telemetry Status Strip */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 rounded-2xl p-4 text-white border border-slate-800 shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
          {/* Node-RED Status Indicator */}
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isNodeRedOnline ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
            <span className="text-slate-300 font-sans font-semibold">Node-RED Stream:</span>
            <span className={`font-bold px-2 py-0.5 rounded-md text-[11px] ${
              isNodeRedOnline
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
            }`}>
              {isNodeRedOnline ? 'ONLINE (ACTIVE)' : 'STANDBY / SIM'}
            </span>
          </div>

          {/* Hardware vs Demo Badge */}
          <div className="flex items-center gap-2">
            <span className="text-slate-300 font-sans font-semibold">Data Source:</span>
            <span className={`font-bold px-2 py-0.5 rounded-md text-[11px] ${
              isRealHardware
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
            }`}>
              {isRealHardware ? 'REAL HARDWARE (Node-RED)' : 'DEMO SIMULATION'}
            </span>
          </div>

          {/* Device ID */}
          <div className="hidden md:flex items-center gap-2 text-slate-400">
            <span>Device:</span>
            <span className="text-sky-300 font-bold">{currentVitals?.deviceId || `RPI_BED_${activeBed}`}</span>
          </div>
        </div>

        {/* Packet Timestamp & Health Indicator */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-slate-300">
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            <span>
              Last Packet: <strong className="text-white">{lastPacketTime ? lastPacketTime.toLocaleTimeString() : '--:--:--'}</strong>
              {secondsSincePacket !== null && (
                <span className={`ml-1.5 text-[11px] ${isStale ? 'text-amber-400 font-bold' : 'text-slate-400'}`}>
                  ({secondsSincePacket}s ago)
                </span>
              )}
            </span>
          </div>

          {isStale && (
            <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold text-[10px]">
              DATA STALE
            </span>
          )}
        </div>
      </div>

      {/* =========================================================================
          SECTION B: PATIENT & ACTIVE SESSION STRIP
         ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center font-bold text-sm border border-sky-200">
            B{activeBed}
          </div>
          <div>
            {currentSession ? (
              <div>
                <h4 className="font-bold text-slate-900 text-sm">
                  {currentSession.student?.user?.firstName} {currentSession.student?.user?.lastName}
                  <span className="font-mono text-xs text-slate-500 ml-2 font-normal">
                    ({currentSession.student?.rollNumber})
                  </span>
                </h4>
                <p className="text-xs text-slate-500">
                  Complaint: <strong className="text-slate-700">{currentSession.chiefComplaint}</strong> &bull; Admitted {new Date(currentSession.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            ) : (
              <div>
                <h4 className="font-bold text-emerald-700 text-sm">Bed {activeBed} Available</h4>
                <p className="text-xs text-slate-500">Telemetry streaming continuously from hardware box.</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {currentSession ? (
            <button
              onClick={() => {
                setEndSummary('Vitals and telemetry stabilized within thresholds.');
                setIsEndModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 font-semibold rounded-xl text-xs border border-red-200 transition"
            >
              <Square className="w-3.5 h-3.5" /> End Session
            </button>
          ) : (
            <button
              onClick={openStart}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl text-xs shadow-md shadow-sky-600/20 transition"
            >
              <Play className="w-3.5 h-3.5" /> Start Patient Session
            </button>
          )}
        </div>
      </div>

      {/* =========================================================================
          SECTION C: 3 DEDICATED SENSOR CARDS
         ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 1. Temperature Sensor Card */}
        <TemperatureSensorCard
          temperature={currentVitals?.temperature}
          history={currentHistory}
          lastUpdated={lastPacketTime ? lastPacketTime.toLocaleTimeString() : null}
          thresholds={{ max: thresholds.tempMax, min: thresholds.tempMin }}
          isStale={isStale}
        />

        {/* 2. Ultrasonic Distance Card */}
        <UltrasonicSensorCard
          distance={currentVitals?.ultrasonicDistance}
          history={currentHistory}
          lastUpdated={lastPacketTime ? lastPacketTime.toLocaleTimeString() : null}
          thresholds={{ maxDistance: thresholds.distanceMax, minDistance: thresholds.distanceMin }}
          isStale={isStale}
        />

        {/* 3. Force / Pressure Sensor Card */}
        <ForceSensorCard
          force={currentVitals?.force}
          history={currentHistory}
          lastUpdated={lastPacketTime ? lastPacketTime.toLocaleTimeString() : null}
          thresholds={{ minForce: thresholds.forceMin }}
          isStale={isStale}
        />
      </div>

      {/* =========================================================================
          SECTION D: DYNAMIC MULTI-CHANNEL TELEMETRY CHART
         ========================================================================= */}
      <HardwareTelemetryChart
        data={currentHistory}
        title={`Bed ${activeBed} Hardware Telemetry Stream`}
        thresholds={thresholds}
      />

      {/* =========================================================================
          SECTION E: ALERTS, STATUS & SYSTEM DIAGNOSTICS
         ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current Risk / Status Summary Banner */}
        <div className="lg:col-span-1 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Clinic Triage Status
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${
                currentVitals?.riskLevel === 'EMERGENCY'
                  ? 'bg-red-50 text-red-700 border-red-200 animate-pulse'
                  : currentVitals?.riskLevel === 'ATTENTION'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}>
                {currentVitals?.riskLevel || 'NORMAL'}
              </span>
            </div>

            <h3 className="font-extrabold text-slate-900 text-lg">
              {currentVitals?.riskLevel === 'EMERGENCY'
                ? 'Critical Threshold Alert'
                : currentVitals?.riskLevel === 'ATTENTION'
                ? 'Attention / Threshold Warning'
                : 'All Sensors Stable'}
            </h3>

            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              {currentVitals?.riskExplanation ||
                'All hardware sensor channels (Temperature, Ultrasonic Proximity, Force) are operating within designated clinical parameters.'}
            </p>
          </div>

          {/* Quick Diagnostics Strip */}
          <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
            <div className="flex justify-between text-slate-500">
              <span>Bed Unit:</span>
              <span className="font-mono font-bold text-slate-800">Medical Room Bed {activeBed}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Ingestion Protocol:</span>
              <span className="font-mono text-slate-800">HTTP POST /api/iot/vitals</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Transport:</span>
              <span className="font-mono text-slate-800">WebSocket (Socket.IO)</span>
            </div>
          </div>
        </div>

        {/* Live Alert Triggers Log */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-sky-600" />
              Active Hardware Triggers & Telemetry Log
            </h4>
            <span className="text-[11px] text-slate-400 font-mono">Real-time event feed</span>
          </div>

          <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
            {currentVitals?.triggers && currentVitals.triggers.length > 0 ? (
              currentVitals.triggers.map((trigger, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 p-3 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900"
                >
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-bold font-sans">{trigger}</p>
                    <p className="text-[10px] text-amber-700/80 font-mono mt-0.5">
                      Triggered at {lastPacketTime ? lastPacketTime.toLocaleTimeString() : 'Recent'} &bull; Bed {activeBed}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex items-center gap-2 p-3 rounded-2xl bg-emerald-50/60 border border-emerald-200 text-xs text-emerald-800">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>No threshold breaches detected. Continuous telemetry is operating nominally.</span>
              </div>
            )}
          </div>

          {/* Technical IoT Disclaimer Banner */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-2.5 text-[11px] text-slate-500">
            <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <p>
              <strong>Technical Telemetry Notice:</strong> Sensor thresholds provide automated clinical engineering alerts based on configured hardware parameters. They do not constitute autonomous medical diagnoses. Attending campus physicians should independently inspect the patient.
            </p>
          </div>
        </div>
      </div>

      {/* =========================================================================
          MODAL: CONFIGURE SENSOR THRESHOLDS
         ========================================================================= */}
      <Modal
        isOpen={isThresholdModalOpen}
        onClose={() => setIsThresholdModalOpen(false)}
        title="Configure Hardware Alert Thresholds"
      >
        <form onSubmit={handleSaveThresholds} className="space-y-4">
          <p className="text-xs text-slate-600">
            Customize the threshold boundaries for Bed {activeBed} telemetry. When incoming readings cross these values, the relevant sensor card will highlight and emit clinical alerts.
          </p>

          {/* Temperature thresholds */}
          <div className="space-y-2 p-3 bg-slate-50 rounded-2xl border border-slate-200">
            <h5 className="font-bold text-slate-800 text-xs flex items-center gap-2">
              <Thermometer className="w-3.5 h-3.5 text-amber-600" />
              Temperature Thresholds (°C)
            </h5>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] text-slate-500 font-semibold mb-1">Max Temp Alert (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  value={tempThresholds.tempMax}
                  onChange={(e) => setTempThresholds({ ...tempThresholds, tempMax: parseFloat(e.target.value) })}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 font-semibold mb-1">Min Temp Alert (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  value={tempThresholds.tempMin}
                  onChange={(e) => setTempThresholds({ ...tempThresholds, tempMin: parseFloat(e.target.value) })}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>
          </div>

          {/* Ultrasonic distance thresholds */}
          <div className="space-y-2 p-3 bg-slate-50 rounded-2xl border border-slate-200">
            <h5 className="font-bold text-slate-800 text-xs flex items-center gap-2">
              <Radio className="w-3.5 h-3.5 text-teal-600" />
              Ultrasonic Proximity Thresholds (cm)
            </h5>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] text-slate-500 font-semibold mb-1">Out-of-Bed Max Distance (cm)</label>
                <input
                  type="number"
                  step="1"
                  value={tempThresholds.distanceMax}
                  onChange={(e) => setTempThresholds({ ...tempThresholds, distanceMax: parseFloat(e.target.value) })}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 font-semibold mb-1">Obstruction Min Distance (cm)</label>
                <input
                  type="number"
                  step="1"
                  value={tempThresholds.distanceMin}
                  onChange={(e) => setTempThresholds({ ...tempThresholds, distanceMin: parseFloat(e.target.value) })}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>
          </div>

          {/* Force threshold */}
          <div className="space-y-2 p-3 bg-slate-50 rounded-2xl border border-slate-200">
            <h5 className="font-bold text-slate-800 text-xs flex items-center gap-2">
              <Gauge className="w-3.5 h-3.5 text-indigo-600" />
              Force Sensor Threshold (N)
            </h5>
            <div className="text-xs">
              <label className="block text-[11px] text-slate-500 font-semibold mb-1">Bed Vacant Trigger Limit (&lt; N)</label>
              <input
                type="number"
                step="1"
                value={tempThresholds.forceMin}
                onChange={(e) => setTempThresholds({ ...tempThresholds, forceMin: parseFloat(e.target.value) })}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          {saveSuccess && (
            <div className="p-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              Thresholds successfully saved!
            </div>
          )}

          <div className="flex justify-between items-center pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleResetThresholds}
              className="px-3 py-2 text-slate-500 hover:text-slate-800 text-xs font-semibold"
            >
              Reset to Defaults
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsThresholdModalOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl text-xs shadow-md"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* =========================================================================
          MODAL: START PATIENT MONITORING SESSION
         ========================================================================= */}
      <Modal
        isOpen={isStartModalOpen}
        onClose={() => setIsStartModalOpen(false)}
        title={`Start Monitoring Session on Bed ${activeBed}`}
      >
        <form onSubmit={handleStart} className="space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Select Student / Patient *
            </label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-sky-500"
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.user.firstName} {s.user.lastName} ({s.rollNumber}) &bull; {s.branch}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Chief Complaint / Clinical Notes
            </label>
            <textarea
              rows={3}
              value={complaint}
              onChange={(e) => setComplaint(e.target.value)}
              placeholder="e.g. Mild pyrexia, bed rest observation after athletic event..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsStartModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl text-xs shadow-md shadow-sky-600/20"
            >
              Start Session
            </button>
          </div>
        </form>
      </Modal>

      {/* =========================================================================
          MODAL: END SESSION
         ========================================================================= */}
      <Modal
        isOpen={isEndModalOpen}
        onClose={() => setIsEndModalOpen(false)}
        title={`End Session — Bed ${activeBed}`}
      >
        <form onSubmit={handleEnd} className="space-y-4">
          <p className="text-xs text-slate-600">
            Provide a closing medical summary for this patient’s visit history.
          </p>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Final Summary
            </label>
            <textarea
              rows={3}
              value={endSummary}
              onChange={(e) => setEndSummary(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsEndModalOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl text-xs shadow-md"
            >
              End Session & Save
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
