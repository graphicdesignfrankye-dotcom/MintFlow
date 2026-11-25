import { Expense, PaymentMethod, PendingExpense, UserSettings } from '../types';

export interface PendingSuggestion {
  category?: string;
  paymentMethod?: PaymentMethod;
  walletName?: string;
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

// Parole troppo comuni per riconoscere un portafoglio dal nome della carta
const GENERIC = new Set(['visa', 'mastercard', 'carta', 'card', 'di', 'del', 'la', 'il', 'prepagata', 'wallet', 'debit', 'credit', 'credito', 'debito']);
const words = (s: string) => norm(s).split(/[^a-z0-9àèéìòù]+/).filter(w => w.length > 1 && !GENERIC.has(w));

export const walletNameOf = (settings: UserSettings, method: string) =>
  method === PaymentMethod.Bancomat ? 'Bancomat' : settings.wallets.find(w => w.method === method)?.name;

// Propone categoria e portafoglio: prima lo storico dello stesso esercente, poi il collegamento carta -> portafoglio
// imparato in passato, infine un confronto tra il nome della carta e i nomi dei portafogli.
export const suggestFor = (p: Pick<PendingExpense, 'merchant' | 'card'>, expenses: Expense[], settings: UserSettings): PendingSuggestion => {
  const merchant = norm(p.merchant);
  const past = expenses
    .filter(e => !e.isExtra && norm(e.description) === merchant)
    .sort((a, b) => b.date.localeCompare(a.date));

  const category = past.map(e => e.category).find(c => settings.categories.some(cat => cat.name === c));

  let method: string | undefined;
  const cardKey = p.card ? norm(p.card) : '';
  const learned = cardKey ? settings.cardWallets?.[cardKey] : undefined;
  const validMethods = new Set<string>([PaymentMethod.Bancomat, ...settings.wallets.map(w => w.method as string)]);
  if (learned && validMethods.has(learned)) method = learned;

  if (!method && cardKey) {
    const cw = new Set(words(cardKey));
    const match = settings.wallets.find(w => words(w.name).some(x => cw.has(x)));
    if (match) method = match.method;
  }
  if (!method && past[0] && validMethods.has(past[0].paymentMethod as string)) method = past[0].paymentMethod as string;

  return {
    category,
    paymentMethod: method as PaymentMethod | undefined,
    walletName: method ? walletNameOf(settings, method) : undefined
  };
};

// Valuta del pagamento diversa da quella dell'app: l'importo non si può registrare così com'è
const SYMBOL_TO_CODE: Record<string, string> = { '€': 'EUR', '$': 'USD', '£': 'GBP' };
export const isForeignCurrency = (p: Pick<PendingExpense, 'currency'>, settings: UserSettings) =>
  (SYMBOL_TO_CODE[settings.currency] || 'EUR') !== p.currency;

export const cardKeyOf = (card: string | null) => (card ? norm(card) : '');
