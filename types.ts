
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
  profile?: ProfileType; // Nuovo campo per distinguere il profilo
}

export interface WalletConfig {
  id: string;
  name: string;
  method: PaymentMethod;
  icon: 'zap' | 'wallet' | 'fuel' | 'credit-card';
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
}

export interface AiInsight {
  title: string;
  advice: string;
  type: 'saving' | 'warning' | 'tip';
}
