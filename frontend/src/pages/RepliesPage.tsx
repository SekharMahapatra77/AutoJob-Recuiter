import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Reply, Recruiter } from '../types';
import {
  Inbox,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Calendar,
  ThumbsUp,
  ThumbsDown,
  Clock,
  RefreshCw,
  Plus,
  Send,
  X
} from 'lucide-react';

export const RepliesPage: React.FC = () => {
  const [replies, setReplies] = useState<Reply[]>([]);
  const [recruiters, setRecruiters] = useState<Recruiter[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReply, setSelectedReply] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Simulation Modal
  const [isSimModalOpen, setIsSimModalOpen] = useState(false);
  const [simForm, setSimForm] = useState({
    senderEmail: '',
    subject: 'Re: C2C Senior Consultant',
    body: 'Hi Alex, your background in Node.js and AWS looks like a great fit for our client. What is your expected hourly C2C rate and availability for an interview this week?'
  });
  const [simulating, setSimulating] = useState(false);

  const fetchReplies = async () => {
    setLoading(true);
    try {
      const res = await api.get('/replies');
      if (res.data.success) {
        setReplies(res.data.data.replies);
      }
    } catch (err) {
      console.error('Failed to load replies:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReplies();

    const loadRecruiters = async () => {
      try {
        const res = await api.get('/recruiters?limit=100');
        if (res.data.success) {
          const rList = res.data.data.recruiters;
          setRecruiters(rList);
          if (rList.length > 0) {
            setSimForm((prev) => ({ ...prev, senderEmail: rList[0].email }));
          }
        }
      } catch (e) {}
    };
    loadRecruiters();
  }, []);

  const handleOpenDetail = async (replyId: string) => {
    setDetailLoading(true);
    try {
      const res = await api.get(`/replies/${replyId}`);
      if (res.data.success) {
        setSelectedReply(res.data.data);
      }
    } catch (e) {
      alert('Failed to load reply details');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleUpdateCategory = async (replyId: string, category: string) => {
    try {
      await api.put(`/replies/${replyId}/category`, { category });
      fetchReplies();
      if (selectedReply?.reply?._id === replyId) {
        setSelectedReply((prev: any) => ({
          ...prev,
          reply: { ...prev.reply, category }
        }));
      }
    } catch (e) {
      alert('Failed to update category');
    }
  };

  const handleSimulateReply = async (e: React.FormEvent) => {
    e.preventDefault();
    setSimulating(true);
    try {
      const res = await api.post('/replies/simulate', simForm);
      if (res.data.success) {
        alert(`Reply simulated! Automatically classified as: [${res.data.data.category}] with ${Math.round(res.data.data.confidence * 100)}% confidence.`);
        setIsSimModalOpen(false);
        fetchReplies();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error simulating reply.');
    } finally {
      setSimulating(false);
    }
  };

  const getCategoryBadge = (category: string) => {
    const map: Record<string, { bg: string; text: string }> = {
      INTERESTED: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' },
      INTERVIEW: { bg: 'bg-purple-50 border-purple-200', text: 'text-purple-700' },
      REQUEST_FOR_INFORMATION: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700' },
      OUT_OF_OFFICE: { bg: 'bg-slate-100 border-slate-200', text: 'text-slate-600' },
      NOT_INTERESTED: { bg: 'bg-rose-50 border-rose-200', text: 'text-rose-700' },
      UNKNOWN: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700' }
    };
    const c = map[category] || { bg: 'bg-slate-50 border-slate-200', text: 'text-slate-600' };
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${c.bg} ${c.text}`}>
        {category}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Incoming Replies & Intent Classification
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            IMAP email ingestion, AI sentiment & intent categorizer, and automatic follow-up stop trigger.
          </p>
        </div>
        <div className="mt-3 sm:mt-0 flex items-center space-x-2">
          <button
            onClick={() => setIsSimModalOpen(true)}
            className="inline-flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Simulate Inbound Reply
          </button>
        </div>
      </div>

      {/* Replies Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Recruiter / Sender</th>
                <th className="py-3 px-4">Company</th>
                <th className="py-3 px-4">Subject & Snippet</th>
                <th className="py-3 px-4">Received</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Confidence</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Loading inbox replies...
                  </td>
                </tr>
              ) : replies.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No incoming replies received yet. You can click "Simulate Inbound Reply" to test the classification engine.
                  </td>
                </tr>
              ) : (
                replies.map((rep) => (
                  <tr key={rep._id} className="hover:bg-slate-50/80 transition cursor-pointer" onClick={() => handleOpenDetail(rep._id)}>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">
                        {rep.recruiterId?.name || rep.sender}
                      </div>
                      <div className="text-[11px] text-slate-400">{rep.sender}</div>
                    </td>

                    <td className="py-3 px-4 font-medium text-slate-800">
                      {rep.recruiterId?.company || 'Staffing Firm'}
                    </td>

                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-semibold text-slate-800 truncate">{rep.subject}</div>
                      <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{rep.body}</div>
                    </td>

                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {new Date(rep.receivedAt).toLocaleDateString()}
                    </td>

                    <td className="py-3 px-4">{getCategoryBadge(rep.category)}</td>

                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-700">
                        {Math.round((rep.confidence || 0.8) * 100)}%
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleOpenDetail(rep._id)}
                        className="px-2.5 py-1 text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 rounded"
                      >
                        View Thread
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedReply && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                  Incoming Message Details
                </span>
                <h2 className="text-base font-bold text-slate-900">{selectedReply.reply.subject}</h2>
                <div className="text-xs text-slate-500 mt-0.5">
                  From: <span className="font-semibold text-slate-700">{selectedReply.reply.sender}</span>
                </div>
              </div>
              <button onClick={() => setSelectedReply(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Classification Card */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between mb-4">
              <div>
                <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <span>AI Classified As:</span>
                  {getCategoryBadge(selectedReply.reply.category)}
                  <span className="text-[11px] text-slate-500 font-normal">
                    ({Math.round(selectedReply.reply.confidence * 100)}% Confidence)
                  </span>
                </div>
                {selectedReply.reply.notes && (
                  <div className="text-[11px] text-slate-500 mt-1">{selectedReply.reply.notes}</div>
                )}
              </div>

              {/* Manual Override Dropdown */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleUpdateCategory(selectedReply.reply._id, 'INTERESTED')}
                  className="px-2 py-1 bg-emerald-100 text-emerald-800 text-[11px] font-semibold rounded hover:bg-emerald-200"
                >
                  Mark Interested
                </button>
                <button
                  onClick={() => handleUpdateCategory(selectedReply.reply._id, 'NOT_INTERESTED')}
                  className="px-2 py-1 bg-rose-100 text-rose-800 text-[11px] font-semibold rounded hover:bg-rose-200"
                >
                  Mark Not Interested
                </button>
              </div>
            </div>

            {/* Full Message Body */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Message Content
              </h4>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                {selectedReply.reply.body}
              </div>
            </div>

            {/* Related Job / Campaign info */}
            {selectedReply.reply.outreachId && (
              <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-600 space-y-1">
                <div className="font-bold text-slate-800 text-[11px] uppercase">Original Context</div>
                {selectedReply.reply.outreachId.jobId && (
                  <div>
                    Job: <span className="font-semibold text-slate-700">{selectedReply.reply.outreachId.jobId.title}</span> ({selectedReply.reply.outreachId.jobId.company})
                  </div>
                )}
                {selectedReply.reply.outreachId.campaignId && (
                  <div>
                    Campaign: <span className="font-semibold text-slate-700">{selectedReply.reply.outreachId.campaignId.name}</span>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedReply(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Simulate Modal */}
      {isSimModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 className="text-base font-bold text-slate-900">Simulate Inbound Recruiter Email</h2>
              <button onClick={() => setIsSimModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSimulateReply} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Sender Recruiter Email *</label>
                <select
                  required
                  value={simForm.senderEmail}
                  onChange={(e) => setSimForm({ ...simForm, senderEmail: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white"
                >
                  {recruiters.map((r) => (
                    <option key={r._id} value={r.email}>
                      {r.name} ({r.email}) - {r.company}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Subject</label>
                <input
                  type="text"
                  required
                  value={simForm.subject}
                  onChange={(e) => setSimForm({ ...simForm, subject: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Body *</label>
                <textarea
                  rows={5}
                  required
                  value={simForm.body}
                  onChange={(e) => setSimForm({ ...simForm, body: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none font-sans leading-relaxed"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsSimModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={simulating}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm"
                >
                  {simulating ? 'Processing...' : 'Simulate Inbound Email'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
