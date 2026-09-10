import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Job, Recruiter } from '../types';
import {
  Search,
  Filter,
  Plus,
  Briefcase,
  MapPin,
  Building,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ExternalLink,
  Sparkles,
  ArrowRight,
  FileSpreadsheet,
  X
} from 'lucide-react';

export const JobsPage: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [recruiters, setRecruiters] = useState<Recruiter[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();

  // Filters state
  const [keyword, setKeyword] = useState('');
  const [location, setLocation] = useState('');
  const [usaOnly, setUsaOnly] = useState(true);
  const [c2cStatus, setC2cStatus] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [technology, setTechnology] = useState('');

  // New Job Form state
  const [formData, setFormData] = useState({
    title: '',
    company: '',
    location: 'United States',
    description: '',
    skills: '',
    employmentType: 'C2C',
    source: 'LINKEDIN',
    sourceUrl: '',
    recruiterId: '',
    salary: '',
    c2cStatus: 'UNKNOWN'
  });

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {};
      if (keyword.trim()) params.keyword = keyword.trim();
      if (location.trim()) params.location = location.trim();
      if (usaOnly) params.isUSA = true;
      if (c2cStatus !== 'ALL') params.c2cStatus = c2cStatus;
      if (status !== 'ALL') params.status = status;
      if (technology.trim()) params.technology = technology.trim();

      const res = await api.get('/jobs', { params });
      if (res.data.success) {
        setJobs(res.data.data.jobs);
      }
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [usaOnly, c2cStatus, status]);

  useEffect(() => {
    const loadRecruiters = async () => {
      try {
        const res = await api.get('/recruiters?limit=100');
        if (res.data.success) setRecruiters(res.data.data.recruiters);
      } catch (e) {}
    };
    loadRecruiters();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchJobs();
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/jobs', {
        ...formData,
        skills: formData.skills.split(',').map((s) => s.trim()).filter(Boolean)
      });
      if (res.data.success) {
        setIsModalOpen(false);
        setFormData({
          title: '',
          company: '',
          location: 'United States',
          description: '',
          skills: '',
          employmentType: 'C2C',
          source: 'LINKEDIN',
          sourceUrl: '',
          recruiterId: '',
          salary: '',
          c2cStatus: 'UNKNOWN'
        });
        fetchJobs();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error creating job opportunity.');
    }
  };

  const handleVerifyC2C = async (jobId: string, verifiedStatus: 'YES' | 'NO') => {
    try {
      await api.put(`/jobs/${jobId}`, {
        c2cStatus: verifiedStatus,
        c2cVerified: true,
        c2cVerificationSource: 'MANUAL_VERIFICATION'
      });
      fetchJobs();
      if (selectedJob && selectedJob._id === jobId) {
        setSelectedJob((prev: any) => ({ ...prev, c2cStatus: verifiedStatus, c2cVerified: true }));
      }
    } catch (e) {
      alert('Failed to update C2C status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Job Discovery & C2C Opportunities
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Identify, verify, and track USA Corp-to-Corp positions with automated qualification.
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
            Add Job Manually
          </button>
        </div>
      </div>

      {/* Filter Control Bar */}
      <form onSubmit={handleSearch} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Keyword / Title</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="e.g. Node.js Developer"
                className="w-full pl-8 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Location</label>
            <div className="relative">
              <MapPin className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Texas or Remote"
                className="w-full pl-8 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">C2C Qualification</label>
            <select
              value={c2cStatus}
              onChange={(e) => setC2cStatus(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white"
            >
              <option value="ALL">All Postings</option>
              <option value="YES">C2C Verified / Eligible (YES)</option>
              <option value="UNKNOWN">Needs Human Review (UNKNOWN)</option>
              <option value="NO">Disqualified / W2 Only (NO)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Pipeline Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white"
            >
              <option value="ALL">All Statuses</option>
              <option value="NEW">New</option>
              <option value="QUALIFIED">Qualified</option>
              <option value="OUTREACH_READY">Outreach Ready</option>
              <option value="CONTACTED">Contacted</option>
              <option value="DISQUALIFIED">Disqualified</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between pt-2 border-t border-slate-100 gap-2">
          <label className="flex items-center space-x-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={usaOnly}
              onChange={(e) => setUsaOnly(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
            />
            <span className="text-xs font-semibold text-slate-700">
              🇺🇸 USA Only (Auto-filters all non-US listings)
            </span>
          </label>

          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition"
          >
            Apply Filters
          </button>
        </div>
      </form>

      {/* Jobs List / Cards Grid */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading opportunities...</div>
      ) : jobs.length === 0 ? (
        <div className="bg-white p-8 rounded-xl border border-slate-200 text-center">
          <Briefcase className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-700">No opportunities match criteria</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Try adjusting your filters or import a new batch of LinkedIn / CSV leads.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobs.map((job) => {
            const isC2C = job.c2cStatus === 'YES';
            const isUnknown = job.c2cStatus === 'UNKNOWN';

            return (
              <div
                key={job._id}
                className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {job.source}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 line-clamp-1">{job.title}</h3>
                    </div>
                    {/* C2C Badge */}
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        isC2C
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : isUnknown
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      {isC2C ? 'C2C: YES' : isUnknown ? 'C2C: UNKNOWN' : 'NO C2C'}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs text-slate-600 mb-3">
                    <div className="flex items-center text-slate-700 font-medium">
                      <Building className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                      <span>{job.company}</span>
                    </div>
                    <div className="flex items-center text-slate-500">
                      <MapPin className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                      <span>{job.location}</span>
                      {job.isUSA && (
                        <span className="ml-1 text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded">
                          USA
                        </span>
                      )}
                    </div>
                    {job.salary && (
                      <div className="text-[11px] font-semibold text-slate-700">{job.salary}</div>
                    )}
                  </div>

                  {/* Skills tags */}
                  <div className="flex flex-wrap gap-1 mb-4">
                    {job.skills.slice(0, 4).map((skill, sIdx) => (
                      <span
                        key={sIdx}
                        className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium"
                      >
                        {skill}
                      </span>
                    ))}
                    {job.skills.length > 4 && (
                      <span className="px-1.5 py-0.5 text-slate-400 text-[10px]">
                        +{job.skills.length - 4}
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => setSelectedJob(job)}
                    className="text-xs font-semibold text-slate-600 hover:text-blue-600"
                  >
                    View Details
                  </button>

                  <button
                    onClick={() => navigate('/ai-matcher', { state: { jobId: job._id } })}
                    className="inline-flex items-center px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition"
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1" />
                    AI Match
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Manual Job Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 className="text-base font-bold text-slate-900">Add USA C2C Job Opportunity</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateJob} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Job Title *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Senior Node.js Engineer"
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Location *</label>
                  <input
                    type="text"
                    required
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Dallas, TX or Remote US"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Rate / Salary</label>
                  <input
                    type="text"
                    value={formData.salary}
                    onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                    placeholder="$85 - $95 / hr C2C"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Key Skills (Comma separated)</label>
                <input
                  type="text"
                  value={formData.skills}
                  onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                  placeholder="Node.js, TypeScript, AWS, MongoDB"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Lead Source</label>
                  <select
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white"
                  >
                    <option value="LINKEDIN">LinkedIn (Manual Import)</option>
                    <option value="MANUAL">Direct Recruiter Outreach</option>
                    <option value="CSV">CSV Upload</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Link to Recruiter (Optional)</label>
                  <select
                    value={formData.recruiterId}
                    onChange={(e) => setFormData({ ...formData, recruiterId: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white"
                  >
                    <option value="">None / Unassigned</option>
                    {recruiters.map((r) => (
                      <option key={r._id} value={r._id}>
                        {r.name} ({r.company})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Source URL</label>
                <input
                  type="text"
                  value={formData.sourceUrl}
                  onChange={(e) => setFormData({ ...formData, sourceUrl: e.target.value })}
                  placeholder="https://www.linkedin.com/jobs/view/..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Job Description</label>
                <textarea
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Paste job description here. Our automated engine will inspect for C2C & USA eligibility terms..."
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
                  Save Opportunity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Drawer Modal */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                  Job Details & Qualification
                </span>
                <h2 className="text-lg font-bold text-slate-900">{selectedJob.title}</h2>
                <div className="flex items-center gap-2 mt-1 text-xs text-slate-600">
                  <span className="font-semibold text-slate-800">{selectedJob.company}</span>
                  <span>•</span>
                  <span>{selectedJob.location}</span>
                </div>
              </div>
              <button onClick={() => setSelectedJob(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* C2C Verification Banner */}
            <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-900">
                  C2C Status: {selectedJob.c2cStatus}
                </div>
                <div className="text-[11px] text-slate-500">
                  Source: {selectedJob.c2cVerificationSource} • USA Verified:{' '}
                  {selectedJob.isUSA ? 'Yes' : 'No'}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleVerifyC2C(selectedJob._id, 'YES')}
                  className="px-2.5 py-1 text-xs font-semibold bg-emerald-600 text-white rounded hover:bg-emerald-700"
                >
                  Confirm C2C
                </button>
                <button
                  onClick={() => handleVerifyC2C(selectedJob._id, 'NO')}
                  className="px-2.5 py-1 text-xs font-semibold bg-rose-600 text-white rounded hover:bg-rose-700"
                >
                  Mark W2 Only
                </button>
              </div>
            </div>

            <div className="mt-4 space-y-4 text-xs text-slate-700">
              <div>
                <h4 className="font-bold text-slate-900 uppercase text-[11px] mb-1">Required Skills</h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedJob.skills.map((s, i) => (
                    <span key={i} className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-medium">
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 uppercase text-[11px] mb-1">Job Description</h4>
                <div className="p-3 bg-slate-50 rounded-lg text-slate-700 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                  {selectedJob.description || 'No description provided.'}
                </div>
              </div>

              {selectedJob.sourceUrl && (
                <div className="pt-2">
                  <a
                    href={selectedJob.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-blue-600 hover:text-blue-700 font-semibold"
                  >
                    <span>View original posting</span>
                    <ExternalLink className="w-3.5 h-3.5 ml-1" />
                  </a>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end space-x-2">
              <button
                onClick={() => setSelectedJob(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700"
              >
                Close
              </button>
              <button
                onClick={() => {
                  navigate('/ai-matcher', { state: { jobId: selectedJob._id } });
                  setSelectedJob(null);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Open in AI Resume Matcher</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
