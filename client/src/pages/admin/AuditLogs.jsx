import React, { useEffect, useState } from 'react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Avatar from '../../components/ui/Avatar';
import api from '../../lib/api';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/audit-logs?limit=50').then(res => setLogs(res.data.data.logs)).catch(console.error).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div><h1 className="page-title">Audit Logs</h1><p className="text-[14px] text-textSecondary mt-1">Track admin actions for security and compliance.</p></div>

      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-appBg border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left text-[12px] font-medium text-textSecondary uppercase">Admin</th>
                <th className="px-4 py-3 text-left text-[12px] font-medium text-textSecondary uppercase">Action</th>
                <th className="px-4 py-3 text-left text-[12px] font-medium text-textSecondary uppercase">Target</th>
                <th className="px-4 py-3 text-left text-[12px] font-medium text-textSecondary uppercase">Details</th>
                <th className="px-4 py-3 text-left text-[12px] font-medium text-textSecondary uppercase">IP</th>
                <th className="px-4 py-3 text-left text-[12px] font-medium text-textSecondary uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? <tr><td colSpan={6} className="p-8 text-center">Loading...</td></tr> : logs.map(log => (
                <tr key={log._id} className="hover:bg-appBg/50">
                  <td className="px-4 py-3"><div className="flex items-center gap-2"><Avatar name={log.admin?.username} size="sm" /><span className="text-[13px]">{log.admin?.username}</span></div></td>
                  <td className="px-4 py-3"><Badge variant="primary">{log.action}</Badge></td>
                  <td className="px-4 py-3 text-[12px]">{log.targetType} {log.targetId && `• ${log.targetId.toString().slice(-6)}`}</td>
                  <td className="px-4 py-3 text-[12px] max-w-[200px] truncate">{JSON.stringify(log.details).slice(0, 100)}</td>
                  <td className="px-4 py-3 text-[12px] text-textSecondary">{log.ip}</td>
                  <td className="px-4 py-3 text-[12px] text-textSecondary">{new Date(log.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
