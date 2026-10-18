import React, { useEffect, useState } from 'react';
import { Search, Check, X, Clock, Eye } from 'lucide-react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Tabs from '../../components/ui/Tabs';
import Modal from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import Avatar from '../../components/ui/Avatar';
import api from '../../lib/api';
import { Link } from 'react-router-dom';

export default function Approvals() {
  const [activeTab, setActiveTab] = useState('quizzes');
  const [status, setStatus] = useState('pending');
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showApprove, setShowApprove] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const { addToast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      const endpoint = activeTab === 'quizzes' ? '/quizzes' : '/polls';
      const res = await api.get(endpoint, { params: { status, page, limit: 20, search: search || undefined } });
      const data = activeTab === 'quizzes' ? res.data.data.quizzes : res.data.data.polls;
      setItems(data);
      setTotal(res.data.data.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [activeTab, status, page]);
  useEffect(() => {
    const t = setTimeout(() => { if (page === 1) fetchData(); else setPage(1); }, 500);
    return () => clearTimeout(t);
  }, [search]);

  const handleReview = async (approve) => {
    try {
      const endpoint = activeTab === 'quizzes' ? `/quizzes/${selected._id}/review` : `/polls/${selected._id}/review`;
      await api.post(endpoint, { status: approve ? 'approved' : 'rejected', rejectionReason: rejectReason });
      addToast(`Content ${approve ? 'approved' : 'rejected'}`, 'success');
      setShowApprove(false);
      setShowReject(false);
      setRejectReason('');
      fetchData();
    } catch (e) {
      addToast(e.response?.data?.message || 'Action failed', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Content Approvals</h1>
        <p className="text-[14px] text-textSecondary mt-1">Review quizzes and polls submitted by users. Inspired by Growth Circle review queue.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <Tabs tabs={[{ value: 'quizzes', label: 'Quizzes' }, { value: 'polls', label: 'Polls' }]} activeTab={activeTab} onChange={setActiveTab} />
        <Tabs tabs={[{ value: 'pending', label: 'Pending' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }, { value: 'all', label: 'All' }]} activeTab={status} onChange={setStatus} />
      </div>

      <Card padding={false} className="p-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textSecondary" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={`Search ${activeTab}...`} className="w-full h-10 pl-10 pr-3 rounded-lg border border-border bg-surface text-[14px] focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <span className="text-[13px] text-textSecondary flex items-center">{total} items</span>
        </div>
      </Card>

      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-appBg border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left text-[12px] font-medium text-textSecondary uppercase">Member</th>
                <th className="px-4 py-3 text-left text-[12px] font-medium text-textSecondary uppercase">Content</th>
                <th className="px-4 py-3 text-left text-[12px] font-medium text-textSecondary uppercase">Submitted</th>
                <th className="px-4 py-3 text-left text-[12px] font-medium text-textSecondary uppercase">Status</th>
                <th className="px-4 py-3 text-left text-[12px] font-medium text-textSecondary uppercase">Score</th>
                <th className="px-4 py-3 text-left text-[12px] font-medium text-textSecondary uppercase">Review</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-textSecondary">Loading...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6} className="p-12 text-center text-textSecondary">No {activeTab} found for status "{status}"</td></tr>
              ) : items.map(item => (
                <tr key={item._id} className="hover:bg-appBg/50">
                  <td className="px-4 py-3"><div className="flex items-center gap-2"><Avatar name={item.author?.username} src={item.author?.avatar} size="sm" /><div><p className="text-[13px] font-medium">{item.author?.username}</p><p className="text-[11px] text-textSecondary">{item.author?.points || 0} pts</p></div></div></td>
                  <td className="px-4 py-3"><p className="text-[13px] font-medium line-clamp-1 max-w-[240px]">{item.title || item.question}</p><p className="text-[11px] text-textSecondary">{item.category} • {item.difficulty || ''}</p></td>
                  <td className="px-4 py-3 text-[12px] text-textSecondary">{new Date(item.createdAt).toLocaleDateString()}<br /><span className="text-[11px]">{new Date(item.createdAt).toLocaleTimeString()}</span></td>
                  <td className="px-4 py-3"><Badge variant={item.status === 'pending' ? 'warning' : item.status === 'approved' ? 'success' : 'error'}>{item.status}</Badge></td>
                  <td className="px-4 py-3 text-[13px]">{item.avgRating ? `${item.avgRating.toFixed(1)}★` : item.totalVotes ? `${item.totalVotes} votes` : '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Link to={activeTab === 'quizzes' ? `/quizzes/${item._id}` : `/polls/${item._id}`}><Button variant="secondary" size="sm"><Eye className="w-3.5 h-3.5" /></Button></Link>
                      {item.status === 'pending' && (
                        <>
                          <Button size="sm" variant="success" onClick={() => { setSelected(item); setShowApprove(true); }}><Check className="w-3.5 h-3.5" /></Button>
                          <Button size="sm" variant="danger" onClick={() => { setSelected(item); setShowReject(true); }}><X className="w-3.5 h-3.5" /></Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal isOpen={showApprove} onClose={() => setShowApprove(false)} title="Approve Content" footer={<><Button variant="secondary" onClick={() => setShowApprove(false)}>Cancel</Button><Button variant="success" onClick={() => handleReview(true)}>Approve</Button></>}>
        <p className="text-[14px]">Are you sure you want to approve <strong>{selected?.title || selected?.question}</strong>? It will become visible to all users.</p>
      </Modal>

      <Modal isOpen={showReject} onClose={() => setShowReject(false)} title="Reject Content" footer={<><Button variant="secondary" onClick={() => setShowReject(false)}>Cancel</Button><Button variant="danger" onClick={() => handleReview(false)}>Reject</Button></>}>
        <div className="space-y-3">
          <p className="text-[14px]">Rejecting <strong>{selected?.title || selected?.question}</strong>. Provide a reason:</p>
          <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3} className="w-full rounded-lg border border-border p-3 text-[14px]" placeholder="Reason for rejection..." />
        </div>
      </Modal>
    </div>
  );
}
