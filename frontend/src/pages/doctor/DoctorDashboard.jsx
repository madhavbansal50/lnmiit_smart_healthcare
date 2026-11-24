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
  Heart
} from 'lucide-react';
import api from '../../services/api';
import { VitalGaugeCard } from '../../components/common/VitalGaugeCard';
import { RiskBadge, StatusBadge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { useVitals } from '../../context/VitalsContext';
import { useAuth } from '../../context/AuthContext';

export const DoctorDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchPatient, setSearchPatient] = useState('');

  // Start Session Modal
  const [isStartModalOpen, setIsStartModalOpen] = useState(false);
  const [targetBed, setTargetBed] = useState(1);
  const [availableStudents, setAvailableStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [startError, setStartError] = useState('');

  // End Session Modal
  const [isEndModalOpen, setIsEndModalOpen] = useState(false);
  const [endingSession, setEndingSession] = useState(null);
  const [sessionSummary, setSessionSummary] = useState('');

  const { bed1Vitals, bed2Vitals, acknowledgeAlert } = useVitals();
  const { user } = useAuth();
  const navigate = useNavigate();

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

  useEffect(() => {
    fetchDashboard();
  }, []);

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

  const handleStartSession = async (e) => {
    e.preventDefault();
    if (!selectedStudentId) {
      setStartError('Please select a student.');
      return;
    }
    try {
      await api.post('/sessions/start', {
        studentId: selectedStudentId,
        bedNumber: targetBed,
        chiefComplaint: chiefComplaint || 'Routine campus clinic vitals assessment'
      });
      setIsStartModalOpen(false);
      setChiefComplaint('');
      fetchDashboard();
    } catch (err) {
      setStartError(err.response?.data?.message || 'Failed to start session');
    }
  };

  const openEndModal = (session) => {
    setEndingSession(session);
    setSessionSummary('Patient vitals stabilized. Discharged to hostel room with hydration advice.');
    setIsEndModalOpen(true);
  };

  const handleEndSession = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/sessions/${endingSession.id}/end`, {
        summary: sessionSummary
      });
      setIsEndModalOpen(false);
      fetchDashboard();
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

      {/* Dual Bed Real-Time Monitoring Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Activity className="w-5 h-5 text-sky-600" />
            Active Clinic Beds — Real-Time Telemetry
          </h3>
          <span className="text-xs text-slate-500 hidden sm:inline">
            ESP32 Wi-Fi &bull; MQTT &bull; 2-Second Heartbeat
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bed 1 */}
          <VitalGaugeCard
            bedNumber={1}
            vitals={bed1Vitals}
            patient={beds?.bed1?.session ? {
              name: `${beds.bed1.session.student?.user?.firstName} ${beds.bed1.session.student?.user?.lastName}`,
              rollNumber: beds.bed1.session.student?.rollNumber
            } : null}
            isDoctorView={true}
            onStartSession={() => openStartModal(1)}
            onEndSession={() => openEndModal(beds?.bed1?.session)}
          />

          {/* Bed 2 */}
          <VitalGaugeCard
            bedNumber={2}
            vitals={bed2Vitals}
            patient={beds?.bed2?.session ? {
              name: `${beds.bed2.session.student?.user?.firstName} ${beds.bed2.session.student?.user?.lastName}`,
              rollNumber: beds.bed2.session.student?.rollNumber
            } : null}
            isDoctorView={true}
            onStartSession={() => openStartModal(2)}
            onEndSession={() => openEndModal(beds?.bed2?.session)}
          />
        </div>
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
        <form onSubmit={handleStartSession} className="space-y-4">
          {startError && (
            <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-semibold">
              {startError}
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
