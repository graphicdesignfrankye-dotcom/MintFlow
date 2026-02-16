
import React, { useState, useEffect } from 'react';
import { Shield, Users, Bell, Ban, Search, LogOut, CheckCircle2, X, Send, AlertTriangle, Loader2, Database, Terminal, Copy } from 'lucide-react';
import { db } from '../services/supabase';
import { ConfirmModal } from './ConfirmModal';
import { format } from 'date-fns';
import it from 'date-fns/locale/it';

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
  const [notificationText, setNotificationText] = useState('');
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);
  
  // Configurazione per il modal di conferma
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    userId: string;
    userName: string;
    newStatus: 'active' | 'disabled';
  }>({ isOpen: false, userId: '', userName: '', newStatus: 'active' });

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
        const data = await db.getAllProfiles();
        setUsers(data as AdminUser[]);
    } catch (err: any) {
        console.error("Errore fetch:", err);
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

  const handleToggleStatusRequest = (user: AdminUser, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
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
        const data = await db.updateUserStatus(userId, newStatus);
        if (!data || data.length === 0) {
             showToast("Errore: Il database ha rifiutato la modifica (Verifica Policy SQL)", "error");
             return;
        }
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus } : u));
        showToast(`Utente ${newStatus === 'active' ? 'riattivato' : 'disabilitato'} con successo`);
    } catch (err: any) {
        console.error("Errore durante l'aggiornamento:", err);
        showToast("Errore: " + err.message, "error");
    }
  };

  const handleSendNotification = async () => {
    if (!notificationText.trim() || !selectedUser) return;
    try {
      await db.sendNotification(selectedUser.id, notificationText);
      showToast(`Notifica inviata a ${selectedUser.email}`);
      setShowNotifyModal(false);
      setNotificationText('');
      setSelectedUser(null);
    } catch (err: any) {
      showToast('Errore invio notifica: ' + err.message, 'error');
    }
  };

  const filteredUsers = users.filter(u => 
    (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (u.display_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white pb-20 md:pb-0">
      {toast && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[150] px-6 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-in slide-in-from-top-4 ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-500 text-white'}`}>
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

        <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-sm border overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Utente</th>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Stato</th>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={3} className="p-12 text-center"><Loader2 className="animate-spin mx-auto text-emerald-500" /></td></tr>
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="px-6 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white font-bold">{(user.display_name || user.email).charAt(0).toUpperCase()}</div>
                        <div>
                          <div className="font-bold">{user.display_name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${user.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{user.status}</span>
                    </td>
                    <td className="px-6 py-6">
                      {user.email !== 'admin@mintflow.com' && (
                        <div className="flex gap-2">
                          <button onClick={() => { setSelectedUser(user); setShowNotifyModal(true); }} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"><Bell size={18} /></button>
                          <button onClick={e => handleToggleStatusRequest(user, e)} className={`p-2 rounded-lg ${user.status === 'active' ? 'text-gray-400 hover:text-red-500 hover:bg-red-50' : 'text-emerald-600 bg-emerald-50'}`}>
                            {user.status === 'active' ? <Ban size={18} /> : <CheckCircle2 size={18} />}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={3} className="p-12 text-center text-gray-400">Nessun utente trovato</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* MODAL NOTIFICHE */}
      {showNotifyModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-[2rem] w-full max-w-md p-8 shadow-2xl">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><Send className="text-emerald-500" /> Invia Notifica</h3>
            <textarea value={notificationText} onChange={e => setNotificationText(e.target.value)} placeholder="Messaggio per l'utente..." className="w-full p-4 rounded-xl bg-gray-50 dark:bg-gray-700 border-none outline-none focus:ring-2 focus:ring-emerald-500 min-h-[120px] mb-6 dark:text-white" />
            <div className="flex gap-4">
              <button onClick={() => setShowNotifyModal(false)} className="flex-1 py-4 bg-gray-100 dark:bg-gray-700 rounded-xl font-bold">Annulla</button>
              <button onClick={handleSendNotification} className="flex-1 py-4 bg-emerald-500 text-white rounded-xl font-bold">Invia</button>
            </div>
          </div>
        </div>
      )}

      {/* SQL MODAL */}
      {showSqlModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-[2rem] w-full max-w-2xl p-8 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-6 flex gap-2"><Terminal className="text-emerald-500" /> Script SQL Supabase</h3>
            <pre className="bg-gray-900 text-emerald-400 p-4 rounded-xl text-xs overflow-x-auto mb-6 whitespace-pre-wrap">
{`CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email text,
  display_name text,
  role text DEFAULT 'user',
  status text DEFAULT 'active',
  last_login timestamptz,
  notification text
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin select all" ON public.profiles FOR SELECT USING ((auth.jwt() ->> 'email') = 'admin@mintflow.com');
CREATE POLICY "Admin update all" ON public.profiles FOR UPDATE USING ((auth.jwt() ->> 'email') = 'admin@mintflow.com');`}
            </pre>
            <button onClick={() => setShowSqlModal(false)} className="w-full py-4 bg-emerald-500 text-white rounded-xl font-bold">Chiudi</button>
          </div>
        </div>
      )}

      {/* MODAL DI CONFERMA STATO */}
      <ConfirmModal 
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.newStatus === 'disabled' ? "Disabilita Utente" : "Riattiva Utente"}
        message={`Sei sicuro di voler cambiare lo stato di ${confirmConfig.userName} a ${confirmConfig.newStatus === 'disabled' ? 'Disabilitato' : 'Attivo'}?`}
        confirmText={confirmConfig.newStatus === 'disabled' ? "Sì, Blocca" : "Sì, Attiva"}
        type={confirmConfig.newStatus === 'disabled' ? 'danger' : 'success'}
        onConfirm={executeToggleStatus}
        onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
