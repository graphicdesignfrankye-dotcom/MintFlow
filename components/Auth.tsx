
import React, { useState } from 'react';
import { auth } from '../services/supabase';
import { CreditCard, Mail, Lock, User, Loader2, ArrowRight, Check } from 'lucide-react';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        await auth.signIn(email, password);
      } else {
        await auth.signUp(email, password, username);
        alert("Controlla la tua email per confermare l'iscrizione!");
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Si è verificato un errore");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-mint-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl p-8 border border-emerald-100 dark:border-gray-700 animate-in zoom-in-95 duration-300">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-emerald-500 p-4 rounded-2xl text-white mb-4 shadow-lg shadow-emerald-200">
            <CreditCard size={32} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">MintFlow</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {isLogin ? 'Accedi al tuo account cloud' : 'Crea il tuo profilo finanziario'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-xl border border-red-100 dark:border-red-900/30">
            {error}
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
            <button type="button" className="text-xs text-emerald-600 dark:text-emerald-400 font-bold hover:underline">
              Password dimenticata?
            </button>
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
            onClick={() => setIsLogin(!isLogin)}
            className="text-emerald-600 dark:text-emerald-400 font-bold text-sm hover:underline"
          >
            {isLogin ? 'Non hai un account? Iscriviti' : 'Hai già un account? Accedi'}
          </button>
        </div>
      </div>
    </div>
  );
};
