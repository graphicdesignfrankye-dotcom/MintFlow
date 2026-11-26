import React, { useEffect, useState } from 'react';
import { Smartphone, Copy, Check, KeyRound, Loader2, Trash2, ChevronDown } from 'lucide-react';
import { ApiToken } from '../types';
import { pending } from '../services/supabase';
import { generateApiToken, sha256Hex } from '../utils/apiToken';
import { ConfirmModal } from './ConfirmModal';

interface AutoPaymentsCardProps {
  userId?: string;
}

const formatWhen = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null;

const CopyField: React.FC<{ label: string; value: string }> = ({ label, value }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* senza permesso per gli appunti l'utente può copiare a mano */ }
  };
  return (
    <div>
      <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">{label}</span>
      <div className="flex items-stretch gap-2">
        <code className="flex-1 min-w-0 break-all bg-gray-50 dark:bg-gray-700 dark:text-white px-4 py-3 rounded-2xl text-xs font-mono select-all">{value}</code>
        <button
          type="button"
          onClick={copy}
          className="shrink-0 px-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center gap-1.5 hover:bg-emerald-100 transition-all active:scale-95"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copiato' : 'Copia'}
        </button>
      </div>
    </div>
  );
};

export const AutoPaymentsCard: React.FC<AutoPaymentsCardProps> = ({ userId }) => {
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [revokeId, setRevokeId] = useState<string | null>(null);

  const endpoint = `${window.location.origin}/api/pending`;

  const load = async () => {
    if (!userId) return;
    try {
      setTokens(await pending.listTokens(userId));
      setError(null);
    } catch (e: any) {
      setError('Non riesco a leggere i codici. Se hai appena aggiornato il database riprova tra poco.');
      console.error('Errore lettura codici:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [userId]);

  const handleGenerate = async () => {
    if (!userId || busy) return;
    setBusy(true);
    setError(null);
    try {
      const token = generateApiToken();
      await pending.createToken(userId, await sha256Hex(token));
      setNewToken(token);
      setGuideOpen(true);
      await load();
    } catch (e: any) {
      setError('Impossibile creare il codice: ' + (e?.message || 'errore sconosciuto'));
    } finally {
      setBusy(false);
    }
  };

  const handleRevoke = async () => {
    if (!revokeId) return;
    try {
      await pending.revokeToken(revokeId);
      setNewToken(null);
      await load();
    } catch (e: any) {
      setError('Impossibile revocare il codice: ' + (e?.message || 'errore sconosciuto'));
    } finally {
      setRevokeId(null);
    }
  };

  const steps: { title: string; body: React.ReactNode }[] = [
    {
      title: 'Crea l\'automazione',
      body: <>Apri l'app <b>Comandi</b> sull'iPhone, vai su <b>Automazione</b> e tocca <b>+</b>. Scegli <b>Transazione</b>, seleziona le carte da usare (anche <b>Qualsiasi carta</b>) e imposta <b>Esegui immediatamente</b>.</>
    },
    {
      title: 'Aggiungi l\'azione "Ottieni contenuto dell\'URL"',
      body: <>Nell'URL incolla l'indirizzo qui sopra. Apri <b>Mostra altro</b> e imposta <b>Metodo: POST</b>.</>
    },
    {
      title: 'Aggiungi l\'intestazione con il codice',
      body: <>In <b>Intestazioni</b> aggiungi: nome <code className="font-mono">Authorization</code>, valore <code className="font-mono">Bearer </code> seguito dal tuo codice (con uno spazio in mezzo).</>
    },
    {
      title: 'Imposta il corpo della richiesta',
      body: (
        <>
          In <b>Corpo della richiesta</b> scegli <b>JSON</b> e aggiungi tre campi di tipo testo, usando le variabili della transazione:
          <ul className="mt-2 space-y-1 text-[12px]">
            <li><code className="font-mono">esercente</code> → variabile <b>Esercente</b></li>
            <li><code className="font-mono">importo</code> → variabile <b>Importo</b></li>
            <li><code className="font-mono">carta</code> → variabile <b>Carta o biglietto</b></li>
          </ul>
          <p className="mt-2 text-[12px] text-gray-400">Facoltativo: un campo <code className="font-mono">data</code> con la <b>Data corrente</b> in formato <b>ISO 8601</b>. Se manca, vale l'ora di arrivo.</p>
        </>
      )
    },
    {
      title: 'Prova',
      body: <>Al prossimo pagamento con Apple Pay la spesa compare qui in <b>Da confermare</b>, accanto alla campanella. Se non vuoi vedere il riquadro di conferma di Comandi, disattiva <b>Notifica quando viene eseguita</b>.</>
    }
  ];

  return (
    <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] border border-emerald-100 dark:border-gray-700 shadow-sm">
      <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
        <Smartphone className="text-emerald-500" size={20} /> Pagamenti automatici
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
        Quando paghi con Apple Pay, l'iPhone invia la spesa a MintFlow, che la mette in <b>Da confermare</b>. Tu controlli categoria e portafoglio e la registri con un tocco.
        Serve un codice personale e un Comando sull'iPhone.
      </p>

      {error && <p className="mt-4 text-xs font-bold text-red-500">{error}</p>}

      {newToken && (
        <div className="mt-6 p-5 rounded-2xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-700/40 space-y-3 animate-in fade-in duration-300">
          <p className="text-xs font-bold text-amber-700 dark:text-amber-400 leading-relaxed">
            Ecco il tuo codice. Copialo adesso: per sicurezza non viene più mostrato. Se lo perdi, revocalo e creane uno nuovo.
          </p>
          <CopyField label="Codice personale" value={newToken} />
        </div>
      )}

      <div className="mt-6 space-y-3">
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-gray-400"><Loader2 size={14} className="animate-spin" /> Carico i codici...</div>
        ) : tokens.length === 0 ? (
          <p className="text-xs text-gray-400">Non hai ancora nessun codice attivo.</p>
        ) : (
          tokens.map(t => (
            <div key={t.id} className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-gray-50 dark:bg-gray-700/50">
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2"><KeyRound size={14} className="text-emerald-500" /> {t.label}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Creato il {formatWhen(t.created_at)} · {t.last_used_at ? `ultimo uso ${formatWhen(t.last_used_at)}` : 'mai usato'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRevokeId(t.id)}
                className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-red-500 bg-red-50 dark:bg-red-900/10 text-xs font-bold hover:bg-red-100 transition-all active:scale-95"
              >
                <Trash2 size={14} /> Revoca
              </button>
            </div>
          ))
        )}
      </div>

      <button
        type="button"
        onClick={handleGenerate}
        disabled={busy || !userId}
        className="mt-5 w-full flex items-center justify-center gap-2 py-3.5 bg-emerald-500 text-white rounded-2xl font-bold text-sm hover:bg-emerald-600 transition-all active:scale-95 disabled:opacity-50"
      >
        {busy ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
        {tokens.length === 0 ? 'Genera il codice' : 'Genera un nuovo codice'}
      </button>

      <button
        type="button"
        onClick={() => setGuideOpen(o => !o)}
        className="mt-5 w-full flex items-center justify-between text-sm font-bold text-gray-600 dark:text-gray-300 px-1"
      >
        Come configurare il Comando sull'iPhone
        <ChevronDown size={18} className={`transition-transform ${guideOpen ? 'rotate-180' : ''}`} />
      </button>

      {guideOpen && (
        <div className="mt-4 space-y-4 animate-in fade-in duration-300">
          <CopyField label="Indirizzo a cui inviare i pagamenti" value={endpoint} />
          <ol className="space-y-3">
            {steps.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-xs font-black flex items-center justify-center">{i + 1}</span>
                <div className="text-[13px] text-gray-600 dark:text-gray-300 leading-relaxed">
                  <p className="font-bold text-gray-800 dark:text-white">{s.title}</p>
                  <div className="mt-0.5">{s.body}</div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      <ConfirmModal
        isOpen={!!revokeId}
        title="Revoca il codice"
        message="Il Comando che usa questo codice smetterà di funzionare. Le spese già ricevute restano dove sono."
        onConfirm={handleRevoke}
        onCancel={() => setRevokeId(null)}
        confirmText="Revoca"
        type="danger"
      />
    </div>
  );
};
