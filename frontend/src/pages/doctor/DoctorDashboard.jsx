import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Activity,
  AlertTriangle,
  Clock,
  ShieldAlert,
  ArrowRight,
  CheckCircle,
  Search,
  PlusCircle,
  Stethoscope,
  Radio,
  Cpu,
  Wifi,
  WifiOff,
  ExternalLink,
  Zap,
  Check,
  Layers,
  Thermometer,
  Gauge
} from 'lucide-react';
import api from '../../services/api';
import { VitalGaugeCard } from '../../components/common/VitalGaugeCard';
import {
  TemperatureSensorCard,
  UltrasonicSensorCard,
  ForceSensorCard
} from '../../components/common/HardwareSensorCards';
import { ESP32DeviceView } from '../../components/common/ESP32DeviceView';
import { HardwareTelemetryChart } from '../../components/charts/HardwareTelemetryChart';
import { RiskBadge, StatusBadge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { useVitals } from '../../context/VitalsContext';
import { useAuth } from '../../context/AuthContext';
import { getSocket } from '../../services/socket';

export const DoctorDashboard = () => {
  const [data, setData] = useState(null);
  const [activeSessions, setActiveSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchPatient, setSearchPatient] = useState('');
  const [selectedDevice, setSelectedDevice] = useState('esp32_1'); // 'esp32_1' or 'esp32_2'
  const [secondsSincePacket, setSecondsSincePacket] = useState(null);

  // Start Session Modal
  const [isStartModalOpen, setIsStartModalOpen] = useState(false);
  const [targetBed, setTargetBed] = useState(1);
  const [availableStudents, setAvailableStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [startError, setStartError] = useState('');
  const [isForceSubmitting, setIsForceSubmitting] = useState(false);

  // End Session Modal
  const [isEndModalOpen, setIsEndModalOpen] = useState(false);
  const [endingSession, setEndingSession] = useState(null);
  const [sessionSummary, setSessionSummary] = useState('');

  const {
    socketConnected,
    esp32Data,
    esp32History,
    nodeRedStatus,
    bed1Vitals,
    bed2Vitals,
    bed1History,
    bed2History,
    acknowledgeAlert
  } = useVitals();

  const { user } = useAuth();
  const navigate = useNavigate();

  const fetchActiveSessions = async () => {
    try {
      const res = await api.get('/sessions/active');
      setActiveSessions(res.data || []);
    } catch (err) {
      console.error('Failed to load active sessions:', err);
    }
  };

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/doctors/dashboard');
      setData(res.data);
    } catch (err) {
      console.error('Failed to load doctor dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshAll = () => {
    fetchDashboard();
    fetchActiveSessions();
  };

  useEffect(() => {
    refreshAll();

    // Poll active sessions every 4 seconds to guarantee state synchronization
    const interval = setInterval(() => {
      fetchActiveSessions();
    }, 4000);

    // Immediate reactive updates via Socket.IO
    const socket = getSocket();
    const handleSessionChange = () => {
      fetchActiveSessions();
      fetchDashboard();
    };

    socket.on('SESSION_STARTED', handleSessionChange);
    socket.on('SESSION_ENDED', handleSessionChange);

    return () => {
      clearInterval(interval);
      socket.off('SESSION_STARTED', handleSessionChange);
      socket.off('SESSION_ENDED', handleSessionChange);
    };
  }, []);

  // Active ESP32 device data & history
  const activeEsp32 = selectedDevice === 'esp32_1' ? esp32Data?.esp32_1 : esp32Data?.esp32_2;
  const activeEsp32History = selectedDevice === 'esp32_1' ? (esp32History?.esp32_1 || []) : (esp32History?.esp32_2 || []);

  // Synchronized bed state (esp32_1 -> bed 1, esp32_2 -> bed 2)
  const activeBed = selectedDevice === 'esp32_1' ? 1 : 2;
  const currentVitals = activeBed === 1 ? bed1Vitals : bed2Vitals;
  const currentHistory = activeBed === 1 ? bed1History : bed2History;

  // Derive live active session from live polling + fallback to dashboard data
  const liveSessionBed1 = activeSessions.find((s) => s.bedNumber === 1 && s.status === 'ACTIVE') || data?.beds?.bed1?.session;
  const liveSessionBed2 = activeSessions.find((s) => s.bedNumber === 2 && s.status === 'ACTIVE') || data?.beds?.bed2?.session;
  const currentSession = activeBed === 1 ? liveSessionBed1 : liveSessionBed2;

  // Last packet timestamp
  const lastPacketTimestamp = esp32Data?.timestamp || nodeRedStatus?.lastPacketTime || currentVitals?.timestamp;

  // Stale packet detection (> 15 seconds)
  useEffect(() => {
    const updateTicker = () => {
      if (lastPacketTimestamp) {
        const diff = Math.max(0, Math.floor((Date.now() - new Date(lastPacketTimestamp).getTime()) / 1000));
        setSecondsSincePacket(diff);
      } else {
        setSecondsSincePacket(null);
      }
    };
    updateTicker();
    const timer = setInterval(updateTicker, 1000);
    return () => clearInterval(timer);
  }, [lastPacketTimestamp]);

  const isStale = secondsSincePacket !== null && secondsSincePacket > 15;
  const isNodeRedConnected = nodeRedStatus?.connected;
  const isLiveStream = !isStale && (esp32Data?.isLiveHardware || currentVitals?.isRealHardware);

  const openStartModal = async (bedNumber) => {
    setTargetBed(bedNumber);
    setStartError('');
    try {
      const res = await api.get('/doctors/patients');
      setAvailableStudents(res.data || []);
      if (res.data?.length > 0) {
        setSelectedStudentId(res.data[0].id);
      }
      setIsStartModalOpen(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartSession = async (e, force = false) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!selectedStudentId) {
      setStartError('Please select a student.');
      return;
    }
    if (force) setIsForceSubmitting(true);
    try {
      await api.post('/sessions/start', {
        studentId: selectedStudentId,
        bedNumber: targetBed,
        chiefComplaint: chiefComplaint || 'Routine campus clinic vitals assessment',
        forceEndExisting: force
      });
      setIsStartModalOpen(false);
      setChiefComplaint('');
      setStartError('');
      refreshAll();
    } catch (err) {
      setStartError(err.response?.data?.message || 'Failed to start session');
      refreshAll();
    } finally {
      setIsForceSubmitting(false);
    }
  };

  const openEndModal = (session) => {
    setEndingSession(session);
    setSessionSummary('Patient vitals stabilized. Discharged to hostel room with hydration advice.');
    setIsEndModalOpen(true);
  };

  const handleEndSession = async (e) => {
    e.preventDefault();
    if (!endingSession?.id) return;
    try {
      await api.put(`/sessions/${endingSession.id}/end`, {
        summary: sessionSummary
      });
      setIsEndModalOpen(false);
      refreshAll();
    } catch (err) {
      alert('Failed to end session');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-600" />
      </div>
    );
  }

  const { doctor, stats, beds, recentPatients, recentAlerts } = data || {};

  const filteredPatients = (recentPatients || []).filter((p) =>
    p.name.toLowerCase().includes(searchPatient.toLowerCase()) ||
    p.rollNumber.toLowerCase().includes(searchPatient.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Welcome & Specialization Header */}
      <div className="bg-gradient-to-r from-sky-600 via-brand-700 to-sky-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-sky-600/15 flex flex-wrap items-center justify-between gap-6">
        <div>
          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/20 border border-white/20 text-sky-100">
            Attending Campus Physician
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-2">
            Welcome back, {doctor?.name || `Dr. ${user?.lastName}`}
          </h2>
          <p className="text-sky-100 text-sm mt-1 flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-sky-300" />
            Specialization: <strong>{doctor?.specialization || 'General Medicine'}</strong> &bull; {doctor?.department || 'LNMIIT Medical Centre'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/doctor/monitoring')}
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-sky-700 font-bold rounded-xl shadow-md hover:bg-sky-50 transition text-xs sm:text-sm"
          >
            <Activity className="w-4 h-4" /> Open Live Monitor
          </button>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Patients</span>
          <div className="text-2xl font-extrabold text-slate-800 mt-1">{stats?.totalPatients ?? 0}</div>
          <span className="text-[11px] text-sky-600 font-medium">Campus records</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Today's Visits</span>
          <div className="text-2xl font-extrabold text-slate-800 mt-1">{stats?.todayVisits ?? 0}</div>
          <span className="text-[11px] text-emerald-600 font-medium">Clinic consults</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active Monitoring</span>
          <div className="text-2xl font-extrabold text-sky-600 mt-1">{stats?.activeSessions ?? 0}</div>
          <span className="text-[11px] text-slate-500 font-medium">Beds occupied</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Attention Alerts</span>
          <div className="text-2xl font-extrabold text-amber-600 mt-1">{stats?.attentionAlerts ?? 0}</div>
          <span className="text-[11px] text-slate-500 font-medium">Mild deviations</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm col-span-2 sm:col-span-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Emergency Alerts</span>
          <div className="text-2xl font-extrabold text-red-600 mt-1">{stats?.emergencyAlerts ?? 0}</div>
          <span className="text-[11px] text-red-600 font-medium">Critical triage</span>
        </div>
      </div>

      {/* Native Hardware Live Monitoring Section (Direct Node-RED WebSocket: ws://172.20.10.2:1880/ws/sensors) */}
      <div className="space-y-4">
        {/* Real-Time Telemetry & Connection Status Bar */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Title & Hardware Indicators */}
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="p-2 rounded-xl bg-sky-100 text-sky-700">
                  <Activity className="w-5 h-5 animate-pulse" />
                </span>
                <h3 className="text-lg font-extrabold text-slate-800">
                  ESP32 Live Sensor Telemetry
                </h3>

                {/* Data Stream Mode: LIVE vs STALE */}
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold border transition ${
                    isLiveStream
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-sm'
                      : 'bg-amber-50 text-amber-800 border-amber-300'
                  }`}
                >
                  {isLiveStream ? (
                    <>
                      <Zap className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                      LIVE DATA STREAM
                    </>
                  ) : (
                    <>
                      <Cpu className="w-3.5 h-3.5 text-amber-600" />
                      STALE / AWAITING PACKET
                    </>
                  )}
                </span>
              </div>

              {/* Status Row */}
              <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
                {/* 1. Node-RED WebSocket Status */}
                <span className="flex items-center gap-1.5 font-medium">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      isNodeRedConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
                    }`}
                  />
                  <span className="text-slate-600">Node-RED WebSocket:</span>
                  <strong className={isNodeRedConnected ? 'text-emerald-700' : 'text-red-600'}>
                    {isNodeRedConnected ? 'Connected' : 'Disconnected'}
                  </strong>
                </span>

                <span className="text-slate-300">&bull;</span>

                {/* 2. Socket.IO Status */}
                <span className="flex items-center gap-1.5 font-medium">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      socketConnected ? 'bg-emerald-500' : 'bg-red-500'
                    }`}
                  />
                  <span className="text-slate-600">Socket.IO:</span>
                  <strong className={socketConnected ? 'text-emerald-700' : 'text-red-600'}>
                    {socketConnected ? 'Connected' : 'Disconnected'}
                  </strong>
                </span>

                <span className="text-slate-300">&bull;</span>

                {/* 3. Last Packet Timestamp */}
                <span className="flex items-center gap-1 text-slate-500 font-mono">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Last Packet: {secondsSincePacket !== null ? `${secondsSincePacket}s ago` : 'Waiting'}
                </span>
              </div>
            </div>

            {/* ESP32 Device Switcher Tabs & Links */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200">
                <button
                  onClick={() => setSelectedDevice('esp32_1')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                    selectedDevice === 'esp32_1'
                      ? 'bg-white text-sky-700 shadow-sm border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-sky-500" />
                  ESP32_1 {liveSessionBed1 ? `(${liveSessionBed1.student?.user?.firstName || 'Bed 1'})` : '(Available)'}
                </button>

                <button
                  onClick={() => setSelectedDevice('esp32_2')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                    selectedDevice === 'esp32_2'
                      ? 'bg-white text-sky-700 shadow-sm border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                  ESP32_2 {liveSessionBed2 ? `(${liveSessionBed2.student?.user?.firstName || 'Bed 2'})` : '(Available)'}
                </button>
              </div>

              <button
                onClick={() => navigate('/admin/nodered')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition"
                title="Open separate Node-RED debugging console"
              >
                <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                Node-RED Console
              </button>

              <button
                onClick={() => navigate(`/doctor/monitoring?bed=${activeBed}`)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-sky-600 rounded-xl hover:bg-sky-700 shadow-sm shadow-sky-600/20 transition"
              >
                <Activity className="w-3.5 h-3.5" />
                Live Monitor
              </button>
            </div>
          </div>

          {/* Active Patient Session Banner for Selected Bed */}
          <div className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 font-bold flex items-center justify-center text-xs">
                {selectedDevice === 'esp32_1' ? 'B1' : 'B2'}
              </div>
              <div>
                {currentSession ? (
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 text-sm">
                        {currentSession.student?.user?.firstName}{' '}
                        {currentSession.student?.user?.lastName}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">
                        ({currentSession.student?.rollNumber})
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
                        ACTIVE SESSION
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                      Chief Complaint: <em>{currentSession.chiefComplaint || 'Continuous vitals telemetry'}</em>
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-emerald-700 text-sm">Bed {activeBed} Available ({selectedDevice.toUpperCase()})</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        READY TO ADMIT
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">Ready to admit patient for continuous sensor monitoring.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <RiskBadge level={currentVitals?.riskLevel || 'NORMAL'} size="md" />

              {currentSession ? (
                <button
                  onClick={() => openEndModal(currentSession)}
                  className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-white hover:bg-red-50 text-red-700 border border-red-200 shadow-sm transition"
                >
                  End Session
                </button>
              ) : (
                <button
                  onClick={() => openStartModal(activeBed)}
                  className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-sky-600 hover:bg-sky-700 text-white shadow-sm transition"
                >
                  Start Session
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 4 Sensor Cards (Temperature, Humidity, Distance, FSR / Force) for Active ESP32 */}
        <ESP32DeviceView
          deviceId={selectedDevice}
          deviceName={selectedDevice === 'esp32_1' ? 'ESP32 Device 1 (Bed 1)' : 'ESP32 Device 2 (Bed 2)'}
          data={activeEsp32}
          history={activeEsp32History}
          lastUpdated={lastPacketTimestamp}
          isStale={isStale}
        />

        {/* Dynamic Multi-Channel Real-Time Telemetry Chart */}
        <HardwareTelemetryChart
          data={activeEsp32History}
          title={`${selectedDevice === 'esp32_1' ? 'ESP32 Device 1' : 'ESP32 Device 2'} Real-Time Multi-Channel Waveform`}
        />
      </div>

      {/* Two Columns: Recent Patients & Recent Active Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Patients Table */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-sky-600" />
              Recent Patients
            </h3>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search name / roll..."
                value={searchPatient}
                onChange={(e) => setSearchPatient(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px]">
                  <th className="pb-2.5">Student</th>
                  <th className="pb-2.5">Roll No</th>
                  <th className="pb-2.5">Last Risk</th>
                  <th className="pb-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPatients.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3 font-semibold text-slate-800">
                      {p.name}
                      {p.activeBed && (
                        <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-100 text-sky-700">
                          Bed {p.activeBed}
                        </span>
                      )}
                    </td>
                    <td className="py-3 font-mono text-slate-600">{p.rollNumber}</td>
                    <td className="py-3">
                      <RiskBadge level={p.lastRiskStatus} size="sm" />
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => navigate(`/doctor/patients/${p.id}`)}
                        className="text-sky-600 hover:text-sky-700 font-semibold inline-flex items-center gap-1"
                      >
                        Profile <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Alerts Table */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Recent Triage Alerts
            </h3>
            <button
              onClick={() => navigate('/doctor/alerts')}
              className="text-xs text-sky-600 hover:text-sky-700 font-semibold"
            >
              View all
            </button>
          </div>

          <div className="space-y-3">
            {recentAlerts?.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No active critical alerts detected.
              </div>
            ) : (
              recentAlerts?.slice(0, 4).map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 ${
                    alert.riskLevel === 'EMERGENCY'
                      ? 'bg-red-50/70 border-red-200'
                      : 'bg-amber-50/70 border-amber-200'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <RiskBadge level={alert.riskLevel} size="sm" />
                      <span className="font-bold text-xs text-slate-800">
                        Bed {alert.bedNumber} &bull; {alert.session?.student?.user?.firstName || 'Student'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-2">
                      {alert.explanation}
                    </p>
                    <span className="text-[10px] text-slate-400 block">
                      {new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {!alert.isAcknowledged && (
                    <button
                      onClick={() => acknowledgeAlert(alert.id)}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 shadow-sm shrink-0"
                    >
                      Acknowledge
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Start Session Modal */}
      <Modal
        isOpen={isStartModalOpen}
        onClose={() => setIsStartModalOpen(false)}
        title={`Start Vital Monitoring Session — Bed ${targetBed}`}
      >
        <form onSubmit={(e) => handleStartSession(e, false)} className="space-y-4">
          {startError && (
            <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs space-y-2">
              <div className="font-semibold">{startError}</div>
              <button
                type="button"
                disabled={isForceSubmitting}
                onClick={(e) => handleStartSession(e, true)}
                className="w-full py-2 px-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition text-xs shadow-sm flex items-center justify-center gap-2"
              >
                {isForceSubmitting ? 'Ending previous session...' : 'End Existing Session & Admit Patient Now'}
              </button>
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
              {availableStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.user.firstName} {s.user.lastName} ({s.rollNumber}) &bull; {s.branch}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Chief Complaint / Reason for Admission
            </label>
            <textarea
              rows={2}
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.target.value)}
              placeholder="e.g. Dizziness, acute fever, headache, sports exhaustion..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsStartModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl text-xs shadow-md shadow-sky-600/20 transition"
            >
              Confirm & Start Monitoring
            </button>
          </div>
        </form>
      </Modal>

      {/* End Session Modal */}
      <Modal
        isOpen={isEndModalOpen}
        onClose={() => setIsEndModalOpen(false)}
        title={`End Monitoring Session — Bed ${endingSession?.bedNumber}`}
      >
        <form onSubmit={handleEndSession} className="space-y-4">
          <p className="text-xs text-slate-600">
            Ending the session for <strong>{endingSession?.student?.user?.firstName} {endingSession?.student?.user?.lastName}</strong>. A final summary will be generated and saved to the patient’s digital medical record.
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Clinical Discharge Summary
            </label>
            <textarea
              rows={3}
              value={sessionSummary}
              onChange={(e) => setSessionSummary(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsEndModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl text-xs shadow-md transition"
            >
              Confirm End Session
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
