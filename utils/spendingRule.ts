import type { Expense, SpendingRule, UserSettings } from '../types';

// Regola storica: prima era scritta nel codice per la categoria "Benzina".
// Resta valida per chi ha già le impostazioni salvate senza una scelta esplicita.
export const LEGACY_SPENDING_RULE: SpendingRule = {
  enabled: true,
  category: 'Benzina',
  walletMethods: ['App Q8', 'App Club Q8'],
  refillMethods: ['Prepagata Revolut']
};

// Un nuovo utente parte senza regola e può attivarla dalle Impostazioni.
export const NO_SPENDING_RULE: SpendingRule = {
  enabled: false,
  category: '',
  walletMethods: [],
  refillMethods: []
};

export const resolveSpendingRule = (settings?: Pick<UserSettings, 'spendingRule'> | null): SpendingRule =>
  settings?.spendingRule ?? LEGACY_SPENDING_RULE;

// Unisce le impostazioni salvate (locali o cloud) a quelle attuali: se non hanno una scelta
// sulla regola, l'utente esisteva già e mantiene la regola storica.
export const mergeSavedSettings = <T extends Partial<UserSettings>>(base: T, saved: Partial<UserSettings>): T => ({
  ...base,
  ...saved,
  spendingRule: saved.spendingRule ?? LEGACY_SPENDING_RULE
});

const matches = (e: Pick<Expense, 'category' | 'paymentMethod'>, rule: SpendingRule, methods: string[]) =>
  rule.enabled && !!rule.category && e.category === rule.category && methods.includes(e.paymentMethod as string);

// Una ricarica pagata con questo metodo conta come spesa vera (di norma le ricariche non contano)
export const refillCountsAsSpending = (e: Pick<Expense, 'category' | 'paymentMethod'>, rule: SpendingRule) =>
  matches(e, rule, rule.refillMethods);

// La spesa è già stata contata quando si è ricaricato il portafoglio: non va contata di nuovo
export const isCountedAtRefill = (e: Pick<Expense, 'category' | 'paymentMethod'>, rule: SpendingRule) =>
  matches(e, rule, rule.walletMethods);
