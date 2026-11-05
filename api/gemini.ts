import { GoogleGenAI, Type } from '@google/genai';

// Funzione server (Vercel): la chiave Gemini resta qui e non arriva mai al browser.
// Imposta GEMINI_API_KEY (senza prefisso VITE_) nelle variabili d'ambiente di Vercel.

// Valori pubblici per progettazione, gli stessi usati dal client in services/supabase.ts
const SUPABASE_URL = 'https://jpcweqcqysxgzycftzyv.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_qdb7pW6R-6vvGaoeuGE5fw_xuPgZweE';

const MODEL = 'gemini-3-flash-preview';
const PAYMENT_METHODS = ['Contanti', 'Prepagata Flash', 'Prepagata Revolut', 'App Q8', 'Bancomat', 'Wallet Extra 1', 'Wallet Extra 2', 'Wallet Extra 3'];

const MAX_EXPENSES = 50;
const MAX_IMAGE_CHARS = 4_000_000; // base64, circa 3 MB di immagine (il limite di Vercel sul corpo è 4.5 MB)
const RATE_LIMIT = 10;             // richieste per utente al minuto (per istanza, best effort)
const RATE_WINDOW_MS = 60_000;

const hits = new Map<string, number[]>();

const isRateLimited = (userId: string) => {
  const now = Date.now();
  const recent = (hits.get(userId) || []).filter(t => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) {
    hits.set(userId, recent);
    return true;
  }
  recent.push(now);
  hits.set(userId, recent);
  return false;
};

const getUserId = async (authHeader: string | undefined): Promise<string | null> => {
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) return null;
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY }
    });
    if (!r.ok) return null;
    const user = await r.json();
    return typeof user?.id === 'string' ? user.id : null;
  } catch {
    return null;
  }
};

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');

const insights = async (ai: GoogleGenAI, rawExpenses: unknown) => {
  const list = Array.isArray(rawExpenses) ? rawExpenses.slice(0, MAX_EXPENSES) : [];
  const summary = list.map((e: any) => ({
    date: str(e?.date, 10),
    amount: Number(e?.amount) || 0,
    category: str(e?.category, 60),
    paymentMethod: str(e?.paymentMethod, 40),
    desc: str(e?.description, 100)
  }));

  const prompt = `Analizza queste spese mensili e fornisci 3 insight utili per risparmiare o capire meglio le abitudini di spesa.
  Spese: ${JSON.stringify(summary)}

  Sii amichevole, conciso e motivante. Parla in italiano.
  Ritorna un array JSON di oggetti con title, advice e type ('saving', 'warning', 'tip').`;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            advice: { type: Type.STRING },
            type: { type: Type.STRING }
          },
          required: ['title', 'advice', 'type']
        }
      }
    }
  });
  return JSON.parse(response.text || '[]');
};

const receipt = async (ai: GoogleGenAI, image: string) => {
  const prompt = `Analizza questa immagine di uno scontrino o ricevuta.
  Estrai:
  1. Una breve descrizione (es: Nome negozio o prodotto principale)
  2. L'importo totale (numero decimale)
  3. La categoria più adatta esclusivamente tra queste: Sigarette, Benzina, Autostrada, Ricarica Chiavetta, Svago, Salute, Altro.
  4. Il metodo di pagamento probabile tra questi: Contanti, Prepagata Flash, Prepagata Revolut, App Q8. Se non è chiaro o ci sono riferimenti a carte generiche

  Ritorna solo JSON.`;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: {
      parts: [
        { inlineData: { mimeType: 'image/jpeg', data: image.split(',')[1] || image } },
        { text: prompt }
      ]
    },
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          description: { type: Type.STRING },
          amount: { type: Type.NUMBER },
          category: { type: Type.STRING },
          paymentMethod: { type: Type.STRING, enum: PAYMENT_METHODS }
        },
        required: ['description', 'amount', 'category', 'paymentMethod']
      }
    }
  });
  return JSON.parse(response.text || '{}');
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Metodo non consentito' });
  }

  const userId = await getUserId(req.headers?.authorization);
  if (!userId) return res.status(401).json({ error: 'Non autorizzato' });
  if (isRateLimited(userId)) return res.status(429).json({ error: 'Troppe richieste, riprova tra un minuto' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY non configurata sul server' });

  const body = typeof req.body === 'string' ? safeParse(req.body) : req.body;
  const ai = new GoogleGenAI({ apiKey });

  try {
    if (body?.action === 'insights') {
      return res.status(200).json({ insights: await insights(ai, body.expenses) });
    }
    if (body?.action === 'receipt') {
      const image = typeof body.image === 'string' ? body.image : '';
      if (!image) return res.status(400).json({ error: 'Immagine mancante' });
      if (image.length > MAX_IMAGE_CHARS) return res.status(413).json({ error: 'Immagine troppo grande' });
      return res.status(200).json({ receipt: await receipt(ai, image) });
    }
    return res.status(400).json({ error: 'Azione non valida' });
  } catch (error) {
    console.error('Gemini error:', error);
    return res.status(502).json({ error: 'Errore del servizio AI' });
  }
}

function safeParse(text: string) {
  try { return JSON.parse(text); } catch { return null; }
}
