
import { Shield, Users, Bell, Ban, Search, LogOut, CheckCircle2, X, Send, AlertTriangle, Loader2, Database, Terminal, Key, Check, RefreshCw } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { db, supabase, supabaseAdmin } from '../services/supabase';
import { ConfirmModal } from './ConfirmModal';

interface AdminUser {
  id: string;
  email: string;
  display_name: string;
  status: 'active' | 'disabled';
  last_login: string;
  role: 'user' | 'admin';
}

interface AdminDashboardProps {
  onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [notificationTitle, setNotificationTitle] = useState('Messaggio da MintFlow');
  const [notificationText, setNotificationText] = useState('');
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);
  const [userToReset, setUserToReset] = useState<{email: string, id: string} | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [tempPassword, setTempPassword] = useState('');

  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    userId: string;
    userName: string;
    newStatus: 'active' | 'disabled';
  }>({ isOpen: false, userId: '', userName: '', newStatus: 'active' });

  const fetchUsers = async () => {
    setLoading(true);
    try {
        const data = await db.getAllProfiles();
        setUsers(data as AdminUser[]);
    } catch (err) {
        setError("Errore nel caricamento dal database.");
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleToggleStatusRequest = (user: AdminUser) => {
    setConfirmConfig({
      isOpen: true,
      userId: user.id,
      userName: user.display_name || user.email,
      newStatus: user.status === 'active' ? 'disabled' : 'active'
    });
  };

  const executeToggleStatus = async () => {
    const { userId, newStatus } = confirmConfig;
    setConfirmConfig(prev => ({ ...prev, isOpen: false }));
    try {
        await db.updateUserStatus(userId, newStatus);
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus } : u));
        showToast(`Utente ${newStatus === 'active' ? 'riattivato' : 'disabilitato'}`);
    } catch (err: any) {
        showToast("Errore: " + err.message, "error");
    }
  };

  const handleSendNotification = async () => {
    if (!notificationText.trim() || !selectedUser) return;
    try {
      await db.sendNotification(selectedUser.id, notificationTitle, notificationText);
      showToast(`Notifica inviata a ${selectedUser.email}`);
      setShowNotifyModal(false);
      setNotificationText('');
      setNotificationTitle('Messaggio da MintFlow');
      setSelectedUser(null);
    } catch (err: any) {
      showToast('Errore invio notifica: ' + err.message, 'error');
    }
  };

  const handleSetTempPassword = async () => {
    if (!userToReset || !tempPassword) return;
    setIsResetting(true);
    try {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userToReset.id, { password: tempPassword });
      if (error) throw error;
      showToast(`Password aggiornata per ${userToReset.email}`);
      setUserToReset(null);
      setTempPassword('');
    } catch (err: any) {
      showToast('Errore setup password: ' + err.message, 'error');
    } finally {
      setIsResetting(false);
    }
  };

  const filteredUsers = users.filter(u => 
    (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (u.display_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white pb-20 md:pb-0">
      {toast && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[150] px-6 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-in slide-in-from-top-4 ${
          toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-500 text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span className="font-bold text-sm">{toast.msg}</span>
        </div>
      )}

      <header className="bg-white dark:bg-gray-800 border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="text-emerald-500" size={32} />
            <h1 className="text-xl font-black">MintFlow <span className="text-emerald-500">Admin</span></h1>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setShowSqlModal(true)} className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-xl"><Database size={20} /></button>
            <button onClick={onLogout} className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-xl font-bold"><LogOut size={20} /> Esci</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Cerca utente..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white dark:bg-gray-800 border-none shadow-sm outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Utente</th>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Stato</th>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <tr><td colSpan={3} className="p-12 text-center"><Loader2 className="animate-spin mx-auto text-emerald-500" /></td></tr>
              ) : filteredUsers.map(user => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white font-bold">{user.email.charAt(0).toUpperCase()}</div>
                      <div>
                        <div className="font-bold">{user.display_name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${user.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{user.status}</span>
                  </td>
                  <td className="px-6 py-6">
                    {user.email !== 'admin@mintflow.com' && (
                      <div className="flex gap-2">
                        <button onClick={() => setUserToReset({ email: user.email, id: user.id })} className="p-3 bg-amber-50 text-amber-500 rounded-2xl"><Key size={20} /></button>
                        <button onClick={() => { setSelectedUser(user); setShowNotifyModal(true); }} className="p-3 bg-blue-50 text-blue-500 rounded-2xl"><Bell size={20} /></button>
                        <button onClick={() => handleToggleStatusRequest(user)} className="p-3 bg-gray-100 text-gray-400 rounded-2xl">{user.status === 'active' ? <Ban size={20} /> : <CheckCircle2 size={20} />}</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {showNotifyModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] w-full max-md p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><Send className="text-emerald-500" /> Invia Messaggio</h3>
            <input type="text" value={notificationTitle} onChange={e => setNotificationTitle(e.target.value)} className="w-full p-4 rounded-xl bg-gray-50 dark:bg-gray-700 mb-4 outline-none font-bold" placeholder="Titolo messaggio" />
            <textarea value={notificationText} onChange={e => setNotificationText(e.target.value)} placeholder="Contenuto messaggio..." className="w-full p-4 rounded-xl bg-gray-50 dark:bg-gray-700 border-none outline-none focus:ring-2 focus:ring-emerald-500 min-h-[120px] mb-6 dark:text-white" />
            <div className="flex gap-4">
              <button onClick={() => setShowNotifyModal(false)} className="flex-1 py-4 bg-gray-100 rounded-xl font-bold">Annulla</button>
              <button onClick={handleSendNotification} className="flex-1 py-4 bg-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-emerald-200">Invia</button>
            </div>
          </div>
        </div>
      )}

      {showSqlModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] w-full max-w-2xl p-8 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold mb-6 flex gap-2"><Terminal className="text-emerald-500" /> Script SQL Aggiornato</h3>
            <pre className="bg-gray-900 text-emerald-400 p-5 rounded-xl text-xs overflow-x-auto mb-6 whitespace-pre-wrap leading-relaxed">
{`CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email text,
  display_name text,
  role text DEFAULT 'user',
  status text DEFAULT 'active',
  last_login timestamptz,
  notification text
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  title text,
  message text,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admin manage notifications" ON public.notifications FOR ALL USING ((auth.jwt() ->> 'email') = 'admin@mintflow.com');`}
            </pre>
            <button onClick={() => setShowSqlModal(false)} className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-bold shadow-lg">Chiudi</button>
          </div>
        </div>
      )}

      {userToReset && (
        <div className="fixed inset-0 z-[160] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] w-full max-sm p-8 shadow-2xl animate-in zoom-in-95">
            <h2 className="text-2xl font-black mb-2">Setup Password</h2>
            <p className="text-gray-500 mb-8">Aggiorna l'accesso per {userToReset.email}</p>
            <div className="space-y-4">
              <input type="text" placeholder="Nuova password..." value={tempPassword} onChange={e => setTempPassword(e.target.value)} className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-700 rounded-2xl font-mono" />
              <button onClick={handleSetTempPassword} disabled={isResetting || !tempPassword} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2">
                {isResetting ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />} Aggiorna Ora
              </button>
              <button onClick={() => setUserToReset(null)} className="w-full py-3 text-gray-400 font-bold">Annulla</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal isOpen={confirmConfig.isOpen} title={confirmConfig.newStatus === 'disabled' ? "Blocca Utente" : "Attiva Utente"} message={`Vuoi cambiare lo stato di ${confirmConfig.userName}?`} confirmText="Conferma" type={confirmConfig.newStatus === 'disabled' ? 'danger' : 'success'} onConfirm={executeToggleStatus} onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))} />
    </div>
  );
};
