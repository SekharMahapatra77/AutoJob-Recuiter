import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { FollowUp } from '../types';
import { Clock, Play, CheckCircle2, XCircle, AlertCircle, RefreshCw } from 'lucide-react';

export const FollowUpsPage: React.FC = () => {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [runMessage, setRunMessage] = useState('');

  const fetchFollowUps = async () => {
    setLoading(true);
    try {
      const res = await api.get('/followups');
      if (res.data.success) {
        setFollowUps(res.data.data.followUps);
      }
    } catch (err) {
      console.error('Failed to load follow-ups:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFollowUps();
  }, []);

  const handleTriggerProcessDue = async () => {
    setRunning(true);
    setRunMessage('');
    try {
      const res = await api.post('/followups/process-due');
      if (res.data.success) {
        setRunMessage(res.data.message);
        fetchFollowUps();
      }
    } catch (e: any) {
      alert(e.response?.data?.message || 'Error processing follow-ups.');
    } finally {
      setRunning(false);
    }
  };

  const getStatusBadge = (st: string) => {
    const map: Record<string, { bg: string; text: string }> = {
      PENDING: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700' },
      SENT: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' },
      CANCELLED: { bg: 'bg-rose-50 border-rose-200', text: 'text-rose-700' },
      SKIPPED: { bg: 'bg-slate-100 border-slate-200', text: 'text-slate-600' }
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
            Follow-up Queue & Automation
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Automatic 3-day and 7-day touch schedules with guaranteed auto-stop upon recruiter reply.
          </p>
        </div>
        <button
          onClick={handleTriggerProcessDue}
          disabled={running}
          className="mt-3 sm:mt-0 inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50"
        >
          {running ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              Processing Due Touches...
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 mr-1.5" />
              Process Due Follow-ups Now
            </>
          )}
        </button>
      </div>

      {runMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{runMessage}</span>
        </div>
      )}

      {/* Rules Legend Card */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <span className="font-semibold text-slate-800">Automated Follow-up Rule Set:</span>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1 text-slate-600">
            <span className="w-2 h-2 rounded-full bg-blue-500" /> Touch #1: +3 Days
          </span>
          <span className="flex items-center gap-1 text-slate-600">
            <span className="w-2 h-2 rounded-full bg-indigo-500" /> Touch #2: +7 Days
          </span>
          <span className="flex items-center gap-1 text-rose-600 font-semibold">
            <span className="w-2 h-2 rounded-full bg-rose-500" /> Auto-Stops on Reply or Opt-Out
          </span>
        </div>
      </div>

      {/* Queue Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Recruiter / Company</th>
                <th className="py-3 px-4">Touch #</th>
                <th className="py-3 px-4">Subject & Message</th>
                <th className="py-3 px-4">Scheduled Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Notes / Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Loading follow-up queue...
                  </td>
                </tr>
              ) : followUps.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No follow-ups currently scheduled. Send an outreach to automatically schedule touches.
                  </td>
                </tr>
              ) : (
                followUps.map((f) => (
                  <tr key={f._id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">
                        {f.recruiterId?.name || 'Recruiter'}
                      </div>
                      <div className="text-[11px] text-slate-400">{f.recruiterId?.company}</div>
                      <div className="text-[10px] text-slate-400">{f.recruiterId?.email}</div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        #{f.sequenceNumber}
                      </span>
                    </td>

                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-semibold text-slate-800 truncate">{f.subject}</div>
                      <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{f.body}</div>
                    </td>

                    <td className="py-3 px-4 text-slate-700 font-medium">
                      {new Date(f.scheduledDate).toLocaleDateString()}
                    </td>

                    <td className="py-3 px-4">{getStatusBadge(f.status)}</td>

                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {f.notes || (f.sentAt ? `Dispatched on ${new Date(f.sentAt).toLocaleDateString()}` : 'Awaiting scheduled date')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
