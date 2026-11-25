import { createHash } from 'node:crypto';

// Funzione server (Vercel): riceve un pagamento dal Comando dell'iPhone (Apple Pay) e lo salva come
// bozza "Da confermare". L'utente si riconosce dal codice personale in "Authorization: Bearer <codice>".
// Il codice lo controlla il database (funzione ingest_pending_expense, vedi sql/pending-expenses.sql):
// qui non ci sono chiavi segrete, solo la chiave pubblica dell'app.

// Valori pubblici per progettazione, gli stessi usati dal client in services/supabase.ts
const SUPABASE_URL = 'https://jpcweqcqysxgzycftzyv.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_qdb7pW6R-6vvGaoeuGE5fw_xuPgZweE';

const MAX_MERCHANT = 120;
const MAX_CARD = 60;
const MAX_AMOUNT = 100_000;
const MAX_AGE_MS = 7 * 24 * 3600 * 1000; // una data più vecchia di 7 giorni non è credibile: uso l'ora di arrivo
const MAX_FUTURE_MS = 10 * 60 * 1000;
const DEDUPE_BUCKET_MS = 2 * 60 * 1000;  // senza data dal Comando, due invii entro 2 minuti sono lo stesso pagamento

const CURRENCY_BY_SYMBOL: Record<string, string> = { '€': 'EUR', '$': 'USD', '£': 'GBP', '¥': 'JPY' };

// "4,30 €", "1.234,56", "-12.50 EUR", 7.5 ... -> importo e valuta. Il segno meno indica un rimborso.
const parseAmount = (raw: unknown): { amount: number; currency: string } | null => {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? { amount: Math.round(raw * 100) / 100, currency: 'EUR' } : null;
  }
  if (typeof raw !== 'string') return null;
  const text = raw.trim();
  if (!text || text.length > 40) return null;

  let currency = 'EUR';
  const symbol = Object.keys(CURRENCY_BY_SYMBOL).find(s => text.includes(s));
  const code = text.toUpperCase().match(/\b[A-Z]{3}\b/);
  if (symbol) currency = CURRENCY_BY_SYMBOL[symbol];
  else if (code) currency = code[0];

  // Tengo solo cifre, separatori e segno (anche il meno tipografico)
  let n = text.replace(/[−–—]/g, '-').replace(/[^\d.,-]/g, '');
  const negative = n.startsWith('-') || n.endsWith('-');
  n = n.replace(/-/g, '');
  if (!/\d/.test(n)) return null;

  const lastComma = n.lastIndexOf(',');
  const lastDot = n.lastIndexOf('.');
  if (lastComma >= 0 && lastDot >= 0) {
    // il separatore che sta per ultimo è quello dei decimali
    n = lastComma > lastDot ? n.replace(/\./g, '').replace(',', '.') : n.replace(/,/g, '');
  } else if (lastComma >= 0) {
    n = n.replace(/\./g, '').replace(',', '.');           // 4,30 (italiano)
  } else if (lastDot >= 0 && /^\d{1,3}(\.\d{3})+$/.test(n)) {
    n = n.replace(/\./g, '');                             // 1.234 = mille duecento trentaquattro
  }

  const value = parseFloat(n);
  if (!Number.isFinite(value)) return null;
  const amount = Math.round((negative ? -value : value) * 100) / 100;
  return { amount, currency };
};

const cleanText = (v: unknown, max: number) =>
  typeof v === 'string' ? v.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim().slice(0, max) : '';

// Data del pagamento: ISO 8601 dal Comando se credibile, altrimenti l'ora di arrivo
const parseDate = (raw: unknown, now: number): { iso: string; fromClient: boolean } => {
  if (typeof raw === 'string' && raw.trim()) {
    const t = Date.parse(raw.trim());
    if (Number.isFinite(t) && t <= now + MAX_FUTURE_MS && t >= now - MAX_AGE_MS) {
      return { iso: new Date(t).toISOString(), fromClient: true };
    }
  }
  return { iso: new Date(now).toISOString(), fromClient: false };
};

const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');

const safeParse = (text: string) => {
  try { return JSON.parse(text); } catch { return null; }
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Metodo non consentito' });
  }

  const header: string | undefined = req.headers?.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (token.length < 20 || token.length > 200) {
    return res.status(401).json({ error: 'Codice mancante o non valido' });
  }

  const body = typeof req.body === 'string' ? safeParse(req.body) : req.body;
  if (!body || typeof body !== 'object') return res.status(400).json({ error: 'Corpo della richiesta non valido' });

  // Nomi dei campi accettati: quelli italiani del Comando e quelli in inglese
  const merchant = cleanText(body.merchant ?? body.esercente ?? body.name ?? body.nome, MAX_MERCHANT) || 'Pagamento';
  const card = cleanText(body.card ?? body.carta, MAX_CARD);
  const parsed = parseAmount(body.amount ?? body.importo);
  if (!parsed || parsed.amount === 0 || Math.abs(parsed.amount) > MAX_AMOUNT) {
    return res.status(400).json({ error: 'Importo non valido' });
  }

  const now = Date.now();
  const when = parseDate(body.date ?? body.data ?? body.occurred_at, now);

  // Identificativo del pagamento: un invio ripetuto (il Comando che riparte) non crea una seconda bozza
  const bucket = when.fromClient ? when.iso.slice(0, 19) : String(Math.floor(now / DEDUPE_BUCKET_MS));
  const dedupeKey = sha256([Math.round(parsed.amount * 100), merchant.toLowerCase(), card.toLowerCase(), bucket].join('|'));

  let response: Response;
  try {
    response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/ingest_pending_expense`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY },
      body: JSON.stringify({
        p_token: token,
        p_merchant: merchant,
        p_amount: parsed.amount,
        p_currency: parsed.currency,
        p_card: card || null,
        p_occurred_at: when.iso,
        p_dedupe_key: dedupeKey
      })
    });
  } catch {
    return res.status(502).json({ error: 'Servizio non raggiungibile, riprova' });
  }

  const text = await response.text();
  if (response.ok) {
    const status = safeParse(text);
    return res.status(200).json({ status: status === 'duplicate' ? 'duplicate' : 'created' });
  }

  // Errori del database: il codice dell'errore dice cosa è andato storto
  const error = safeParse(text) || {};
  if (error.code === '28000') return res.status(401).json({ error: 'Codice mancante o non valido' });
  if (error.code === '54000') return res.status(429).json({ error: 'Troppe richieste, riprova tra poco' });
  if (error.code === '22023') return res.status(400).json({ error: 'Dati non validi' });
  if (error.code === 'PGRST202' || error.code === '42883') return res.status(503).json({ error: 'Funzione non ancora attiva' });
  console.error('Errore salvataggio bozza:', response.status, error.code);
  return res.status(502).json({ error: 'Impossibile salvare la bozza' });
}
