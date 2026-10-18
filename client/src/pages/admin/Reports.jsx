import React, { useEffect, useState } from 'react';
import { Flag, Search } from 'lucide-react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Select from '../../components/ui/Select';
import Tabs from '../../components/ui/Tabs';
import { useToast } from '../../components/ui/Toast';
import api from '../../lib/api';

export default function AdminReports() {
  const [reports, setReports] = useState([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('pending');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showReview, setShowReview] = useState(false);
  const [reviewStatus, setReviewStatus] = useState('resolved');
  const [notes, setNotes] = useState('');
  const { addToast } = useToast();

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/reports', { params: { status, page, limit: 20 } });
      setReports(res.data.data.reports);
      setTotal(res.data.data.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReports(); }, [status, page]);

  const handleReview = async () => {
    try {
      await api.put(`/admin/reports/${selected._id}`, { status: reviewStatus, reviewNotes: notes });
      addToast('Report reviewed', 'success');
      setShowReview(false);
      fetchReports();
    } catch (e) {
      addToast('Failed', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Reports & Moderation</h1>
        <p className="text-[14px] text-textSecondary mt-1">Handle user reports and content moderation.</p>
      </div>

      <Tabs tabs={[{ value: 'pending', label: 'Pending' }, { value: 'reviewed', label: 'Reviewed' }, { value: 'resolved', label: 'Resolved' }, { value: 'dismissed', label: 'Dismissed' }, { value: 'all', label: 'All' }]} activeTab={status} onChange={setStatus} />

      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-appBg border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left text-[12px] font-medium text-textSecondary uppercase">Reporter</th>
                <th className="px-4 py-3 text-left text-[12px] font-medium text-textSecondary uppercase">Target</th>
                <th className="px-4 py-3 text-left text-[12px] font-medium text-textSecondary uppercase">Reason</th>
                <th className="px-4 py-3 text-left text-[12px] font-medium text-textSecondary uppercase">Description</th>
                <th className="px-4 py-3 text-left text-[12px] font-medium text-textSecondary uppercase">Status</th>
                <th className="px-4 py-3 text-left text-[12px] font-medium text-textSecondary uppercase">Date</th>
                <th className="px-4 py-3 text-left text-[12px] font-medium text-textSecondary uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? <tr><td colSpan={7} className="p-8 text-center">Loading...</td></tr> : reports.length === 0 ? <tr><td colSpan={7} className="p-12 text-center text-textSecondary">No reports</td></tr> : reports.map(r => (
                <tr key={r._id} className="hover:bg-appBg/50">
                  <td className="px-4 py-3 text-[13px]">{r.reporter?.username}</td>
                  <td className="px-4 py-3"><Badge variant="default">{r.targetType}</Badge><p className="text-[11px] text-textSecondary mt-1">{r.targetId?.toString().slice(-6)}</p></td>
                  <td className="px-4 py-3"><Badge variant={r.reason === 'spam' ? 'warning' : r.reason === 'inappropriate' ? 'error' : 'default'}>{r.reason}</Badge></td>
                  <td className="px-4 py-3 text-[13px] max-w-[200px] truncate">{r.description}</td>
                  <td className="px-4 py-3"><Badge variant={r.status === 'pending' ? 'warning' : r.status === 'resolved' ? 'success' : 'default'}>{r.status}</Badge></td>
                  <td className="px-4 py-3 text-[12px] text-textSecondary">{new Date(r.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3"><Button size="sm" variant="secondary" onClick={() => { setSelected(r); setShowReview(true); }}>Review</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal isOpen={showReview} onClose={() => setShowReview(false)} title="Review Report" footer={<><Button variant="secondary" onClick={() => setShowReview(false)}>Cancel</Button><Button onClick={handleReview}>Update</Button></>}>
        {selected && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-appBg border border-border text-[13px]"><p><strong>Reporter:</strong> {selected.reporter?.username}</p><p><strong>Reason:</strong> {selected.reason}</p><p className="mt-2">{selected.description}</p></div>
            <Select label="New Status" options={[{ value: 'reviewed', label: 'Reviewed' }, { value: 'resolved', label: 'Resolved' }, { value: 'dismissed', label: 'Dismissed' }]} value={reviewStatus} onChange={setReviewStatus} />
            <div><label className="text-[13px] font-medium">Review Notes</label><textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-border p-3 text-[14px]" placeholder="Add notes..." /></div>
          </div>
        )}
      </Modal>
    </div>
  );
}
