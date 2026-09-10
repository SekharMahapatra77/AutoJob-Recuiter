import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { BarChart3, TrendingUp, ThumbsUp, Target, Code, MapPin } from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  const [metrics, setMetrics] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const [metricsRes, analyticsRes] = await Promise.all([
          api.get('/analytics/metrics'),
          api.get('/analytics/detailed')
        ]);
        if (metricsRes.data.success) setMetrics(metricsRes.data.data);
        if (analyticsRes.data.success) setAnalytics(analyticsRes.data.data);
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) {
    return <div className="py-12 text-center text-xs text-slate-400">Loading platform analytics...</div>;
  }

  const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#64748b'];

  return (
    <div className="space-y-6">
      <div className="pb-2 border-b border-slate-200">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-blue-600" />
          Recruitment Outreach Analytics & Reporting
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Real-time metrics, conversion velocity, technology demand distributions, and candidate placement signals.
        </p>
      </div>

      {/* Top Metrics KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase">Total Opportunities</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{metrics?.totalJobs}</div>
          <div className="text-[11px] text-blue-600 font-medium mt-0.5">
            {metrics?.qualifiedC2CJobs} Qualified C2C
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase">Staffing Recruiters</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{metrics?.totalRecruiters}</div>
          <div className="text-[11px] text-slate-500 font-medium mt-0.5">Verified Contacts</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase">Emails Dispatched</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{metrics?.emailsSent}</div>
          <div className="text-[11px] text-purple-600 font-medium mt-0.5">
            {metrics?.replyRate}% Reply Rate
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase">Positive Placement Leads</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{metrics?.positiveRepliesCount}</div>
          <div className="text-[11px] text-emerald-700 font-medium mt-0.5">
            {metrics?.positiveRate}% Positive Conversion
          </div>
        </div>
      </div>

      {/* Charts Row 1: Outreach Trend & Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 mb-1">Daily Outreach Volume & Response Trend</h2>
          <p className="text-xs text-slate-500 mb-4">Volume of sent proposals vs inbound responses</p>
          <div className="h-64">
            {analytics?.outreachTrend && analytics.outreachTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.outreachTrend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="_id" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                  />
                  <Area type="monotone" dataKey="sent" stroke="#2563eb" fill="#3b82f6" fillOpacity={0.2} name="Emails Sent" />
                  <Area type="monotone" dataKey="replied" stroke="#10b981" fill="#10b981" fillOpacity={0.2} name="Replies" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-slate-400">
                Outreach data will populate as campaigns execute.
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 mb-1">Recruitment Campaign Funnel</h2>
          <p className="text-xs text-slate-500 mb-4">Pipeline transition from leads to interviews</p>
          <div className="h-64">
            {analytics?.funnel ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.funnel}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="stage" tick={{ fontSize: 10, fill: '#475569' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {analytics.funnel.map((_: any, idx: number) => (
                      <Cell key={idx} fill={['#64748b', '#3b82f6', '#8b5cf6', '#10b981'][idx % 4]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        </div>
      </div>

      {/* Charts Row 2: In-Demand Technologies & Job Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Technology In-Demand Distribution */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-1.5">
            <Code className="w-4 h-4 text-blue-600" />
            Most In-Demand Skills in USA C2C Jobs
          </h2>
          <p className="text-xs text-slate-500 mb-4">Frequency of required tech skills across active postings</p>
          <div className="h-64">
            {analytics?.techDistribution && analytics.techDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.techDistribution} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                  <YAxis type="category" dataKey="_id" tick={{ fontSize: 11, fill: '#334155' }} width={90} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-slate-400">
                No skill metrics available.
              </div>
            )}
          </div>
        </div>

        {/* Reply Intent Distribution */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 mb-1">Recruiter Response Categorization</h2>
          <p className="text-xs text-slate-500 mb-4">Breakdown of inbound emails classified by AI</p>
          <div className="h-64">
            {analytics?.replyCategories && analytics.replyCategories.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.replyCategories}
                    dataKey="count"
                    nameKey="_id"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {analytics.replyCategories.map((_: any, idx: number) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-slate-400">
                No replies recorded yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
