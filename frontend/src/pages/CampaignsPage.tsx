import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Campaign } from '../types';
import { Megaphone, Plus, Calendar, Target, CheckCircle2, TrendingUp, X } from 'lucide-react';

export const CampaignsPage: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    targetTechnology: 'Node.js',
    targetLocation: 'United States',
    c2cOnly: true,
    status: 'ACTIVE'
  });

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const res = await api.get('/campaigns');
      if (res.data.success) {
        setCampaigns(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch campaigns:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/campaigns', formData);
      if (res.data.success) {
        setIsModalOpen(false);
        setFormData({
          name: '',
          description: '',
          targetTechnology: 'Node.js',
          targetLocation: 'United States',
          c2cOnly: true,
          status: 'ACTIVE'
        });
        fetchCampaigns();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create campaign.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Outreach Campaigns
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Organize recruitment outreach initiatives, monitor funnel conversions, and track responses.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="mt-3 sm:mt-0 inline-flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Create Campaign
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading campaigns...</div>
      ) : campaigns.length === 0 ? (
        <div className="bg-white p-8 rounded-xl border border-slate-200 text-center">
          <Megaphone className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-700">No active campaigns</h3>
          <p className="text-xs text-slate-400 mt-1">
            Create your first outreach campaign to track recruiter outreach and conversion.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {campaigns.map((c) => (
            <div
              key={c._id}
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-sm font-bold text-slate-900">{c.name}</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    {c.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 line-clamp-2 mb-3">
                  {c.description || 'No description provided.'}
                </p>

                <div className="flex flex-wrap gap-2 text-[11px] text-slate-600 mb-4">
                  <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                    <Target className="w-3 h-3 text-slate-400" />
                    <span>Tech: {c.targetTechnology || 'General'}</span>
                  </div>
                  <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span>Started: {new Date(c.startDate).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Campaign Funnel Stats */}
                <div className="grid grid-cols-4 gap-2 pt-3 border-t border-slate-100 text-center">
                  <div>
                    <div className="text-base font-bold text-slate-800">{c.stats?.totalLeads || 0}</div>
                    <div className="text-[10px] text-slate-400 font-medium">Targets</div>
                  </div>
                  <div>
                    <div className="text-base font-bold text-blue-600">{c.stats?.emailsSent || 0}</div>
                    <div className="text-[10px] text-slate-400 font-medium">Sent</div>
                  </div>
                  <div>
                    <div className="text-base font-bold text-purple-600">{c.stats?.replies || 0}</div>
                    <div className="text-[10px] text-slate-400 font-medium">Replies</div>
                  </div>
                  <div>
                    <div className="text-base font-bold text-emerald-600">{c.stats?.conversionRate || 0}%</div>
                    <div className="text-[10px] text-slate-400 font-medium">Conversion</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Campaign Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 className="text-base font-bold text-slate-900">Create Outreach Campaign</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCampaign} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Campaign Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Q4 Cloud Microservices C2C Blitz"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Targeting East Coast staffing firms with open Node.js requirements..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Target Technology</label>
                  <input
                    type="text"
                    value={formData.targetTechnology}
                    onChange={(e) => setFormData({ ...formData, targetTechnology: e.target.value })}
                    placeholder="Node.js, AWS"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Target Location</label>
                  <input
                    type="text"
                    value={formData.targetLocation}
                    onChange={(e) => setFormData({ ...formData, targetLocation: e.target.value })}
                    placeholder="USA / Remote"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.c2cOnly}
                    onChange={(e) => setFormData({ ...formData, c2cOnly: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                  />
                  <span className="text-xs font-semibold text-slate-700">Strictly C2C Only</span>
                </label>
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
                  Create Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
