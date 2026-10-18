import React, { useEffect, useState } from 'react';
import { Search, MoreHorizontal, Shield, Ban, CheckCircle } from 'lucide-react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Avatar from '../../components/ui/Avatar';
import Modal from '../../components/ui/Modal';
import Select from '../../components/ui/Select';
import { useToast } from '../../components/ui/Toast';
import api from '../../lib/api';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({ role: 'user', isActive: true, points: 0, qcoins: 0 });
  const { addToast } = useToast();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/users', { params: { page, limit: 20, search: search || undefined, role: role !== 'all' ? role : undefined } });
      setUsers(res.data.data.users);
      setTotal(res.data.data.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, [page, role]);
  useEffect(() => {
    const t = setTimeout(() => { if (page === 1) fetchUsers(); else setPage(1); }, 500);
    return () => clearTimeout(t);
  }, [search]);

  const handleEdit = (user) => {
    setSelected(user);
    setEditForm({ role: user.role, isActive: user.isActive, points: user.points, qcoins: user.qcoins });
    setShowEdit(true);
  };

  const saveEdit = async () => {
    try {
      await api.put(`/admin/users/${selected._id}`, editForm);
      addToast('User updated', 'success');
      setShowEdit(false);
      fetchUsers();
    } catch (e) {
      addToast(e.response?.data?.message || 'Update failed', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">User Management</h1>
        <p className="text-[14px] text-textSecondary mt-1">Manage users, roles and permissions.</p>
      </div>

      <Card padding={false} className="p-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textSecondary" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by username or email..." className="w-full h-10 pl-10 pr-3 rounded-lg border border-border bg-surface text-[14px] focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <Select options={[{ value: 'all', label: 'All Roles' }, { value: 'user', label: 'User' }, { value: 'admin', label: 'Admin' }]} value={role} onChange={setRole} containerClassName="w-[160px]" />
      </Card>

      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-appBg border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left text-[12px] font-medium text-textSecondary uppercase">User</th>
                <th className="px-4 py-3 text-left text-[12px] font-medium text-textSecondary uppercase">Role</th>
                <th className="px-4 py-3 text-left text-[12px] font-medium text-textSecondary uppercase">Points</th>
                <th className="px-4 py-3 text-left text-[12px] font-medium text-textSecondary uppercase">QCoins</th>
                <th className="px-4 py-3 text-left text-[12px] font-medium text-textSecondary uppercase">Quizzes</th>
                <th className="px-4 py-3 text-left text-[12px] font-medium text-textSecondary uppercase">Status</th>
                <th className="px-4 py-3 text-left text-[12px] font-medium text-textSecondary uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? <tr><td colSpan={7} className="p-8 text-center">Loading...</td></tr> : users.map(u => (
                <tr key={u._id} className="hover:bg-appBg/50">
                  <td className="px-4 py-3"><div className="flex items-center gap-3"><Avatar name={u.username} src={u.avatar} size="sm" /><div><p className="text-[13px] font-medium">{u.username}</p><p className="text-[11px] text-textSecondary">{u.email}</p></div></div></td>
                  <td className="px-4 py-3"><Badge variant={u.role === 'admin' ? 'primary' : 'default'}>{u.role}</Badge></td>
                  <td className="px-4 py-3 text-[13px]">{u.points}</td>
                  <td className="px-4 py-3 text-[13px]">{u.qcoins}</td>
                  <td className="px-4 py-3 text-[13px]">{u.quizzesCreated} created / {u.quizzesCompleted} done</td>
                  <td className="px-4 py-3"><Badge variant={u.isActive ? 'success' : 'error'}>{u.isActive ? 'Active' : 'Inactive'}</Badge></td>
                  <td className="px-4 py-3"><Button variant="secondary" size="sm" onClick={() => handleEdit(u)}>Edit</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title={`Edit ${selected?.username}`} footer={<><Button variant="secondary" onClick={() => setShowEdit(false)}>Cancel</Button><Button onClick={saveEdit}>Save</Button></>}>
        <div className="space-y-4">
          <Select label="Role" options={[{ value: 'user', label: 'User' }, { value: 'admin', label: 'Admin' }]} value={editForm.role} onChange={v => setEditForm({ ...editForm, role: v })} />
          <div className="flex items-center gap-2"><input type="checkbox" checked={editForm.isActive} onChange={e => setEditForm({ ...editForm, isActive: e.target.checked })} /><label className="text-[13px]">Active</label></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-[13px] font-medium">Points</label><input type="number" value={editForm.points} onChange={e => setEditForm({ ...editForm, points: parseInt(e.target.value) || 0 })} className="mt-1 w-full h-10 rounded-lg border border-border px-3" /></div>
            <div><label className="text-[13px] font-medium">QCoins</label><input type="number" value={editForm.qcoins} onChange={e => setEditForm({ ...editForm, qcoins: parseInt(e.target.value) || 0 })} className="mt-1 w-full h-10 rounded-lg border border-border px-3" /></div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
