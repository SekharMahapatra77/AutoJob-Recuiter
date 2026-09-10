import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Recruiter } from '../types';
import {
  Users,
  Search,
  Plus,
  Mail,
  Phone,
  Building,
  Linkedin,
  CheckCircle2,
  Send,
  X,
  FileSpreadsheet
} from 'lucide-react';

export const RecruitersPage: React.FC = () => {
  const [recruiters, setRecruiters] = useState<Recruiter[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    jobTitle: 'Technical Recruiter',
    linkedinUrl: '',
    location: 'USA',
    phone: '',
    notes: '',
    status: 'READY',
    verified: true
  });

  const fetchRecruiters = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {};
      if (keyword.trim()) params.keyword = keyword.trim();
      if (status !== 'ALL') params.status = status;

      const res = await api.get('/recruiters', { params });
      if (res.data.success) {
        setRecruiters(res.data.data.recruiters);
      }
    } catch (err) {
      console.error('Failed to fetch recruiters:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecruiters();
  }, [status]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRecruiters();
  };

  const handleCreateRecruiter = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/recruiters', formData);
      if (res.data.success) {
        setIsModalOpen(false);
        setFormData({
          name: '',
          email: '',
          company: '',
          jobTitle: 'Technical Recruiter',
          linkedinUrl: '',
          location: 'USA',
          phone: '',
          notes: '',
          status: 'READY',
          verified: true
        });
        fetchRecruiters();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to add recruiter.');
    }
  };

  const getStatusBadge = (recStatus: string) => {
    const map: Record<string, { bg: string; text: string }> = {
      INTERESTED: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' },
      REPLIED: { bg: 'bg-purple-50 border-purple-200', text: 'text-purple-700' },
      READY: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700' },
      CONTACTED: { bg: 'bg-sky-50 border-sky-200', text: 'text-sky-700' },
      FOLLOW_UP: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700' },
      NOT_INTERESTED: { bg: 'bg-rose-50 border-rose-200', text: 'text-rose-700' },
      NEW: { bg: 'bg-slate-100 border-slate-200', text: 'text-slate-600' }
    };
    const c = map[recStatus] || { bg: 'bg-slate-50 border-slate-200', text: 'text-slate-600' };
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${c.bg} ${c.text}`}>
        {recStatus}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Recruiter Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Maintain verified staffing contacts, companies, and outreach histories.
          </p>
        </div>
        <div className="mt-3 sm:mt-0 flex items-center space-x-2">
          <button
            onClick={() => navigate('/csv')}
            className="inline-flex items-center px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition"
          >
            <FileSpreadsheet className="w-4 h-4 mr-1.5 text-slate-500" />
            Import CSV
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center px-3 py-2 border border-transparent rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Recruiter
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <form onSubmit={handleSearch} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Search by recruiter name, email, company or title..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white min-w-[140px]"
        >
          <option value="ALL">All Statuses</option>
          <option value="READY">Ready</option>
          <option value="CONTACTED">Contacted</option>
          <option value="REPLIED">Replied</option>
          <option value="INTERESTED">Interested</option>
          <option value="FOLLOW_UP">Follow-up</option>
          <option value="NOT_INTERESTED">Not Interested</option>
        </select>

        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold"
        >
          Search
        </button>
      </form>

      {/* Recruiter Directory Table / Mobile Cards */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Recruiter / Title</th>
                <th className="py-3 px-4">Company</th>
                <th className="py-3 px-4">Email & Phone</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    Loading recruiters...
                  </td>
                </tr>
              ) : recruiters.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No recruiters found matching query.
                  </td>
                </tr>
              ) : (
                recruiters.map((r) => (
                  <tr key={r._id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center">
                          {r.name ? r.name[0].toUpperCase() : 'R'}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 flex items-center gap-1">
                            {r.name}
                            {r.verified && (
                              <span title="Verified Recruiter">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600 inline" />
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400">{r.jobTitle}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-medium text-slate-800">
                      <div className="flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-slate-400" />
                        <span>{r.company}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-slate-600">
                      <div className="flex items-center gap-1 text-slate-800">
                        <Mail className="w-3 h-3 text-slate-400" />
                        <span>{r.email}</span>
                      </div>
                      {r.phone && (
                        <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{r.phone}</span>
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4">{getStatusBadge(r.status)}</td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => navigate('/outreach', { state: { recruiterId: r._id, recruiterEmail: r.email } })}
                        className="inline-flex items-center px-2.5 py-1 text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-md transition"
                      >
                        <Send className="w-3 h-3 mr-1" />
                        Outreach
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Recruiter Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 className="text-base font-bold text-slate-900">Add New Recruiter</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRecruiter} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Recruiter Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Jessica Vance"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="jessica@apexstaffing.com"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Company *</label>
                  <input
                    type="text"
                    required
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    placeholder="Apex Staffing"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Job Title</label>
                  <input
                    type="text"
                    value={formData.jobTitle}
                    onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                    placeholder="Lead IT Recruiter"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1 (555) 019-2834"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">LinkedIn Profile URL</label>
                <input
                  type="text"
                  value={formData.linkedinUrl}
                  onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
                  placeholder="https://linkedin.com/in/..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Specialization</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Focuses on C2C cloud architecture roles..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm"
                >
                  Save Recruiter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
