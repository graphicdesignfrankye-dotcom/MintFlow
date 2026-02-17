
import React, { useState, useEffect } from 'react';
import { Shield, Users, Bell, Ban, Search, LogOut, CheckCircle2, X, Send, AlertTriangle, Loader2, Database, Terminal, Key, Check, Mail } from 'lucide-react';
import { db, auth, supabase } from '../services/supabase';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error' | 'warning'} | null>(null);
  
  // Gestione Notifiche
  const [isNotifyModalOpen, setIsNotifyModalOpen] = useState(false);
  const [targetUser, setTargetUser] = useState<AdminUser | null>(null);
  const [notifyTitle, setNotifyTitle] = useState('Aggiornamento MintFlow');
  const [notifyBody, setNotifyBody] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Gestione Reset
  const [userToReset, setUserToReset] = useState<{email: string, id: string} | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  // Gestione Stato
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean; userId: string; userName: string; newStatus: 'active' | 'disabled';
  }>({ isOpen: false, userId: '', userName: '', newStatus: 'active' });

  const fetchUsers = async () => {
    setLoading(true);
    try {
        const data = await db.getAllProfiles();
        setUsers(data as AdminUser[]);
    } catch (err: any) {
        showToast("Errore caricamento utenti", "error");
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const showToast = (msg: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleToggleStatus = async () => {
    const { userId, newStatus } = confirmConfig;
    setConfirmConfig(prev => ({ ...prev, isOpen: false }));
    try {
        await db.updateUserStatus(userId, newStatus);
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus } : u));
        showToast(`Utente ${newStatus === 'active' ? 'riattivato' : 'disabilitato'}`);
    } catch (err: any) {
        showToast("Errore aggiornamento stato", "error");
    }
  };

  const openNotifyComposer = (user: AdminUser) => {
    setTargetUser(user);
    setNotifyTitle('Importante da MintFlow');
    setNotifyBody('');
    setIsNotifyModalOpen(true);
  };

  const handleSendNotification = async () => {
    if (!targetUser || !notifyTitle.trim() || !notifyBody.trim()) {
      showToast("Tutti i campi sono obbligatori", "warning");
      return;
    }
    setIsSending(true);
    try {
      await db.sendNotification(targetUser.id, notifyTitle.trim(), notifyBody.trim());
      showToast(`Messaggio inviato a ${targetUser.display_name || targetUser.email}`);
      setIsNotifyModalOpen(false);
    } catch (err: any) {
      showToast("Invio fallito: " + err.message, "error");
    } finally {
      setIsSending(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!userToReset) return;
    setIsResetting(true);
    try {
      await supabase.auth.resetPasswordForEmail(userToReset.email, { redirectTo: window.location.origin });
      showToast(`Email di reset inviata a ${userToReset.email}`);
      setUserToReset(null);
    } catch (err: any) {
      showToast("Errore reset: " + err.message, "error");
    } finally {
      setIsResetting(false);
    }
  };

  const filteredUsers = users.filter(u => 
    (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (u.display_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white pb-24 md:pb-12">
      {toast && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-in slide-in-from-top-4 ${
          toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-500 text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span className="font-bold text-sm">{toast.msg}</span>
        </div>
      )}

      <header className="bg-white dark:bg-gray-800 border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 md:h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="text-emerald-500" size={24} />
            <h1 className="text-lg md:text-xl font-black">MintFlow <span className="text-emerald-500 hidden sm:inline">Admin</span></h1>
          </div>
          <button onClick={onLogout} className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-xl font-bold text-xs md:text-sm">
            <LogOut size={18} /> <span className="hidden sm:inline">Esci</span>
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 md:py-8">
        <div className="mb-6 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Cerca utente per nome o email..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
            className="w-full pl-12 pr-4 py-3 md:py-4 rounded-2xl bg-white dark:bg-gray-800 border-none shadow-sm outline-none focus:ring-2 focus:ring-emerald-500 text-sm" 
          />
        </div>

        {/* VISTA DESKTOP */}
        <div className="hidden md:block bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-sm border border-emerald-50 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-gray-400">Utente</th>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-gray-400 text-center">Stato</th>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-gray-400 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <tr><td colSpan={3} className="p-12 text-center"><Loader2 className="animate-spin mx-auto text-emerald-500" /></td></tr>
              ) : filteredUsers.map(user => (
                <tr key={user.id} className="hover:bg-emerald-50/20 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white font-black">{(user.display_name || user.email).charAt(0).toUpperCase()}</div>
                      <div className="min-w-0">
                        <div className="font-bold text-sm truncate">{user.display_name}</div>
                        <div className="text-xs text-gray-400 truncate">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${user.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30' : 'bg-red-100 text-red-700'}`}>{user.status}</span>
                  </td>
                  <td className="px-6 py-5">
                    {user.email !== 'admin@mintflow.com' && (
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openNotifyComposer(user)} className="p-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-xl hover:scale-110 transition-transform shadow-sm" title="Invia Notifica"><Bell size={18} /></button>
                        <button onClick={() => setUserToReset({ email: user.email, id: user.id })} className="p-2.5 bg-amber-50 dark:bg-amber-900/20 text-amber-500 rounded-xl hover:scale-110 transition-transform shadow-sm" title="Reset Password"><Key size={18} /></button>
                        <button onClick={() => setConfirmConfig({ isOpen: true, userId: user.id, userName: user.display_name || user.email, newStatus: user.status === 'active' ? 'disabled' : 'active' })} className={`p-2.5 rounded-xl transition-all hover:scale-110 shadow-sm ${user.status === 'active' ? 'text-gray-400 bg-gray-100 dark:bg-gray-700' : 'text-white bg-emerald-500 shadow-emerald-100'}`} title="Cambia Stato">{user.status === 'active' ? <Ban size={18} /> : <CheckCircle2 size={18} />}</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* VISTA MOBILE */}
        <div className="md:hidden space-y-4">
          {loading ? (
            <div className="p-12 text-center"><Loader2 className="animate-spin mx-auto text-emerald-500" /></div>
          ) : filteredUsers.map(user => (
            <div key={user.id} className="bg-white dark:bg-gray-800 p-5 rounded-[2rem] border border-emerald-50 dark:border-gray-700 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white font-black">{(user.display_name || user.email).charAt(0).toUpperCase()}</div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-sm truncate">{user.display_name}</h4>
                    <p className="text-[10px] text-gray-400 truncate">{user.email}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase ${user.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>{user.status}</span>
              </div>
              
              {user.email !== 'admin@mintflow.com' && (
                <div className="grid grid-cols-3 gap-2 pt-2">
                  <button onClick={() => openNotifyComposer(user)} className="flex flex-col items-center justify-center gap-1 p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-2xl active:scale-95 transition-all">
                    <Bell size={18} /><span className="text-[8px] font-bold uppercase">Notifica</span>
                  </button>
                  <button onClick={() => setUserToReset({ email: user.email, id: user.id })} className="flex flex-col items-center justify-center gap-1 p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-2xl active:scale-95 transition-all">
                    <Key size={18} /><span className="text-[8px] font-bold uppercase">Reset</span>
                  </button>
                  <button onClick={() => setConfirmConfig({ isOpen: true, userId: user.id, userName: user.display_name || user.email, newStatus: user.status === 'active' ? 'disabled' : 'active' })} className={`flex flex-col items-center justify-center gap-1 p-3 rounded-2xl active:scale-95 transition-all ${user.status === 'active' ? 'bg-red-50 text-red-600' : 'bg-emerald-500 text-white'}`}>
                    {user.status === 'active' ? <Ban size={18} /> : <CheckCircle2 size={18} />}<span className="text-[8px] font-bold uppercase">Stato</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>

      {/* MODALE COMPOSIZIONE NOTIFICA */}
      {isNotifyModalOpen && targetUser && (
        <div className="fixed inset-0 z-[160] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 border border-blue-100 dark:border-gray-700 relative overflow-hidden">
            <button onClick={() => setIsNotifyModalOpen(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 transition-colors"><X size={24} /></button>
            <div className="bg-blue-50 dark:bg-blue-900/30 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 text-blue-600 shadow-inner"><Bell size={32} /></div>
            <h2 className="text-2xl font-black text-gray-800 dark:text-white mb-2 tracking-tight">Componi Messaggio</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6 font-medium text-sm">Destinatario: <span className="font-bold text-emerald-600">{targetUser.display_name || targetUser.email}</span></p>
            <div className="space-y-4">
              <input type="text" value={notifyTitle} onChange={e => setNotifyTitle(e.target.value)} placeholder="Titolo della notifica..." className="w-full px-5 py-3 rounded-2xl bg-gray-50 dark:bg-gray-700 border-2 border-transparent focus:border-blue-500 outline-none dark:text-white font-bold" />
              <textarea value={notifyBody} onChange={e => setNotifyBody(e.target.value)} placeholder="Corpo del messaggio..." className="w-full px-5 py-4 rounded-2xl bg-gray-50 dark:bg-gray-700 border-2 border-transparent focus:border-blue-500 outline-none dark:text-white font-medium h-32 resize-none" />
              <div className="flex gap-3 pt-2">
                <button onClick={() => setIsNotifyModalOpen(false)} className="flex-1 py-4 bg-gray-100 dark:bg-gray-700 text-gray-500 rounded-2xl font-bold">Annulla</button>
                <button onClick={handleSendNotification} disabled={isSending} className="flex-1 py-4 bg-emerald-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-100">
                  {isSending ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />} Invia
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODALE RESET PASSWORD */}
      {userToReset && (
        <div className="fixed inset-0 z-[160] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] w-full max-sm p-8 shadow-2xl animate-in zoom-in-95 border border-amber-100 dark:border-gray-700 relative overflow-hidden">
            <button onClick={() => setUserToReset(null)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 transition-colors"><X size={24} /></button>
            <div className="bg-amber-100 dark:bg-amber-900/30 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 text-amber-600"><Key size={32} /></div>
            <h2 className="text-2xl font-black text-gray-800 dark:text-white mb-2 tracking-tight">Reset Password</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-8 font-medium leading-relaxed">Verrà inviata un'email di reset a: <br/><span className="font-bold text-emerald-600">{userToReset.email}</span></p>
            <button onClick={handlePasswordReset} disabled={isResetting} className="w-full py-4 bg-amber-500 text-white rounded-2xl font-bold shadow-lg shadow-amber-200 flex items-center justify-center gap-2">
              {isResetting ? <Loader2 className="animate-spin" size={18} /> : <Mail size={18} />} Invia Email Ora
            </button>
          </div>
        </div>
      )}

      <ConfirmModal 
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.newStatus === 'disabled' ? "Disabilita Utente" : "Riattiva Utente"}
        message={`Sei sicuro di voler cambiare lo stato di ${confirmConfig.userName} a ${confirmConfig.newStatus === 'disabled' ? 'Disabilitato' : 'Attivo'}?`}
        confirmText={confirmConfig.newStatus === 'disabled' ? "Sì, Blocca" : "Sì, Attiva"}
        type={confirmConfig.newStatus === 'disabled' ? 'danger' : 'success'}
        onConfirm={handleToggleStatus}
        onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
