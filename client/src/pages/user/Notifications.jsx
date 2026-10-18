import React, { useEffect, useState } from 'react';
import { Bell, CheckCheck, Trash2, Award, Coins, Star, Flag } from 'lucide-react';
import Card, { CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { useToast } from '../../components/ui/Toast';
import api from '../../lib/api';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  const fetchNotifs = async () => {
    try {
      const res = await api.get('/notifications?limit=50');
      setNotifications(res.data.data.notifications);
      setUnread(res.data.data.unreadCount);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNotifs(); }, []);

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
      setUnread(0);
      addToast('All marked as read', 'success');
    } catch {}
  };

  const markOneRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(notifications.map(n => n._id === id ? { ...n, isRead: true } : n));
      setUnread(Math.max(0, unread - 1));
    } catch {}
  };

  const deleteOne = async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications(notifications.filter(n => n._id !== id));
      addToast('Deleted', 'success');
    } catch {}
  };

  const iconMap = {
    quiz_approved: <Award className="w-4 h-4 text-success" />,
    quiz_rejected: <Flag className="w-4 h-4 text-error" />,
    qcoin_earned: <Coins className="w-4 h-4 text-warning" />,
    new_rating: <Star className="w-4 h-4 text-warning" />,
    system: <Bell className="w-4 h-4 text-primary" />
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="text-[14px] text-textSecondary mt-1">{unread} unread • {notifications.length} total</p>
        </div>
        <Button variant="secondary" size="sm" leftIcon={<CheckCheck className="w-4 h-4" />} onClick={markAllRead}>Mark all read</Button>
      </div>

      <Card padding={false}>
        {notifications.length === 0 ? (
          <div className="p-12 text-center"><Bell className="w-10 h-10 mx-auto text-textSecondary mb-3" /><p className="text-[14px] text-textSecondary">No notifications yet</p></div>
        ) : (
          <div className="divide-y divide-border">
            {notifications.map(n => (
              <div key={n._id} className={`p-4 flex gap-3 hover:bg-appBg transition-colors ${!n.isRead ? 'bg-primary-light/40' : ''}`}>
                <div className="w-9 h-9 rounded-xl bg-surface border border-border flex items-center justify-center flex-shrink-0">{iconMap[n.type] || <Bell className="w-4 h-4" />}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-[14px]">{n.title}</p>
                    {!n.isRead && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1" />}
                  </div>
                  <p className="text-[13px] text-textSecondary mt-1">{n.message}</p>
                  <p className="text-[11px] text-textSecondary mt-2">{new Date(n.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex flex-col gap-1">
                  {!n.isRead && <Button variant="ghost" size="sm" onClick={() => markOneRead(n._id)}>Read</Button>}
                  <Button variant="ghost" size="sm" onClick={() => deleteOne(n._id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
