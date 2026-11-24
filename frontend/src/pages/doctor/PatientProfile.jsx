import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  User,
  Activity,
  Clock,
  FileText,
  Pill,
  FileCheck,
  TrendingUp,
  AlertTriangle,
  Plus,
  Heart,
  Thermometer,
  ShieldCheck,
  CheckCircle,
  Download,
  Bot
} from 'lucide-react';
import api from '../../services/api';
import { RiskBadge, StatusBadge } from '../../components/common/Badge';
import { VitalGaugeCard } from '../../components/common/VitalGaugeCard';
import { RealtimeVitalsChart } from '../../components/charts/RealtimeVitalsChart';
import { Modal } from '../../components/common/Modal';
import { useVitals } from '../../context/VitalsContext';

export const PatientProfile = () => {
  const { id } = useParams(); // studentProfile id
  const navigate = useNavigate();

  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('OVERVIEW');

  // Add Clinical Note Modal
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [noteForm, setNoteForm] = useState({
    chiefComplaint: '',
    clinicalObservations: '',
    diagnosis: '',
    instructions: '',
    followUpRecommendation: ''
  });

  // Add Prescription Modal
  const [isPrescModalOpen, setIsPrescModalOpen] = useState(false);
  const [prescDiagnosis, setPrescDiagnosis] = useState('');
  const [prescNotes, setPrescNotes] = useState('');
  const [prescItems, setPrescItems] = useState([
    { medicineName: 'Paracetamol', dosage: '650 mg', frequency: 'Twice daily after meals', duration: '3 days', instructions: 'Take with warm water' }
  ]);

  const { bed1Vitals, bed2Vitals, bed1History, bed2History } = useVitals();

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/doctors/patients/${id}`);
      setPatient(res.data);
    } catch (err) {
      console.error('Fetch profile error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [id]);

  const handleAddNote = async (e) => {
    e.preventDefault();
    try {
      await api.post('/clinical-notes', {
        studentId: id,
        sessionId: patient?.activeSession?.id || null,
        ...noteForm
      });
      setIsNoteModalOpen(false);
      setNoteForm({
        chiefComplaint: '',
        clinicalObservations: '',
        diagnosis: '',
        instructions: '',
        followUpRecommendation: ''
      });
      fetchProfile();
    } catch (err) {
      alert('Failed to save clinical note');
    }
  };

  const handleAddMedicineRow = () => {
    setPrescItems([
      ...prescItems,
      { medicineName: '', dosage: '', frequency: 'Twice daily', duration: '3 days', instructions: 'Take after meals' }
    ]);
  };

  const handleRemoveMedicineRow = (index) => {
    setPrescItems(prescItems.filter((_, i) => i !== index));
  };

  const handlePrescItemChange = (index, field, value) => {
    const updated = [...prescItems];
    updated[index][field] = value;
    setPrescItems(updated);
  };

  const handleAddPrescription = async (e) => {
    e.preventDefault();
    try {
      await api.post('/prescriptions', {
        studentId: id,
        sessionId: patient?.activeSession?.id || null,
        diagnosis: prescDiagnosis,
        notes: prescNotes,
        items: prescItems
      });
      setIsPrescModalOpen(false);
      setPrescDiagnosis('');
      setPrescNotes('');
      fetchProfile();
    } catch (err) {
      alert('Failed to issue prescription');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-600" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="p-12 text-center text-slate-500">
        Patient record not found.
      </div>
    );
  }

  const {
    user,
    rollNumber,
    branch,
    yearOfStudy,
    age,
    bloodGroup,
    allergies,
    chronicConditions,
    hostelRoom,
    emergencyContactName,
    emergencyContactPhone,
    assignedDoctor,
    sessions = [],
    clinicalNotes = [],
    prescriptions = [],
    medicalReports = [],
    activeSession,
    healthBaselines
  } = patient;

  const baseline = healthBaselines?.[0];
  const latestSession = sessions[0];
  const isCurrentlyMonitored = !!activeSession;
  const liveVitals = activeSession?.bedNumber === 1 ? bed1Vitals : bed2Vitals;
  const liveHistory = activeSession?.bedNumber === 1 ? bed1History : bed2History;

  return (
    <div className="space-y-6">
      {/* Profile Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-500 to-brand-600 text-white font-extrabold flex items-center justify-center text-2xl shadow-lg shadow-sky-500/20">
              {user.firstName[0]}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  {user.firstName} {user.lastName}
                </h2>
                <span className="font-mono font-bold text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200">
                  {rollNumber}
                </span>
                {isCurrentlyMonitored && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse">
                    Active Bed {activeSession.bedNumber}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {branch} &bull; Year {yearOfStudy} &bull; Age: {age || 20} &bull; Hostel: {hostelRoom}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsNoteModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition"
            >
              <Plus className="w-3.5 h-3.5" /> Add Clinical Note
            </button>
            <button
              onClick={() => setIsPrescModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl text-xs shadow-md shadow-sky-600/20 transition"
            >
              <Plus className="w-3.5 h-3.5" /> Issue Prescription
            </button>
          </div>
        </div>

        {/* Quick Medical Badges Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-100 text-xs">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60">
            <span className="text-slate-400 block text-[11px]">Blood Group</span>
            <span className="font-bold text-slate-800 text-sm">{bloodGroup || 'B+'}</span>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60">
            <span className="text-slate-400 block text-[11px]">Allergies</span>
            <span className="font-semibold text-rose-700 truncate block">{allergies || 'None reported'}</span>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60">
            <span className="text-slate-400 block text-[11px]">Chronic Conditions</span>
            <span className="font-semibold text-slate-700 truncate block">{chronicConditions || 'None reported'}</span>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60">
            <span className="text-slate-400 block text-[11px]">Emergency Contact</span>
            <span className="font-semibold text-slate-700 truncate block">{emergencyContactName} ({emergencyContactPhone})</span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-200 pb-1">
        {[
          { id: 'OVERVIEW', label: 'Overview', icon: Activity },
          { id: 'LIVE', label: 'Live Monitoring', icon: Heart },
          { id: 'VISITS', label: 'Visit History', icon: Clock },
          { id: 'NOTES', label: 'Clinical Notes', icon: FileText },
          { id: 'PRESCRIPTIONS', label: 'Prescriptions', icon: Pill },
          { id: 'REPORTS', label: 'Medical Reports', icon: FileCheck },
          { id: 'INSIGHTS', label: 'Health Insights', icon: TrendingUp }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Baseline Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Student Health Baseline
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Resting Pulse Baseline</span>
                  <span className="font-mono font-bold text-slate-800">{baseline?.baselineHeartRate || 72} BPM</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">SpO₂ Baseline</span>
                  <span className="font-mono font-bold text-slate-800">{baseline?.baselineSpo2 || 98.2}%</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Body Temp Baseline</span>
                  <span className="font-mono font-bold text-slate-800">{baseline?.baselineTemperature || 36.8}°C</span>
                </div>
              </div>
            </div>

            {/* Latest Session Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3 md:col-span-2">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4 text-sky-600" />
                  Latest Monitoring Session
                </h3>
                {latestSession && <RiskBadge level={latestSession.finalRiskLevel} size="sm" />}
              </div>
              {latestSession ? (
                <div className="space-y-2 text-xs">
                  <p className="text-slate-600">
                    <strong className="text-slate-800">Date:</strong> {new Date(latestSession.startTime).toLocaleDateString()} at {new Date(latestSession.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &bull; Duration: {latestSession.durationMinutes || 25} mins
                  </p>
                  <p className="text-slate-600">
                    <strong className="text-slate-800">Chief Complaint:</strong> {latestSession.chiefComplaint}
                  </p>
                  <p className="text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <strong className="text-slate-800">Discharge Summary:</strong> {latestSession.summary || 'Vitals stabilized.'}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-400">No monitoring sessions recorded yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LIVE MONITORING */}
      {activeTab === 'LIVE' && (
        <div className="space-y-6">
          {isCurrentlyMonitored ? (
            <>
              <VitalGaugeCard
                bedNumber={activeSession.bedNumber}
                vitals={liveVitals}
                patient={{ name: `${user.firstName} ${user.lastName}`, rollNumber }}
              />
              <RealtimeVitalsChart
                data={liveHistory}
                title={`Live Stream: ${user.firstName} (Bed ${activeSession.bedNumber})`}
              />
            </>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 text-sm">
              <Activity className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              Patient is not currently connected to an active clinic bed.
              <div className="mt-4">
                <button
                  onClick={() => navigate('/doctor/monitoring')}
                  className="px-4 py-2 bg-sky-600 text-white rounded-xl text-xs font-semibold"
                >
                  Go to Live Telemetry Desk
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: VISIT HISTORY */}
      {activeTab === 'VISITS' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800 text-base">Campus Medical Visits & Monitoring Sessions</h3>
          <div className="divide-y divide-slate-100 text-xs">
            {sessions.map((s) => (
              <div key={s.id} className="py-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">
                      {new Date(s.startTime).toLocaleDateString()}
                    </span>
                    <span className="text-slate-400">&bull;</span>
                    <span className="text-slate-600">Bed {s.bedNumber}</span>
                    <span className="text-slate-400">&bull;</span>
                    <span className="text-slate-600">{s.durationMinutes || 20} mins</span>
                  </div>
                  <RiskBadge level={s.finalRiskLevel} size="sm" />
                </div>
                <p className="text-slate-700"><strong>Complaint:</strong> {s.chiefComplaint}</p>
                <p className="text-slate-500">{s.summary}</p>
                <div className="flex items-center gap-4 text-[11px] text-slate-400 font-mono">
                  <span>Avg HR: {s.avgHeartRate || '--'} BPM</span>
                  <span>Avg SpO₂: {s.avgSpo2 || '--'}%</span>
                  <span>Avg Temp: {s.avgTemperature || '--'}°C</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: CLINICAL NOTES */}
      {activeTab === 'NOTES' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-base">Clinical Observations & Diagnoses</h3>
            <button
              onClick={() => setIsNoteModalOpen(true)}
              className="px-3.5 py-1.5 bg-sky-600 text-white rounded-xl text-xs font-semibold"
            >
              + New Note
            </button>
          </div>
          <div className="divide-y divide-slate-100 text-xs space-y-4">
            {clinicalNotes.map((note) => (
              <div key={note.id} className="pt-4 space-y-2">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="font-semibold text-slate-800">
                    Dr. {note.doctor?.user?.firstName} {note.doctor?.user?.lastName}
                  </span>
                  <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-1.5">
                  <p><strong>Chief Complaint:</strong> {note.chiefComplaint}</p>
                  <p><strong>Observations:</strong> {note.clinicalObservations}</p>
                  {note.diagnosis && <p><strong>Diagnosis:</strong> <span className="text-sky-700 font-semibold">{note.diagnosis}</span></p>}
                  <p><strong>Instructions:</strong> {note.instructions}</p>
                  {note.followUpRecommendation && (
                    <p><strong>Follow-Up:</strong> {note.followUpRecommendation}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: PRESCRIPTIONS */}
      {activeTab === 'PRESCRIPTIONS' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-base">Digital Prescriptions Issued</h3>
            <button
              onClick={() => setIsPrescModalOpen(true)}
              className="px-3.5 py-1.5 bg-sky-600 text-white rounded-xl text-xs font-semibold"
            >
              + Issue Prescription
            </button>
          </div>
          <div className="space-y-4">
            {prescriptions.map((p) => (
              <div key={p.id} className="border border-slate-200 rounded-2xl p-4 text-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div>
                    <span className="font-bold text-slate-800">Prescription #{p.id.slice(0, 8)}</span>
                    <span className="text-slate-400 ml-2">by Dr. {p.doctor?.user?.lastName} on {new Date(p.createdAt).toLocaleDateString()}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {p.status}
                  </span>
                </div>
                {p.diagnosis && <p><strong>Indication / Diagnosis:</strong> {p.diagnosis}</p>}
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-slate-400 uppercase text-[10px] border-b border-slate-100">
                      <th className="pb-1.5">Medicine</th>
                      <th className="pb-1.5">Dosage</th>
                      <th className="pb-1.5">Frequency</th>
                      <th className="pb-1.5">Duration</th>
                      <th className="pb-1.5">Instructions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {p.items?.map((item) => (
                      <tr key={item.id} className="text-slate-700">
                        <td className="py-2 font-bold text-slate-800">{item.medicineName}</td>
                        <td className="py-2">{item.dosage}</td>
                        <td className="py-2">{item.frequency}</td>
                        <td className="py-2">{item.duration}</td>
                        <td className="py-2 text-slate-500">{item.instructions}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: MEDICAL REPORTS & AI SUMMARIES */}
      {activeTab === 'REPORTS' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800 text-base">Diagnostic Reports & AI Summaries</h3>
          <div className="space-y-4">
            {medicalReports.map((r) => (
              <div key={r.id} className="border border-slate-200 rounded-2xl p-5 text-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">{r.title}</h4>
                    <p className="text-[11px] text-slate-400">File: {r.fileName} &bull; Uploaded: {new Date(r.uploadDate).toLocaleDateString()}</p>
                  </div>
                  <a
                    href={r.filePath}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold"
                  >
                    <Download className="w-3.5 h-3.5" /> View PDF
                  </a>
                </div>

                {r.summary && (
                  <div className="bg-sky-50/50 border border-sky-100 rounded-xl p-4 space-y-2.5">
                    <div className="flex items-center gap-2 text-sky-800 font-bold">
                      <Bot className="w-4 h-4 text-sky-600" />
                      AI Diagnostic Clinical Summary ({r.summary.serviceStatus})
                    </div>
                    <div>
                      <strong className="text-slate-800 block mb-0.5">Key Findings:</strong>
                      <p className="whitespace-pre-line text-slate-700">{r.summary.keyFindings}</p>
                    </div>
                    <div>
                      <strong className="text-amber-800 block mb-0.5">Abnormal Values Detected:</strong>
                      <p className="whitespace-pre-line text-amber-900 font-medium">{r.summary.abnormalValues}</p>
                    </div>
                    <div>
                      <strong className="text-slate-800 block mb-0.5">Possible Clinical Concerns:</strong>
                      <p className="text-slate-700">{r.summary.possibleConcerns}</p>
                    </div>
                    <div>
                      <strong className="text-sky-800 block mb-0.5">Questions for Doctor:</strong>
                      <p className="whitespace-pre-line text-sky-900">{r.summary.questionsToAskDoctor}</p>
                    </div>
                    <p className="text-[10px] text-slate-400 italic pt-1 border-t border-sky-100">
                      {r.summary.disclaimer}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 7: HEALTH INSIGHTS */}
      {activeTab === 'INSIGHTS' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800 text-base">Longitudinal Trend Analysis</h3>
          <p className="text-xs text-slate-500">Generated from stored continuous telemetry history</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">Resting Pulse Stability</span>
              <p className="text-xs text-slate-700 font-medium">
                Pulse averages have remained within +4 BPM of historical baseline across campus clinic check-ins.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">Thermoregulation Response</span>
              <p className="text-xs text-slate-700 font-medium">
                Body temperature stabilized rapidly following clinic hydration protocol.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Add Clinical Note Modal */}
      <Modal isOpen={isNoteModalOpen} onClose={() => setIsNoteModalOpen(false)} title="Add Clinical Note">
        <form onSubmit={handleAddNote} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Chief Complaint *</label>
            <input
              type="text"
              required
              value={noteForm.chiefComplaint}
              onChange={(e) => setNoteForm({ ...noteForm, chiefComplaint: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Clinical Observations *</label>
            <textarea
              rows={2}
              required
              value={noteForm.clinicalObservations}
              onChange={(e) => setNoteForm({ ...noteForm, clinicalObservations: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Diagnosis</label>
            <input
              type="text"
              value={noteForm.diagnosis}
              onChange={(e) => setNoteForm({ ...noteForm, diagnosis: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Instructions *</label>
            <textarea
              rows={2}
              required
              value={noteForm.instructions}
              onChange={(e) => setNoteForm({ ...noteForm, instructions: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Follow-Up Recommendation</label>
            <input
              type="text"
              value={noteForm.followUpRecommendation}
              onChange={(e) => setNoteForm({ ...noteForm, followUpRecommendation: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsNoteModalOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl text-xs shadow-md"
            >
              Save Note
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Prescription Modal */}
      <Modal isOpen={isPrescModalOpen} onClose={() => setIsPrescModalOpen(false)} title="Issue Digital Prescription" maxWidth="max-w-3xl">
        <form onSubmit={handleAddPrescription} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Diagnosis / Indication</label>
              <input
                type="text"
                value={prescDiagnosis}
                onChange={(e) => setPrescDiagnosis(e.target.value)}
                placeholder="e.g. Acute Upper Respiratory Tract Infection"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">General Notes</label>
              <input
                type="text"
                value={prescNotes}
                onChange={(e) => setPrescNotes(e.target.value)}
                placeholder="e.g. Complete full antibiotic course"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-slate-700">Prescribed Medicines *</label>
              <button
                type="button"
                onClick={handleAddMedicineRow}
                className="text-xs font-semibold text-sky-600 hover:text-sky-700"
              >
                + Add Medication
              </button>
            </div>
            <div className="space-y-2.5 max-h-60 overflow-y-auto">
              {prescItems.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs items-center">
                  <div className="col-span-3">
                    <input
                      type="text"
                      placeholder="Medicine"
                      required
                      value={item.medicineName}
                      onChange={(e) => handlePrescItemChange(idx, 'medicineName', e.target.value)}
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="text"
                      placeholder="Dosage"
                      required
                      value={item.dosage}
                      onChange={(e) => handlePrescItemChange(idx, 'dosage', e.target.value)}
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="text"
                      placeholder="Frequency"
                      required
                      value={item.frequency}
                      onChange={(e) => handlePrescItemChange(idx, 'frequency', e.target.value)}
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="text"
                      placeholder="Duration"
                      required
                      value={item.duration}
                      onChange={(e) => handlePrescItemChange(idx, 'duration', e.target.value)}
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="text"
                      placeholder="Instructions"
                      value={item.instructions}
                      onChange={(e) => handlePrescItemChange(idx, 'instructions', e.target.value)}
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div className="col-span-1 text-center">
                    {prescItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMedicineRow(idx)}
                        className="text-red-500 hover:text-red-700 text-sm font-bold"
                      >
                        &times;
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsPrescModalOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl text-xs shadow-md shadow-sky-600/20"
            >
              Issue Digital Prescription
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
