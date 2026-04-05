import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { Shield, User, GraduationCap } from 'lucide-react';

export default function AdminPanel() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch('/api/users');
        const usersData = await res.json();
        setUsers(usersData);
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const handleRoleChange = async (uid: string, newRole: 'admin' | 'profesor' | 'alumno') => {
    try {
      const res = await fetch(`/api/users/${uid}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });
      if (res.ok) {
        setUsers(users.map(u => u.uid === uid ? { ...u, role: newRole } : u));
      } else {
        alert("Error al actualizar el rol");
      }
    } catch (error) {
      console.error("Error updating role:", error);
      alert("Error al actualizar el rol");
    }
  };

  if (loading) return <div className="text-center py-12 text-slate-400">Cargando usuarios...</div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4 border-b border-slate-800 pb-6">
        <div className="bg-purple-600 p-3 rounded-xl shadow-lg shadow-purple-900/20">
          <Shield className="text-white w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">Panel de Administración</h2>
          <p className="text-slate-400">Gestiona los roles y permisos de los usuarios.</p>
        </div>
      </div>

      <div className="bg-[#1e293b] rounded-2xl border border-slate-800 overflow-hidden">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-900/50 text-xs uppercase text-slate-400 font-bold">
            <tr>
              <th className="px-6 py-4">Usuario</th>
              <th className="px-6 py-4">Email</th>
              <th className="px-6 py-4">Rol Actual</th>
              <th className="px-6 py-4">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {users.map(u => (
              <tr key={u.uid} className="hover:bg-slate-800/50 transition-colors">
                <td className="px-6 py-4 font-medium text-white flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                    <User className="w-4 h-4 text-slate-400" />
                  </div>
                  {u.displayName}
                </td>
                <td className="px-6 py-4 text-slate-400">{u.email}</td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    u.role === 'admin' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                    u.role === 'profesor' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                    'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}>
                    {u.role.toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <select 
                    value={u.role}
                    onChange={(e) => handleRoleChange(u.uid, e.target.value as any)}
                    className="bg-slate-900 border border-slate-700 text-slate-300 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                  >
                    <option value="alumno">Alumno</option>
                    <option value="profesor">Profesor</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
