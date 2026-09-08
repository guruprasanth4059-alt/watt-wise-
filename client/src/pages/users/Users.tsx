import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { User, UserRole } from '../../types';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { useAuth } from '../../context/AuthContext';
import { Users as UsersIcon, UserPlus, Shield, CheckCircle2, AlertCircle } from 'lucide-react';

export const UserManagement: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'committee_member' as UserRole,
    phone: ''
  });

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const data = await api.get<User[]>('/users');
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);
    try {
      await api.post('/users', form);
      setIsModalOpen(false);
      setForm({
        name: '',
        email: '',
        password: '',
        role: 'committee_member',
        phone: ''
      });
      setFeedback({ type: 'success', text: 'New society user created.' });
      fetchUsers();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Failed to create user.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleChange = async (targetUserId: string, newRole: UserRole) => {
    if (targetUserId === currentUser?.id) {
      alert('You cannot change your own role to prevent accidental lockout.');
      return;
    }
    try {
      await api.put(`/users/${targetUserId}/role`, { role: newRole });
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to update role.');
    }
  };

  const handleStatusToggle = async (targetUserId: string, currentStatus: string) => {
    if (targetUserId === currentUser?.id) {
      alert('You cannot deactivate your own account.');
      return;
    }
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      await api.put(`/users/${targetUserId}/status`, { status: newStatus });
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to update user status.');
    }
  };

  const canManage = currentUser?.role === 'society_admin';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <UsersIcon className="w-5 h-5 text-emerald-600" />
            Society User Management
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage committee members and resident access with role-based permissions.
          </p>
        </div>

        {canManage && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            icon={<UserPlus className="w-4 h-4" />}
          >
            Add Society User
          </Button>
        )}
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Users Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="p-3.5">Name</th>
                <th className="p-3.5">Email</th>
                <th className="p-3.5">Assigned Role</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Joined</th>
                {canManage && <th className="p-3.5 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-slate-50/60">
                  <td className="p-3.5 font-bold text-slate-900">
                    {u.name}
                    {u.id === currentUser?.id && (
                      <span className="text-[10px] text-emerald-600 ml-1.5 font-semibold">(You)</span>
                    )}
                  </td>
                  <td className="p-3.5 text-slate-600">{u.email}</td>
                  <td className="p-3.5">
                    {canManage && u.id !== currentUser?.id ? (
                      <select
                        value={u.role}
                        onChange={e => handleRoleChange(u.id, e.target.value as UserRole)}
                        className="px-2 py-1 border border-slate-200 rounded text-xs bg-white font-medium capitalize"
                      >
                        <option value="society_admin">Society Admin</option>
                        <option value="committee_member">Committee Member</option>
                        <option value="resident">Resident</option>
                      </select>
                    ) : (
                      <Badge
                        variant={u.role === 'society_admin' ? 'emerald' : u.role === 'committee_member' ? 'blue' : 'slate'}
                        size="sm"
                      >
                        {u.role.replace('_', ' ')}
                      </Badge>
                    )}
                  </td>
                  <td className="p-3.5">
                    <span
                      className={`inline-flex items-center gap-1 font-semibold ${
                        u.status === 'active' ? 'text-emerald-700' : 'text-slate-400'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${u.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      {u.status}
                    </span>
                  </td>
                  <td className="p-3.5 text-slate-500">
                    {u.created_at ? u.created_at.slice(0, 10) : 'Recent'}
                  </td>
                  {canManage && (
                    <td className="p-3.5 text-right">
                      {u.id !== currentUser?.id && (
                        <button
                          onClick={() => handleStatusToggle(u.id, u.status)}
                          className="text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
                        >
                          {u.status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add User Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Invite / Add Society User"
        subtitle="Grant role-based access to committee office-bearers or residents."
        maxWidth="md"
      >
        <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Ananya Sharma (Treasurer)"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Email Address *</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              placeholder="treasurer@society.com"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Temporary Password *</label>
              <input
                type="password"
                required
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                placeholder="Min 6 characters"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Role *</label>
              <select
                value={form.role}
                onChange={e => setForm({ ...form, role: e.target.value as UserRole })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              >
                <option value="committee_member">Committee Member</option>
                <option value="society_admin">Society Admin</option>
                <option value="resident">Resident</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              Add User
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
