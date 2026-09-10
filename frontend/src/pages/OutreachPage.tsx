import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../services/api';
import { Outreach, Recruiter, Job, Resume } from '../types';
import {
  Send,
  Plus,
  Mail,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Briefcase,
  User,
  Paperclip,
  X
} from 'lucide-react';

export const OutreachPage: React.FC = () => {
  const location = useLocation();

  const [outreachList, setOutreachList] = useState<Outreach[]>([]);
  const [recruiters, setRecruiters] = useState<Recruiter[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);

  // Compose Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    recruiterId: '',
    jobId: '',
    recipientEmail: '',
    subject: '',
    body: '',
    attachmentId: ''
  });

  const [duplicateCheck, setDuplicateCheck] = useState<any>(null);
  const [checkingDup, setCheckingDup] = useState(false);
  const [sending, setSending] = useState(false);

  const fetchOutreach = async () => {
    setLoading(true);
    try {
      const res = await api.get('/outreach');
      if (res.data.success) {
        setOutreachList(res.data.data.outreachList);
      }
    } catch (err) {
      console.error('Failed to load outreach records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOutreach();

    const loadDropdowns = async () => {
      try {
        const [recRes, jobsRes, resumesRes] = await Promise.all([
          api.get('/recruiters?limit=100'),
          api.get('/jobs?limit=100'),
          api.get('/resumes')
        ]);
        if (recRes.data.success) setRecruiters(recRes.data.data.recruiters);
        if (jobsRes.data.success) setJobs(jobsRes.data.data.jobs);
        if (resumesRes.data.success) {
          const resList: Resume[] = resumesRes.data.data;
          setResumes(resList);
          const primary = resList.find((r) => r.isPrimary) || resList[0];
          if (primary) {
            setFormData((prev) => ({ ...prev, attachmentId: primary._id }));
          }
        }
      } catch (e) {}
    };
    loadDropdowns();
  }, []);

  // Check state from navigation
  useEffect(() => {
    const st = location.state as any;
    if (st?.recruiterId) {
      setFormData((prev) => ({
        ...prev,
        recruiterId: st.recruiterId,
        recipientEmail: st.recruiterEmail || ''
      }));
      setIsModalOpen(true);
    }
  }, [location.state]);

  const handleRecruiterChange = (rId: string) => {
    const selected = recruiters.find((r) => r._id === rId);
    setFormData((prev) => ({
      ...prev,
      recruiterId: rId,
      recipientEmail: selected?.email || ''
    }));
    runDuplicateCheck(selected?.email || '', formData.jobId);
  };

  const handleJobChange = (jId: string) => {
    const selected = jobs.find((j) => j._id === jId);
    setFormData((prev) => ({
      ...prev,
      jobId: jId,
      subject: selected ? `C2C Senior Consultant for ${selected.title}` : prev.subject
    }));
    runDuplicateCheck(formData.recipientEmail, jId);
  };

  const runDuplicateCheck = async (email: string, jobId?: string) => {
    if (!email || !email.includes('@')) {
      setDuplicateCheck(null);
      return;
    }

    setCheckingDup(true);
    try {
      const res = await api.post('/outreach/check-duplicate', {
        recipientEmail: email,
        jobId: jobId || undefined,
        recruiterId: formData.recruiterId || undefined
      });
      if (res.data.success) {
        setDuplicateCheck(res.data.data);
      }
    } catch (e) {
      // Ignore
    } finally {
      setCheckingDup(false);
    }
  };

  const handleSendOutreach = async (e: React.FormEvent) => {
    e.preventDefault();
    if (duplicateCheck?.isDuplicate) {
      alert(`Outreach blocked by duplicate prevention: ${duplicateCheck.reason}`);
      return;
    }

    setSending(true);
    try {
      const res = await api.post('/outreach/send', formData);
      if (res.data.success) {
        alert('Outreach email sent and follow-ups scheduled successfully!');
        setIsModalOpen(false);
        setFormData({
          recruiterId: '',
          jobId: '',
          recipientEmail: '',
          subject: '',
          body: '',
          attachmentId: ''
        });
        setDuplicateCheck(null);
        fetchOutreach();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error sending outreach.');
    } finally {
      setSending(false);
    }
  };

  const getStatusBadge = (st: string) => {
    const map: Record<string, { bg: string; text: string }> = {
      SENT: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700' },
      DELIVERED: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' },
      REPLIED: { bg: 'bg-purple-50 border-purple-200', text: 'text-purple-700' },
      DRAFT: { bg: 'bg-slate-100 border-slate-200', text: 'text-slate-600' },
      FAILED: { bg: 'bg-rose-50 border-rose-200', text: 'text-rose-700' }
    };
    const c = map[st] || { bg: 'bg-slate-50 border-slate-200', text: 'text-slate-600' };
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${c.bg} ${c.text}`}>
        {st}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Outreach Sequences & History
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Dispatched emails, Gmail OAuth integration, and automatic duplicate prevention.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="mt-3 sm:mt-0 inline-flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Compose Outreach
        </button>
      </div>

      {/* Outreach Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Recipient / Recruiter</th>
                <th className="py-3 px-4">Target Job</th>
                <th className="py-3 px-4">Subject & Attachment</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Follow-ups</th>
                <th className="py-3 px-4">Sent Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Loading outreach history...
                  </td>
                </tr>
              ) : outreachList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No outreach emails sent yet. Compose a new outreach above.
                  </td>
                </tr>
              ) : (
                outreachList.map((o) => (
                  <tr key={o._id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">
                        {o.recruiterId?.name || 'Recruiter'}
                      </div>
                      <div className="text-[11px] text-slate-500">{o.recipientEmail}</div>
                      <div className="text-[10px] text-slate-400">{o.recruiterId?.company}</div>
                    </td>

                    <td className="py-3 px-4">
                      {o.jobId ? (
                        <div>
                          <div className="font-semibold text-slate-800">{o.jobId.title}</div>
                          <div className="text-[10px] text-slate-400">{o.jobId.company}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Direct Contact</span>
                      )}
                    </td>

                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-medium text-slate-800 truncate">{o.subject}</div>
                      {o.attachmentId && (
                        <div className="flex items-center gap-1 text-[10px] text-blue-600 mt-0.5">
                          <Paperclip className="w-3 h-3" />
                          <span>{o.attachmentId.fileName || 'Attached Resume'}</span>
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4">{getStatusBadge(o.status)}</td>

                    <td className="py-3 px-4">
                      <div className="text-[11px] font-semibold text-slate-700">
                        Touch #{o.followUpCount}
                      </div>
                      {o.nextFollowUpAt && o.status !== 'REPLIED' && (
                        <div className="text-[10px] text-slate-400">
                          Next: {new Date(o.nextFollowUpAt).toLocaleDateString()}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {o.sentAt ? new Date(o.sentAt).toLocaleString() : 'Draft'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Compose Outreach Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 className="text-base font-bold text-slate-900">Compose C2C Outreach Email</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Duplicate Blocker Alert Banner */}
            {duplicateCheck?.isDuplicate && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-800 text-xs font-semibold flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                <div>
                  <div className="font-bold">Duplicate Outreach Blocked:</div>
                  <div className="mt-0.5 font-normal">{duplicateCheck.reason}</div>
                  <div className="mt-1 text-[11px] text-rose-600">
                    To maintain professional reputation and avoid spam penalties, sending to this recruiter for this role is strictly prevented.
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSendOutreach} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Target Recruiter *</label>
                  <select
                    required
                    value={formData.recruiterId}
                    onChange={(e) => handleRecruiterChange(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white"
                  >
                    <option value="">Select Recruiter...</option>
                    {recruiters.map((r) => (
                      <option key={r._id} value={r._id}>
                        {r.name} ({r.company})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Target Job (Optional)</label>
                  <select
                    value={formData.jobId}
                    onChange={(e) => handleJobChange(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white"
                  >
                    <option value="">Select Job...</option>
                    {jobs.map((j) => (
                      <option key={j._id} value={j._id}>
                        {j.title} @ {j.company}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Recipient Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.recipientEmail}
                    onChange={(e) => {
                      setFormData({ ...formData, recipientEmail: e.target.value });
                      runDuplicateCheck(e.target.value, formData.jobId);
                    }}
                    placeholder="recruiter@company.com"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Attach Resume</label>
                  <select
                    value={formData.attachmentId}
                    onChange={(e) => setFormData({ ...formData, attachmentId: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white"
                  >
                    <option value="">No Attachment</option>
                    {resumes.map((r) => (
                      <option key={r._id} value={r._id}>
                        {r.fileName} (v{r.version} {r.isPrimary ? '• Primary' : ''})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Subject *</label>
                <input
                  type="text"
                  required
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="C2C Senior Consultant for Senior Software Engineer - Candidate Name"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Body *</label>
                <textarea
                  rows={8}
                  required
                  value={formData.body}
                  onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                  placeholder="Hi [Recruiter Name], I noticed your open role on C2C..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none leading-relaxed font-sans"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="text-[11px] text-slate-400">
                  Sends via Gmail OAuth (or SMTP/Simulated in offline dev mode).
                </div>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={sending || duplicateCheck?.isDuplicate}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-sm disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{sending ? 'Sending...' : 'Send Outreach'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
