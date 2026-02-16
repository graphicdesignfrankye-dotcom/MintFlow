
import React, { useState } from 'react';
import { auth, db, supabase } from '../services/supabase';
import { PiggyBank, Mail, Lock, User, Loader2, ArrowRight, Check, Send, AlertCircle, Eye, EyeOff, ShieldCheck, MailWarning, KeyRound, ArrowLeft, Ban } from 'lucide-react';

interface AuthProps {
  onSuccess: () => void;
  onAdminLogin?: () => void;
}

export const Auth: React.FC<AuthProps> = ({ onSuccess, onAdminLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signedUpEmail, setSignedUpEmail] = useState<string | null>(null);
  const [resetSentEmail, setResetSentEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Stato per il blocco account rilevato al login
  const [isBanned, setIsBanned] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (isResetting) {
      try {
        await auth.resetPassword(email);
        setResetSentEmail(email);
      } catch (err: any) {
        setError(err.message || "Errore durante il reset della password");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (email === 'admin@mintflow.com' && password === 'admin123') {
      try {
          await auth.signIn(email, password);
      } catch (e) {
          console.warn("Admin non presente su DB, proseguo come Mock");
      }
      
      if (onAdminLogin) {
        onAdminLogin();
      }
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        // 1. Esegui il login tecnico con Supabase
        const data = await auth.signIn(email, password);
        
        if (data.user) {
          // 2. CONTROLLO IMMEDIATO DELLO STATO NEL DATABASE
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('status')
            .eq('id', data.user.id)
            .single();

          if (profile?.status === 'disabled') {
            // Se è bannato, attiviamo la Lock Screen interna e fermiamo tutto
            setIsBanned(true);
            setLoading(false);
            return;
          }
        }
        
        // 3. Se arriviamo qui, l'utente è attivo: procedi
        onSuccess();
      } else {
        await auth.signUp(email, password, username);
        setSignedUpEmail(email);
      }
    } catch (err: any) {
      if (err.message?.includes('Email not confirmed')) {
        setError("Devi confermare la tua email prima di accedere.");
        setSignedUpEmail(email);
      } else {
        setError(err.message || "Si è verificato un errore");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = async () => {
    // Esci tecnicamente per pulire la sessione "congelata"
    await auth.signOut();
    setIsBanned(false);
    setLoading(false);
  };

  // --- SCHERMATA DI BLOCCO "ALLA PORTA" ---
  if (isBanned) {
    return (
      <div className="min-h-screen bg-mint-50 dark:bg-gray-900 flex items-center justify-center p-4 animate-in fade-in duration-500">
        <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-[3.5rem] shadow-2xl p-10 md:p-12 text-center border-4 border-red-500/20 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-2 bg-red-500" />
          
          <div className="bg-red-50 dark:bg-red-900/20 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
            <Ban className="text-red-500 animate-pulse" size={48} />
          </div>
          
          <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-4 tracking-tight">Accesso Sospeso</h2>
          <p className="text-gray-500 dark:text-gray-400 font-medium mb-10 leading-relaxed">
            Il tuo account MintFlow è stato disabilitato. Non puoi accedere ai tuoi dati finché l'amministratore non riabilita il tuo profilo.
          </p>
          
          <div className="space-y-4">
             <a href="mailto:assistenza@mintflow.com" className="flex items-center justify-center gap-2 w-full py-5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-bold hover:scale-[1.02] transition-transform">
               Invia Segnalazione
             </a>
             <button 
               onClick={handleBackToLogin}
               className="w-full py-4 text-gray-400 font-bold hover:text-gray-600 dark:hover:text-gray-200 transition-colors text-sm"
             >
               Torna alla maschera di login
             </button>
          </div>

          <p className="mt-12 text-[10px] text-gray-300 font-bold uppercase tracking-[0.3em]">MintFlow Security Shield</p>
        </div>
      </div>
    );
  }

  // --- RENDERING NORMALE DEL LOGIN (Reso esistente) ---
  if (resetSentEmail) {
    return (
      <div className="min-h-screen bg-mint-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl p-8 text-center animate-in fade-in zoom-in-95 duration-300">
          <div className="bg-emerald-100 dark:bg-emerald-900/30 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <KeyRound className="text-emerald-600 dark:text-emerald-400" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Link inviato!</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Abbiamo inviato le istruzioni per il reset a <br/>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">{resetSentEmail}</span>
          </p>
          <button
            onClick={() => { setResetSentEmail(null); setIsResetting(false); setIsLogin(true); }}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-2xl font-bold transition-all shadow-lg"
          >
            Torna al Login
          </button>
        </div>
      </div>
    );
  }

  if (signedUpEmail && !isLogin) {
    return (
      <div className="min-h-screen bg-mint-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl p-8 md:p-10 border border-emerald-100 dark:border-gray-700 text-center animate-in fade-in zoom-in-95 duration-300">
          <div className="bg-emerald-100 dark:bg-emerald-900/30 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <Send className="text-emerald-600 dark:text-emerald-400" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Ci siamo quasi!</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Abbiamo inviato un link di conferma a <br/>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-lg mt-1 inline-block">{signedUpEmail}</span>
          </p>
          
          <div className="bg-amber-50 dark:bg-amber-900/20 p-5 rounded-2xl border border-amber-100 dark:border-amber-900/30 text-left mb-8 flex gap-4 shadow-sm">
            <MailWarning className="text-amber-500 shrink-0 mt-1" size={24} />
            <div className="space-y-2">
                <p className="text-sm font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wide">
                  ⚠️ Importante: Controlla lo SPAM
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                  L'email potrebbe finire nella cartella <strong>Posta Indesiderata</strong> o <strong>Promozioni</strong>.
                </p>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={async () => {
                if (!signedUpEmail) return;
                setResending(true);
                try {
                  await auth.resendConfirmation(signedUpEmail);
                  alert("Email reinviata! Controlla di nuovo.");
                } catch (err: any) {
                  setError("Errore nel rinvio: " + err.message);
                } finally {
                  setResending(false);
                }
              }}
              disabled={resending}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-100 dark:shadow-none disabled:opacity-50"
            >
              {resending ? <Loader2 className="animate-spin" size={20} /> : 'Non ho ricevuto nulla, Reinvia'}
            </button>
            <button
              onClick={() => { setSignedUpEmail(null); setIsLogin(true); }}
              className="w-full py-4 text-emerald-600 dark:text-emerald-400 font-bold hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-2xl transition-colors text-sm"
            >
              Torna al login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mint-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl p-8 border border-emerald-100 dark:border-gray-700 animate-in zoom-in-95 duration-300">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-emerald-500 p-4 rounded-2xl text-white mb-4 shadow-lg shadow-emerald-200">
            {isResetting ? <KeyRound size={32} /> : <PiggyBank size={32} />}
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {isResetting ? 'Recupero Password' : 'MintFlow'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {isResetting 
              ? 'Ti invieremo un link per resettare la password' 
              : isLogin ? 'Accedi al tuo account cloud' : 'Crea il tuo profilo finanziario'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-xl border border-red-100 dark:border-red-900/30 flex items-center gap-2">
            <AlertCircle size={16} />
            <span className="flex-1">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && !isResetting && (
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Nome Utente"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-12 pr-5 py-4 rounded-2xl bg-gray-50 dark:bg-gray-700 border-2 border-transparent focus:border-emerald-500 outline-none dark:text-white transition-all font-medium"
                required={!isLogin && !isResetting}
              />
            </div>
          )}

          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-12 pr-5 py-4 rounded-2xl bg-gray-50 dark:bg-gray-700 border-2 border-transparent focus:border-emerald-500 outline-none dark:text-white transition-all font-medium"
              required
            />
          </div>

          {!isResetting && (
            <>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-4 rounded-2xl bg-gray-50 dark:bg-gray-700 border-2 border-transparent focus:border-emerald-500 outline-none dark:text-white transition-all font-medium"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {isLogin && (
                <div className="flex justify-end px-2">
                  <button
                    type="button"
                    onClick={() => { setIsResetting(true); setError(null); }}
                    className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    Password dimenticata?
                  </button>
                </div>
              )}
            </>
          )}

          {isLogin && !isResetting && (
            <div className="flex items-center gap-2 px-2">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div 
                  onClick={() => setRememberMe(!rememberMe)}
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                    rememberMe 
                      ? 'bg-emerald-500 border-emerald-500' 
                      : 'border-gray-200 dark:border-gray-600 bg-transparent'
                  }`}
                >
                  {rememberMe && <Check size={14} className="text-white" />}
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400 font-medium select-none">Rimani collegato</span>
              </label>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-xl shadow-emerald-200 dark:shadow-none disabled:opacity-70 mt-6"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                {isResetting ? 'Invia link di recupero' : isLogin ? 'Accedi' : 'Iscriviti'}
                <ArrowRight size={20} />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center space-y-4">
          {isResetting ? (
            <button
              onClick={() => { setIsResetting(false); setError(null); }}
              className="text-emerald-600 dark:text-emerald-400 font-bold text-sm flex items-center justify-center gap-2 w-full hover:underline"
            >
              <ArrowLeft size={16} /> Torna al login
            </button>
          ) : (
            <button
              onClick={() => { setIsLogin(!isLogin); setError(null); }}
              className="text-emerald-600 dark:text-emerald-400 font-bold text-sm hover:underline block w-full"
            >
              {isLogin ? 'Non hai un account? Iscriviti' : 'Hai già un account? Accedi'}
            </button>
          )}
          
           <div className="text-[10px] text-gray-300 dark:text-gray-600 flex items-center justify-center gap-1">
            <ShieldCheck size={12} />
            <span>Admin Demo: admin@mintflow.com / admin123</span>
          </div>
        </div>
      </div>
    </div>
  );
};
