import React, { useState, useEffect } from 'react';
import { Users, Search, UserCheck, ShieldCheck, Mail, Phone, Calendar, Heart } from 'lucide-react';
import api from '../../services/api';
import { Modal } from '../../components/common/Modal';

export const StudentManagement = () => {
  const [students, setStudents] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Assign Doctor Modal
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [assignSuccess, setAssignSuccess] = useState('');

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/students', {
        params: { search: search || undefined }
      });
      setStudents(res.data);
    } catch (err) {
      console.error('Fetch students error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDoctors = async () => {
    try {
      const res = await api.get('/admin/doctors');
      setDoctors(res.data);
    } catch (err) {
      console.error('Fetch doctors error:', err);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStudents();
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const openAssignModal = (student) => {
    setSelectedStudent(student);
    setSelectedDoctorId(student.assignedDoctorId || '');
    setAssignSuccess('');
    setIsAssignModalOpen(true);
  };

  const handleAssignDoctor = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/admin/students/${selectedStudent.id}/assign-doctor`, {
        doctorId: selectedDoctorId || null
      });
      setAssignSuccess('Assigned doctor updated successfully!');
      setTimeout(() => {
        setIsAssignModalOpen(false);
        setAssignSuccess('');
        fetchStudents();
      }, 1000);
    } catch (err) {
      alert('Failed to update assigned doctor');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Registered Student / Patient Directory
          </h2>
          <p className="text-sm text-slate-500">
            View student health profiles, medical visits, and physician assignment
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search students by full name, roll number (e.g. 21UEC045), or branch..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800"
          />
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px] tracking-wider">
                <th className="py-3.5 px-4">Student</th>
                <th className="py-3.5 px-4">Roll Number</th>
                <th className="py-3.5 px-4">Branch & Year</th>
                <th className="py-3.5 px-4">Blood Group</th>
                <th className="py-3.5 px-4">Assigned Doctor</th>
                <th className="py-3.5 px-4">Sessions</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    Loading student records...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    No students found matching your criteria.
                  </td>
                </tr>
              ) : (
                students.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 font-bold flex items-center justify-center text-xs border border-emerald-200">
                          {s.user.firstName[0]}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 leading-tight">
                            {s.user.firstName} {s.user.lastName}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">{s.user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                      {s.rollNumber}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      <div>{s.branch}</div>
                      <span className="text-[11px] text-slate-400">Year {s.yearOfStudy}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded font-mono font-bold bg-rose-50 text-rose-700 border border-rose-200 text-xs">
                        {s.bloodGroup || 'B+'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">
                      {s.assignedDoctor ? (
                        <div className="font-semibold text-sky-700">
                          Dr. {s.assignedDoctor.user.firstName} {s.assignedDoctor.user.lastName}
                          <span className="block text-[10px] text-slate-400 font-normal">{s.assignedDoctor.specialization}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-800">{s._count?.sessions || 0}</span>
                      <span className="text-[11px] text-slate-400 ml-1">visits</span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => openAssignModal(s)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-sky-50 hover:text-sky-700 text-slate-700 font-semibold rounded-lg text-xs transition"
                      >
                        Assign Doctor
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assign Doctor Modal */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title={`Assign Doctor: ${selectedStudent?.user?.firstName} ${selectedStudent?.user?.lastName} (${selectedStudent?.rollNumber})`}
      >
        <form onSubmit={handleAssignDoctor} className="space-y-4">
          {assignSuccess && (
            <div className="p-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold">
              {assignSuccess}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Select Attending Campus Doctor
            </label>
            <select
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-sky-500"
            >
              <option value="">-- No Primary Doctor (Clinic General Pool) --</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  Dr. {d.user.firstName} {d.user.lastName} ({d.specialization}) - {d.doctorId}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAssignModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl text-xs shadow-md shadow-sky-600/20 transition"
            >
              Confirm Assignment
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
