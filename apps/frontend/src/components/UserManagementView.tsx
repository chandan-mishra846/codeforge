import React, { useState, useEffect, useCallback } from 'react';
import { UserDTO, SubmissionHistoryItem } from '../types';
import { Users, Shield, Trash2, CheckCircle2, Clock, Calendar, AlertTriangle } from 'lucide-react';

interface UserManagementViewProps {
  token: string;
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({ token }) => {
  const [users, setUsers] = useState<UserDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Selected User Modal State
  const [selectedUser, setSelectedUser] = useState<UserDTO | null>(null);
  const [userSubmissions, setUserSubmissions] = useState<SubmissionHistoryItem[]>([]);
  const [solvedCount, setSolvedCount] = useState<number>(0);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Delete User Confirmation Modal State
  const [userToDelete, setUserToDelete] = useState<UserDTO | null>(null);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const response = await fetch('http://localhost:4000/api/v1/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch users.');
      setUsers(data.users || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error connecting to API Gateway.');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Open User Profile & Submissions Modal
  const handleInspectUser = async (u: UserDTO) => {
    setSelectedUser(u);
    setIsProfileModalOpen(true);
    try {
      const response = await fetch(`http://localhost:4000/api/v1/admin/users/${u.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setUserSubmissions(data.submissions || []);
        setSolvedCount((data.solvedProblemIds || []).length);
      }
    } catch {
      console.warn('Failed to load user profile details');
    }
  };

  // Toggle User Role
  const handleToggleRole = async (u: UserDTO) => {
    const nextRole = u.role === 'ADMIN' ? 'USER' : 'ADMIN';
    try {
      const response = await fetch(`http://localhost:4000/api/v1/admin/users/${u.id}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: nextRole }),
      });
      if (response.ok) {
        fetchUsers();
        if (selectedUser?.id === u.id) {
          setSelectedUser({ ...selectedUser, role: nextRole });
        }
      }
    } catch {
      console.warn('Failed to update user role');
    }
  };

  // Delete User Confirmation Handler
  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      const response = await fetch(`http://localhost:4000/api/v1/admin/users/${userToDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        fetchUsers();
        setUserToDelete(null);
        if (selectedUser?.id === userToDelete.id) {
          setIsProfileModalOpen(false);
        }
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete user.');
      }
    } catch {
      alert('Error connecting to server.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center space-x-2 text-purple-600 dark:text-purple-400">
          <Users className="w-5 h-5" />
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Registered Users Management</h2>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 rounded border border-purple-200 dark:border-purple-800">
          Total Users: {users.length}
        </span>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs rounded">
          {errorMsg}
        </div>
      )}

      {/* Users List Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-500 italic">Loading registered users...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="p-3">User Details</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Streak</th>
                  <th className="p-3">Problems Solved</th>
                  <th className="p-3">Created Date</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200 font-sans">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-950/50 transition">
                    <td className="p-3 font-semibold text-slate-900 dark:text-slate-100">
                      <div>{u.name || u.username}</div>
                      <div className="text-[10px] font-mono text-slate-400">@{u.username}</div>
                    </td>
                    <td className="p-3 font-mono text-slate-600 dark:text-slate-300">{u.email}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                          u.role === 'ADMIN'
                            ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="p-3 font-semibold text-amber-600 dark:text-amber-400">🔥 {u.currentStreak} Days</td>
                    <td className="p-3 font-semibold text-emerald-600 dark:text-emerald-400">✓ {u.questionsSolved} Solved</td>
                    <td className="p-3 text-slate-500 text-[11px]">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="p-3 text-right space-x-2">
                      <button
                        onClick={() => handleInspectUser(u)}
                        className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 font-semibold text-[11px] rounded hover:bg-blue-100 transition"
                      >
                        Profile & History
                      </button>
                      <button
                        onClick={() => handleToggleRole(u)}
                        className="px-2.5 py-1 bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-semibold text-[11px] rounded hover:bg-purple-100 transition"
                        title="Switch Role"
                      >
                        <Shield className="w-3 h-3 inline mr-1" />
                        {u.role === 'ADMIN' ? 'Make User' : 'Make Admin'}
                      </button>
                      <button
                        onClick={() => setUserToDelete(u)}
                        disabled={u.id === '00000000-0000-0000-0000-000000000001'}
                        className="px-2 py-1 bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 font-semibold text-[11px] rounded hover:bg-red-100 transition disabled:opacity-30"
                        title="Delete User"
                      >
                        <Trash2 className="w-3 h-3 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* User Profile & Submission History Modal */}
      {isProfileModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl max-w-3xl w-full p-6 text-slate-900 dark:text-slate-100 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{selectedUser.name || selectedUser.username}</h3>
                <p className="text-xs text-slate-500 font-mono">ID: {selectedUser.id} | Email: {selectedUser.email}</p>
              </div>
              <button
                onClick={() => setIsProfileModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold px-2 py-1 rounded"
              >
                ✕
              </button>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded">
                <span className="text-[10px] font-semibold text-slate-500 uppercase">Role</span>
                <div className="font-bold text-sm text-purple-600 dark:text-purple-400">{selectedUser.role}</div>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded">
                <span className="text-[10px] font-semibold text-slate-500 uppercase">Current Streak</span>
                <div className="font-bold text-sm text-amber-500">🔥 {selectedUser.currentStreak} Days</div>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded">
                <span className="text-[10px] font-semibold text-slate-500 uppercase">Problems Solved</span>
                <div className="font-bold text-sm text-emerald-500">✓ {solvedCount} Unique Solved</div>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded">
                <span className="text-[10px] font-semibold text-slate-500 uppercase">Registered</span>
                <div className="font-bold text-xs text-slate-700 dark:text-slate-300">
                  {selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString() : 'N/A'}
                </div>
              </div>
            </div>

            {/* Submission History Table */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                Recent Submissions ({userSubmissions.length})
              </h4>
              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded overflow-hidden max-h-60 overflow-y-auto">
                {userSubmissions.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500 italic">No submissions recorded for this user.</div>
                ) : (
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase">
                      <tr>
                        <th className="p-2">Problem</th>
                        <th className="p-2">Language</th>
                        <th className="p-2">Verdict</th>
                        <th className="p-2">Runtime</th>
                        <th className="p-2">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                      {userSubmissions.map((sub) => (
                        <tr key={sub.id}>
                          <td className="p-2 font-bold font-sans">{sub.problemTitle}</td>
                          <td className="p-2 uppercase">{sub.language}</td>
                          <td className="p-2">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                sub.status === 'ACCEPTED'
                                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                                  : 'bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400'
                              }`}
                            >
                              {sub.status}
                            </span>
                          </td>
                          <td className="p-2">{sub.maxRuntimeMs} ms</td>
                          <td className="p-2 text-slate-400">{new Date(sub.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsProfileModalOpen(false)}
                className="px-4 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded hover:bg-slate-300 dark:hover:bg-slate-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl max-w-md w-full p-6 text-slate-900 dark:text-slate-100 space-y-4">
            <div className="flex items-center space-x-3 text-red-600 dark:text-red-400">
              <AlertTriangle className="w-6 h-6 flex-shrink-0" />
              <h3 className="text-base font-bold">Confirm User Deletion</h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete user <strong className="text-slate-900 dark:text-slate-100">{userToDelete.name || userToDelete.username}</strong> ({userToDelete.email})?
              All submission records and account statistics will be permanently removed.
            </p>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setUserToDelete(null)}
                className="px-3.5 py-1.5 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteUser}
                className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded shadow transition"
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
