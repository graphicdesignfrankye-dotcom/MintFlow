
import React, { useState } from 'react';
import { auth } from '../services/supabase';
import { PiggyBank, Mail, Lock, User, Loader2, ArrowRight, Check, Send, AlertCircle } from 'lucide-react';

interface AuthProps {
  onSuccess: () => void;
}

export const Auth: React.FC<AuthProps> = ({ onSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signedUpEmail, setSignedUpEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        await auth.signIn(email, password);
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

  const handleResend = async () => {
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
  };

  if (signedUpEmail && !isLogin) {
    return (
      <div className="min-h-screen bg-mint-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl p-10 border border-emerald-100 dark:border-gray-700 text-center animate-in fade-in zoom-in-95 duration-300">
          <div className="bg-emerald-100 dark:bg-emerald-900/30 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Send className="text-emerald-600 dark:text-emerald-400" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Controlla la tua posta!</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Abbiamo inviato un link di conferma a <span className="font-bold text-emerald-600">{signedUpEmail}</span>.
          </p>
          
          <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-2xl border border-amber-100 dark:border-amber-900/30 text-left mb-8 flex gap-3">
            <AlertCircle className="text-amber-500 shrink-0" size={20} />
            <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
              <strong>Non la trovi?</strong> Controlla la cartella <strong>Spam</strong> o <strong>Promozioni</strong>. A volte i servizi gratuiti impiegano qualche minuto.
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleResend}
              disabled={resending}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50"
            >
              {resending ? <Loader2 className="animate-spin" size={20} /> : 'Reinvia email di conferma'}
            </button>
            <button
              onClick={() => { setSignedUpEmail(null); setIsLogin(true); }}
              className="w-full py-4 text-emerald-600 dark:text-emerald-400 font-bold hover:underline text-sm"
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
            <PiggyBank size={32} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">MintFlow</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {isLogin ? 'Accedi al tuo account cloud' : 'Crea il tuo profilo finanziario'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-xl border border-red-100 dark:border-red-900/30 flex items-center gap-2">
            <AlertCircle size={16} />
            <span className="flex-1">{error}</span>
            {error.includes('confermare') && (
              <button onClick={handleResend} className="text-[10px] bg-red-100 dark:bg-red-800 px-2 py-1 rounded font-bold uppercase">Reinvia</button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Nome Utente"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-12 pr-5 py-4 rounded-2xl bg-gray-50 dark:bg-gray-700 border-2 border-transparent focus:border-emerald-500 dark:focus:border-emerald-500 outline-none dark:text-white transition-all font-medium"
                required={!isLogin}
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
              className="w-full pl-12 pr-5 py-4 rounded-2xl bg-gray-50 dark:bg-gray-700 border-2 border-transparent focus:border-emerald-500 dark:focus:border-emerald-500 outline-none dark:text-white transition-all font-medium"
              required
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-12 pr-5 py-4 rounded-2xl bg-gray-50 dark:bg-gray-700 border-2 border-transparent focus:border-emerald-500 dark:focus:border-emerald-500 outline-none dark:text-white transition-all font-medium"
              required
            />
          </div>

          <div className="flex items-center justify-between px-2">
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

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-xl shadow-emerald-200 dark:shadow-none disabled:opacity-70 mt-6"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                {isLogin ? 'Accedi' : 'Iscriviti'}
                <ArrowRight size={20} />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button
            onClick={() => { setIsLogin(!isLogin); setError(null); }}
            className="text-emerald-600 dark:text-emerald-400 font-bold text-sm hover:underline"
          >
            {isLogin ? 'Non hai un account? Iscriviti' : 'Hai già un account? Accedi'}
          </button>
        </div>
      </div>
    </div>
  );
};
