import React, { useState, useEffect } from 'react';
import { Shield, Users, Bell, Trash2, Ban, Key, Search, LogOut, CheckCircle2, X, Send, AlertTriangle, Mail, Loader2, Database, Terminal, Copy, Menu } from 'lucide-react';
import { auth, db } from '../services/supabase';
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
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [notificationText, setNotificationText] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
        const data = await db.getAllProfiles();
        const realUsers = data as AdminUser[];
        
        // Verifica se l'admin è già presente nel DB reale
        const adminExists = realUsers.some(u => u.email === 'admin@mintflow.com');

        // Se l'admin non è nel DB (perché non è stato importato), aggiungiamo quello mock
        let finalUsers = [...realUsers];
        
        if (!adminExists) {
           const mockAdmin: AdminUser = {
               id: 'mock-admin-id',
               email: 'admin@mintflow.com',
               display_name: 'Super Admin (Mock)',
               status: 'active',
               last_login: new Date().toISOString(),
               role: 'admin'
          };
          finalUsers = [mockAdmin, ...realUsers];
        } else {
            // Assicuriamoci che l'admin sia in cima
            finalUsers = [
                ...realUsers.filter(u => u.email === 'admin@mintflow.com'),
                ...realUsers.filter(u => u.email !== 'admin@mintflow.com')
            ];
        }

        setUsers(finalUsers);

    } catch (err: any) {
        console.error(err);
        setError("Errore caricamento profili. Clicca l'icona Database per istruzioni SQL.");
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const filteredUsers = users.filter(u => 
    (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (u.display_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggleStatus = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // 1. BLOCCO CRITICO: Se l'ID è quello finto, non chiamare il DB per evitare errore UUID invalid
    if (id === 'mock-admin-id') {
        showToast("L'admin simulato non può essere modificato nel DB", 'error');
        return;
    }

    const user = users.find(u => u.id === id);
    if (!user) return;

    const newStatus = user.status === 'active' ? 'disabled' : 'active';
    const actionLabel = user.status === 'active' ? 'DISABILITARE' : 'RIATTIVARE';

    if (window.confirm(`SEI SICURO?\n\nStai per ${actionLabel} l'utente:\n${user.display_name || user.email}`)) {
        try {
            await db.updateUserStatus(id, newStatus);
            setUsers(prevUsers => prevUsers.map(u => u.id === id ? { ...u, status: newStatus } : u));
            showToast(`Utente ${newStatus === 'active' ? 'riattivato' : 'disabilitato'} con successo`);
        } catch (err: any) {
            console.error("Errore DB:", err);
            showToast("Errore durante l'aggiornamento: " + err.message, "error");
        }
    }
  };

  const handleSendNotification = async () => {
    if (!notificationText.trim() || !selectedUser) return;
    
    // Controllo Mock ID anche qui per sicurezza
    if (selectedUser.id === 'mock-admin-id') {
       showToast("Non puoi inviare notifiche DB all'admin simulato", 'error');
       return;
    }
    
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

  const handleChangePassword = () => {
    if (newPassword.length < 6) {
      showToast('La password deve essere di almeno 6 caratteri', 'error');
      return;
    }
    // Rimosso alert nativo, usato solo Toast per UI più pulita
    showToast(`Password simulata aggiornata per ${selectedUser?.email} (Richiede Edge Function)`);
    setShowPasswordModal(false);
    setNewPassword('');
    setSelectedUser(null);
  };

  const handleLogout = async () => {
      try {
        await auth.signOut();
      } catch (e) {
          // Ignora errori logout
      }
      onLogout(); // Reindirizza al login immediatamente
  };

  const sqlImportScript = `
-- 1. Setup Tabella (Crea se non esiste o aggiungi colonne)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email text,
  display_name text,
  role text DEFAULT 'user',
  status text DEFAULT 'active',
  last_login timestamptz,
  notification text
);

-- Assicura che le colonne esistano (in caso la tabella esistesse già senza di esse)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notification text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'user';

-- 2. Importa utenti esistenti da Auth (Idempotente)
INSERT INTO public.profiles (id, email, display_name, last_login, role, status)
SELECT 
    id, 
    email, 
    COALESCE(raw_user_meta_data->>'display_name', split_part(email, '@', 1)),
    COALESCE(last_sign_in_at, created_at),
    CASE WHEN email = 'admin@mintflow.com' THEN 'admin' ELSE 'user' END,
    'active'
FROM auth.users
ON CONFLICT (id) DO UPDATE 
SET email = EXCLUDED.email, last_login = EXCLUDED.last_login;

-- 3. Configura RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Rimuovi vecchie policy per evitare conflitti
DROP POLICY IF EXISTS "Users can see own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin can select all" ON public.profiles;
DROP POLICY IF EXISTS "Admin can update all" ON public.profiles;
DROP POLICY IF EXISTS "Admin can delete all" ON public.profiles;
DROP POLICY IF EXISTS "Admin can see all" ON public.profiles;

-- 5. Crea Nuove Policy
-- L'utente normale vede solo se stesso
CREATE POLICY "Users can see own profile" ON public.profiles 
FOR SELECT USING (auth.uid() = id);

-- L'admin può VEDERE tutto
CREATE POLICY "Admin can select all" ON public.profiles 
FOR SELECT USING (
  (auth.jwt() ->> 'email') = 'admin@mintflow.com'
);

-- L'admin può MODIFICARE tutto (Disabilitare, Notifiche)
CREATE POLICY "Admin can update all" ON public.profiles 
FOR UPDATE USING (
  (auth.jwt() ->> 'email') = 'admin@mintflow.com'
);

-- L'admin può CANCELLARE tutto
CREATE POLICY "Admin can delete all" ON public.profiles 
FOR DELETE USING (
  (auth.jwt() ->> 'email') = 'admin@mintflow.com'
);
  `.trim();

  // Componente Avatar Riutilizzabile
  const UserAvatar = ({ name, email }: { name: string, email: string }) => (
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-lg shadow-sm shrink-0">
      {(name || email || '?').charAt(0).toUpperCase()}
    </div>
  );

  // Componente Badge Stato Riutilizzabile
  const StatusBadge = ({ status }: { status: string }) => (
    <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-bold rounded-full items-center gap-1.5 ${
      status === 'active' 
        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' 
        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${status === 'active' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
      {status === 'active' ? 'Attivo' : 'Disabilitato'}
    </span>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white font-sans pb-20 md:pb-0">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[150] px-6 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-in slide-in-from-top-4 ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-500 text-white'}`}>
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span className="font-bold text-sm">{toast.msg}</span>
        </div>
      )}

      {/* Header Responsivo */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-auto md:h-20 py-3 md:py-0 flex flex-wrap md:flex-nowrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500 p-2 rounded-xl text-white shadow-lg shadow-emerald-200 dark:shadow-none">
              <Shield size={20} />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-black text-gray-800 dark:text-white tracking-tight leading-none">MintFlow <span className="text-emerald-500">Admin</span></h1>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest hidden sm:block">Pannello di Controllo</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 ml-auto">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-xl">
              <Users size={16} />
              <span className="font-bold text-xs">{users.length} Utenti</span>
            </div>
             <button 
              type="button"
              onClick={() => setShowSqlModal(true)}
              className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-100 transition-colors"
              title="Script Database"
            >
              <Database size={18} />
            </button>
            <button 
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-600 dark:text-gray-300 hover:text-red-600 transition-colors rounded-xl font-bold text-xs"
            >
              <LogOut size={18} /> <span className="hidden sm:inline">Esci</span>
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6">
        
        {/* Search Bar */}
        <div className="mb-6 relative flex gap-3">
            <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Cerca utente..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border-none shadow-sm bg-white dark:bg-gray-800 focus:ring-2 focus:ring-emerald-500 outline-none text-gray-700 dark:text-gray-200 font-medium text-sm transition-all"
                />
            </div>
        </div>

        {error && (
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-2xl border border-red-100 dark:border-red-800 mb-6 flex items-start gap-3 cursor-pointer" onClick={() => setShowSqlModal(true)}>
                <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={24} />
                <div>
                  <h3 className="font-bold text-red-600 dark:text-red-400 text-sm">Database non configurato</h3>
                  <p className="text-xs text-red-500/80 mt-1">Clicca qui per vedere lo script SQL necessario (Aggiornato).</p>
                </div>
            </div>
        )}

        {/* --- DESKTOP VIEW (TABLE) --- */}
        <div className="hidden md:block bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Utente</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Stato</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Ultimo Accesso</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {loading ? (
                    <tr><td colSpan={4} className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-emerald-500" size={32} /></td></tr>
                ) : filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <UserAvatar name={user.display_name} email={user.email} />
                        <div className="ml-4">
                          <div className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            {user.display_name || 'Utente senza nome'}
                            {user.role === 'admin' && <span className="bg-purple-100 text-purple-600 text-[9px] px-1.5 py-0.5 rounded uppercase font-black tracking-wide">Admin</span>}
                          </div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={user.status} /></td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-medium">
                      {user.last_login ? format(new Date(user.last_login), 'dd MMM yyyy HH:mm', { locale: it }) : 'Mai'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {user.email !== 'admin@mintflow.com' && (
                        // Removed opacity-50 and hover effect for better reliability on all devices
                        <div className="flex items-center justify-end gap-2">
                          <button type="button" onClick={() => { setSelectedUser(user); setShowNotifyModal(true); }} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"><Bell size={18} /></button>
                          <button type="button" onClick={() => { setSelectedUser(user); setShowPasswordModal(true); }} className="p-2 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"><Key size={18} /></button>
                          
                          {/* PULSANTE GESTIONE STATO UTENTE (RIMOSSO CESTINO DEFINITIVO) */}
                          {user.status === 'active' ? (
                            <button 
                              type="button"
                              onClick={(e) => handleToggleStatus(user.id, e)} 
                              className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              title="Disabilita Utente"
                            >
                              <Ban size={18} />
                            </button>
                          ) : (
                            <button 
                              type="button"
                              onClick={(e) => handleToggleStatus(user.id, e)} 
                              className="p-2 rounded-lg text-emerald-600 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 transition-colors font-bold shadow-sm ring-1 ring-emerald-500/30"
                              title="Riattiva Utente Disabilitato"
                            >
                              <CheckCircle2 size={18} />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* --- MOBILE VIEW (CARDS) --- */}
        <div className="md:hidden space-y-4">
          {loading ? (
             <div className="text-center py-10"><Loader2 className="animate-spin mx-auto text-emerald-500" size={32} /></div>
          ) : filteredUsers.map((user) => (
            <div key={user.id} className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
               <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                     <UserAvatar name={user.display_name} email={user.email} />
                     <div>
                        <div className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                           {user.display_name || 'No Name'}
                           {user.role === 'admin' && <span className="bg-purple-100 text-purple-600 text-[9px] px-1.5 py-0.5 rounded uppercase font-black">Admin</span>}
                        </div>
                        <p className="text-xs text-gray-500 truncate max-w-[180px]">{user.email}</p>
                     </div>
                  </div>
                  <StatusBadge status={user.status} />
               </div>

               <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-4 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl">
                  <span>Ultimo accesso:</span>
                  <span className="font-bold">{user.last_login ? format(new Date(user.last_login), 'dd MMM HH:mm', { locale: it }) : 'Mai'}</span>
               </div>

               {user.email !== 'admin@mintflow.com' && (
                 <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                    <button type="button" onClick={() => { setSelectedUser(user); setShowNotifyModal(true); }} className="flex flex-col items-center justify-center p-2 rounded-xl text-blue-500 bg-blue-50 dark:bg-blue-900/10 active:scale-95 transition-transform">
                       <Bell size={18} />
                       <span className="text-[9px] font-bold mt-1">Notifica</span>
                    </button>
                    <button type="button" onClick={() => { setSelectedUser(user); setShowPasswordModal(true); }} className="flex flex-col items-center justify-center p-2 rounded-xl text-amber-500 bg-amber-50 dark:bg-amber-900/10 active:scale-95 transition-transform">
                       <Key size={18} />
                       <span className="text-[9px] font-bold mt-1">Pwd</span>
                    </button>
                    
                    {/* PULSANTE MOBILE */}
                    <button 
                        type="button"
                        onClick={(e) => handleToggleStatus(user.id, e)} 
                        className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all border active:scale-95 ${
                            user.status === 'active' 
                                ? 'text-gray-500 bg-gray-100 border-transparent' 
                                : 'text-emerald-600 bg-emerald-100 border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-800'
                        }`}
                    >
                       {user.status === 'active' ? <Ban size={18} /> : <CheckCircle2 size={18} />}
                       <span className="text-[9px] font-bold mt-1">{user.status === 'active' ? 'Blocca' : 'Riattiva'}</span>
                    </button>
                 </div>
               )}
            </div>
          ))}
          {!loading && filteredUsers.length === 0 && (
             <div className="p-12 text-center text-gray-400 bg-white dark:bg-gray-800 rounded-2xl">
               <Users size={32} className="mx-auto mb-2 opacity-20" />
               <p className="text-sm">Nessun utente trovato.</p>
             </div>
          )}
        </div>
      </main>

      {/* Modal SQL Script */}
      {showSqlModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[150] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 rounded-[2rem] w-full max-w-2xl p-6 md:p-8 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold dark:text-white flex items-center gap-2">
                        <Terminal className="text-emerald-500" size={24} /> Script Manutenzione
                    </h3>
                    <button type="button" onClick={() => setShowSqlModal(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                </div>
                
                <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl mb-4 flex items-start gap-3">
                    <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={20} />
                    <p className="text-sm text-amber-700 dark:text-amber-400">
                        Esegui questo script nel <strong>Supabase SQL Editor</strong> per configurare il database correttamente (inclusa la tabella notifiche).
                    </p>
                </div>

                <div className="bg-gray-900 p-4 rounded-xl mb-4 relative group">
                    <pre className="text-xs text-gray-300 font-mono overflow-x-auto whitespace-pre-wrap">
                        {sqlImportScript}
                    </pre>
                    <button 
                        type="button"
                        onClick={() => { navigator.clipboard.writeText(sqlImportScript); showToast("Copiato negli appunti!"); }}
                        className="absolute top-2 right-2 p-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-opacity"
                        title="Copia"
                    >
                        <Copy size={16} />
                    </button>
                </div>
                
                <div className="flex justify-end gap-3 flex-wrap">
                     <button type="button" onClick={() => setShowSqlModal(false)} className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 font-bold rounded-xl flex-1 md:flex-none">Chiudi</button>
                     <button type="button" onClick={() => { fetchUsers(); setShowSqlModal(false); }} className="px-6 py-3 bg-emerald-500 text-white font-bold rounded-xl flex-1 md:flex-none">Ho eseguito lo script</button>
                </div>
            </div>
        </div>
      )}

      {/* Modal Notifica */}
      {showNotifyModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[150] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-[2rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold dark:text-white flex items-center gap-2">
                <Send className="text-emerald-500" size={24} /> Invia Notifica
              </h3>
              <button type="button" onClick={() => setShowNotifyModal(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>
            
            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl mb-4 flex items-center gap-3">
              <UserAvatar name={selectedUser.display_name} email={selectedUser.email} />
              <div>
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Destinatario</p>
                <p className="font-bold text-gray-800 dark:text-white">{selectedUser.display_name || selectedUser.email}</p>
              </div>
            </div>

            <textarea 
              autoFocus
              value={notificationText}
              onChange={(e) => setNotificationText(e.target.value)}
              placeholder="Scrivi qui il messaggio..."
              className="w-full p-4 rounded-xl bg-gray-50 dark:bg-gray-700 border-none outline-none focus:ring-2 focus:ring-emerald-500 min-h-[120px] mb-6 dark:text-white resize-none"
            />

            <button type="button" onClick={handleSendNotification} className="w-full py-4 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-colors shadow-lg active:scale-95">Invia Messaggio</button>
          </div>
        </div>
      )}

      {/* Modal Password */}
      {showPasswordModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[150] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-[2rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold dark:text-white flex items-center gap-2">
                <Key className="text-amber-500" size={24} /> Reset Password
              </h3>
              <button type="button" onClick={() => setShowPasswordModal(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>
            
            <p className="text-sm text-gray-500 mb-6">
              Stai cambiando la password per <strong>{selectedUser.email}</strong>.
            </p>

            <div className="relative mb-6">
              <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input type="password" autoFocus value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Nuova Password" className="w-full pl-12 pr-4 py-4 rounded-xl bg-gray-50 dark:bg-gray-700 border-none outline-none focus:ring-2 focus:ring-amber-500 dark:text-white font-bold" />
            </div>

            <button type="button" onClick={handleChangePassword} className="w-full py-4 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 transition-colors shadow-lg active:scale-95">Aggiorna Password</button>
          </div>
        </div>
      )}

    </div>
  );
};