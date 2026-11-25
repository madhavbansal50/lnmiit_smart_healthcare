import React, { useState, useEffect } from 'react';
import { Pill, Plus, Search, User, FileText, CheckCircle, Calendar, Trash2, Filter, X, Stethoscope, Clock, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import { Modal } from '../../components/common/Modal';

export const DoctorPrescriptions = () => {
  const [patients, setPatients] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentFilter, setSelectedStudentFilter] = useState('ALL');

  // Form State
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([
    { medicineName: 'Paracetamol', dosage: '650 mg', frequency: 'Twice daily', duration: '3 days', instructions: 'Take after meals' }
  ]);
  const [successMsg, setSuccessMsg] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [patientsRes, prescRes] = await Promise.all([
        api.get('/doctors/patients'),
        api.get('/prescriptions')
      ]);

      const patientData = patientsRes.data || [];
      const prescData = prescRes.data || [];

      setPatients(patientData);
      setPrescriptions(prescData);

      if (patientData.length > 0 && !selectedStudentId) {
        setSelectedStudentId(patientData[0].id);
      }
    } catch (err) {
      console.error('Error loading prescription data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddRow = () => {
    setItems([
      ...items,
      { medicineName: '', dosage: '', frequency: 'Twice daily', duration: '3 days', instructions: 'Take after meals' }
    ]);
  };

  const handleRemoveRow = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/prescriptions', {
        studentId: selectedStudentId,
        diagnosis,
        notes,
        items
      });
      setSuccessMsg('Prescription successfully created and dispatched to student portal!');
      setTimeout(async () => {
        setIsModalOpen(false);
        setSuccessMsg('');
        setDiagnosis('');
        setNotes('');
        setItems([
          { medicineName: 'Paracetamol', dosage: '650 mg', frequency: 'Twice daily', duration: '3 days', instructions: 'Take after meals' }
        ]);
        await loadData();
      }, 1000);
    } catch (err) {
      alert('Failed to issue prescription');
    }
  };

  const handleDeletePrescription = async (id) => {
    if (!window.confirm('Are you sure you want to delete this prescription? This will remove it from both the clinic records and the student portal.')) {
      return;
    }
    try {
      setDeletingId(id);
      await api.delete(`/prescriptions/${id}`);
      await loadData();
    } catch (err) {
      console.error('Delete prescription error:', err);
      alert('Failed to delete prescription');
    } finally {
      setDeletingId(null);
    }
  };

  // Filtered Prescriptions
  const filteredPrescriptions = prescriptions.filter((p) => {
    if (selectedStudentFilter !== 'ALL') {
      if (p.studentId !== selectedStudentFilter && p.student?.id !== selectedStudentFilter) {
        return false;
      }
    }
    if (!searchQuery.trim()) return true;

    const q = searchQuery.toLowerCase();
    const studentName = `${p.student?.user?.firstName || ''} ${p.student?.user?.lastName || ''}`.toLowerCase();
    const roll = (p.student?.rollNumber || '').toLowerCase();
    const diag = (p.diagnosis || '').toLowerCase();
    const notesText = (p.notes || '').toLowerCase();
    const medNames = (p.items || []).map((i) => i.medicineName?.toLowerCase() || '').join(' ');

    return studentName.includes(q) || roll.includes(q) || diag.includes(q) || notesText.includes(q) || medNames.includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Digital Prescription Management
          </h2>
          <p className="text-sm text-slate-500">
            Issue and audit digital medical prescriptions with dosage, frequency, and instructions
          </p>
        </div>
        <button
          onClick={() => {
            if (patients.length > 0 && !selectedStudentId) {
              setSelectedStudentId(patients[0].id);
            }
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl text-xs sm:text-sm shadow-md shadow-sky-600/20 transition"
        >
          <Plus className="w-4 h-4" /> Issue New Prescription
        </button>
      </div>

      {/* Patient Cards Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <User className="w-4 h-4 text-sky-600" />
            Campus Patients & Historical Records ({patients.length})
          </h3>
          {selectedStudentFilter !== 'ALL' && (
            <button
              onClick={() => setSelectedStudentFilter('ALL')}
              className="text-xs font-semibold text-sky-600 hover:text-sky-800"
            >
              Clear Filter (Show All)
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {patients.map((p) => {
            const isFiltered = selectedStudentFilter === p.id;
            return (
              <div
                key={p.id}
                className={`bg-white rounded-2xl border p-4 shadow-sm transition space-y-3 relative ${
                  isFiltered
                    ? 'border-sky-500 ring-2 ring-sky-500/20 bg-sky-50/20'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center font-bold text-sky-700 text-xs">
                      {p.user?.firstName?.charAt(0) || 'P'}
                      {p.user?.lastName?.charAt(0) || ''}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">
                        {p.user?.firstName || 'Patient'} {p.user?.lastName || ''}
                      </h4>
                      <p className="text-xs text-slate-400 font-mono">
                        {p.rollNumber} &bull; {p.branch || 'Campus Student'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedStudentId(p.id);
                      setIsModalOpen(true);
                    }}
                    className="px-2.5 py-1 bg-sky-50 text-sky-700 hover:bg-sky-100 font-semibold rounded-lg text-xs transition"
                  >
                    + Prescribe
                  </button>
                </div>

                <div className="text-xs text-slate-600 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Allergies:</span>
                    <span className="font-medium text-slate-800">{p.allergies || 'None reported'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Chronic:</span>
                    <span className="font-medium text-slate-800">{p.chronicConditions || 'None reported'}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    <span className="text-slate-500 font-semibold">Total Prescriptions:</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-800">
                      {p._count?.prescriptions ?? 0}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedStudentFilter(isFiltered ? 'ALL' : p.id)}
                  className={`w-full py-1.5 px-3 rounded-xl text-xs font-semibold border transition text-center ${
                    isFiltered
                      ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {isFiltered ? '✓ Filtering Table Below (Clear)' : 'Filter Prescriptions Below'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Issued Digital Prescriptions Audit Log Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Section Header with Controls */}
        <div className="p-5 border-b border-slate-100 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-sky-600" />
                Issued Digital Prescriptions Audit Log
              </h3>
              <p className="text-xs text-slate-500">
                Live audit trail of digital medical prescriptions issued to students across the campus clinic
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">
                Showing <strong className="text-slate-900">{filteredPrescriptions.length}</strong> of{' '}
                <strong className="text-slate-900">{prescriptions.length}</strong> records
              </span>
              {selectedStudentFilter !== 'ALL' && (
                <button
                  onClick={() => setSelectedStudentFilter('ALL')}
                  className="text-xs font-semibold text-sky-600 hover:underline ml-1"
                >
                  Show All Patients
                </button>
              )}
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[260px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search prescriptions by student name, roll, diagnosis, or medicine..."
                className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={selectedStudentFilter}
                onChange={(e) => setSelectedStudentFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-sky-500"
              >
                <option value="ALL">All Students ({prescriptions.length})</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.user?.firstName} {p.user?.lastName} ({p.rollNumber})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Content: List of Prescriptions */}
        <div className="p-5 space-y-4">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              Loading medical prescriptions audit log...
            </div>
          ) : filteredPrescriptions.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <Pill className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-600">No prescriptions found</p>
              <p className="text-xs text-slate-400">
                {searchQuery || selectedStudentFilter !== 'ALL'
                  ? 'Try adjusting your search criteria or resetting the student filter.'
                  : 'Click "+ Issue New Prescription" above to write the first prescription.'}
              </p>
            </div>
          ) : (
            filteredPrescriptions.map((p) => (
              <div
                key={p.id}
                className="border border-slate-200 rounded-2xl p-5 hover:border-slate-300 transition bg-white shadow-sm space-y-3.5"
              >
                {/* Header row */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold border border-sky-100">
                      <Pill className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-900 text-sm">
                          Prescription #{p.id.slice(0, 8).toUpperCase()}
                        </h4>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {p.status || 'ACTIVE'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {new Date(p.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}{' '}
                        at{' '}
                        {new Date(p.createdAt).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Actions & Doctor info */}
                  <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs font-semibold text-slate-700">
                        Dr. {p.doctor?.user?.firstName || ''} {p.doctor?.user?.lastName || 'Clinic Officer'}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {p.doctor?.specialization || 'General Medicine'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeletePrescription(p.id)}
                      disabled={deletingId === p.id}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
                      title="Revoke / Delete Prescription"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Patient & Diagnosis details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-slate-400 font-semibold block mb-0.5">PATIENT</span>
                    <span className="font-bold text-slate-900 text-sm">
                      {p.student?.user?.firstName || 'Student'} {p.student?.user?.lastName || ''}
                    </span>
                    <span className="text-slate-500 block font-mono">
                      Roll: {p.student?.rollNumber || 'N/A'} &bull; Branch: {p.student?.branch || 'Campus'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block mb-0.5">DIAGNOSIS / INDICATION</span>
                    <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200">
                      {p.diagnosis || 'Clinical Follow-up / Routine Care'}
                    </span>
                    {p.notes && (
                      <p className="text-[11px] text-slate-500 mt-1 italic">
                        <strong>Note:</strong> {p.notes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Medications Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-y border-slate-100 text-slate-400 font-semibold uppercase text-[10px]">
                        <th className="py-2 px-3">Medication</th>
                        <th className="py-2 px-3">Dosage</th>
                        <th className="py-2 px-3">Frequency</th>
                        <th className="py-2 px-3">Duration</th>
                        <th className="py-2 px-3">Instructions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(p.items && p.items.length > 0) ? (
                        p.items.map((med, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="py-2 px-3 font-bold text-slate-900 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
                              {med.medicineName}
                            </td>
                            <td className="py-2 px-3 text-slate-700 font-medium">{med.dosage}</td>
                            <td className="py-2 px-3 text-slate-700 font-medium">{med.frequency}</td>
                            <td className="py-2 px-3 text-slate-700 font-medium">{med.duration}</td>
                            <td className="py-2 px-3 text-slate-500 italic">{med.instructions || 'As advised'}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-2 px-3 text-slate-400 italic">
                            Standard clinical advice / no specific pharmaceutical entries recorded.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal for Issuing New Prescription */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Issue Digital Prescription" maxWidth="max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          {successMsg && (
            <div className="p-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              {successMsg}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Select Student Patient *</label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-sky-500"
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.user?.firstName} {p.user?.lastName} ({p.rollNumber})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Diagnosis / Indication *</label>
              <input
                type="text"
                value={diagnosis}
                required
                onChange={(e) => setDiagnosis(e.target.value)}
                placeholder="e.g. Viral Pharyngitis with Mild Dehydration"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Clinical Instructions & Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Complete the antibiotic course. Follow up if fever persists beyond 48 hours."
              rows={2}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-slate-700">Prescription Medicines *</label>
              <button
                type="button"
                onClick={handleAddRow}
                className="text-xs font-semibold text-sky-600 hover:text-sky-700"
              >
                + Add Medication
              </button>
            </div>
            <div className="space-y-2.5 max-h-60 overflow-y-auto">
              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs items-center">
                  <div className="col-span-3">
                    <input
                      type="text"
                      placeholder="Medicine Name"
                      required
                      value={item.medicineName}
                      onChange={(e) => handleItemChange(idx, 'medicineName', e.target.value)}
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="text"
                      placeholder="Dosage"
                      required
                      value={item.dosage}
                      onChange={(e) => handleItemChange(idx, 'dosage', e.target.value)}
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="text"
                      placeholder="Frequency"
                      required
                      value={item.frequency}
                      onChange={(e) => handleItemChange(idx, 'frequency', e.target.value)}
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="text"
                      placeholder="Duration"
                      required
                      value={item.duration}
                      onChange={(e) => handleItemChange(idx, 'duration', e.target.value)}
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="text"
                      placeholder="Instructions"
                      value={item.instructions}
                      onChange={(e) => handleItemChange(idx, 'instructions', e.target.value)}
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div className="col-span-1 text-center">
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(idx)}
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
              onClick={() => setIsModalOpen(false)}
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
