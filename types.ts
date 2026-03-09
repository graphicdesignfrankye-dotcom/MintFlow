
export enum PaymentMethod {
  Contanti = 'Contanti',
  Flash = 'Prepagata Flash',
  Revolut = 'Prepagata Revolut',
  AppQ8 = 'App Q8',
  Bancomat = 'Bancomat',
  Wallet4 = 'Wallet Extra 1',
  Wallet5 = 'Wallet Extra 2',
  Wallet6 = 'Wallet Extra 3'
}

export interface CategoryConfig {
  id: string;
  name: string;
  isSubscriptionDefault?: boolean;
  color?: string;
}

export type ProfileType = 'personal' | 'joint';

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  paymentMethod: PaymentMethod;
  date: string;
  isSubscription?: boolean;
  profile?: ProfileType; 
  isExtra?: boolean; // Nuovo: Indica se è una spesa Extra
  extraType?: 'given' | 'received'; // Nuovo: Dato o Ricevuto
  _isLocal?: boolean; // Flag per indicare se la spesa è salvata solo localmente (non sincronizzata)
}

export interface WalletConfig {
  id: string;
  name: string;
  method: PaymentMethod;
  icon: 'zap' | 'wallet' | 'fuel' | 'credit-card';
  balanceOffset?: number; // Saldo manuale (offset)
}

export interface UserSettings {
  name: string;
  monthlyBudget: number; // Budget Personale
  jointBudget?: number;  // Budget Cointestato
  currency: string;
  isDarkMode: boolean;
  wallets: WalletConfig[];
  categories: CategoryConfig[];
  language: 'it' | 'en';
  lastBudgetUpdate?: string; // Data update personale
  lastJointBudgetUpdate?: string; // Data update cointestato
  currentProfile: ProfileType; // Profilo attualmente selezionato
  monthlyOffset?: number; // Offset manuale per il totale spese mensile
  lastOffsetDate?: string; // Data dell'ultimo offset manuale (per reset mensile)
  budgetHistory?: Record<string, { personal: number; joint?: number }>; // Storico budget per mese (YYYY-MM)
}

export interface AiInsight {
  title: string;
  advice: string;
  type: 'saving' | 'warning' | 'tip';
}

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}
