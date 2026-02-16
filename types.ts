
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
  isExtra?: boolean;
  extraType?: 'given' | 'received';
}

export interface WalletConfig {
  id: string;
  name: string;
  method: PaymentMethod;
  icon: 'zap' | 'wallet' | 'fuel' | 'credit-card';
  balanceOffset?: number;
}

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface UserSettings {
  name: string;
  monthlyBudget: number;
  jointBudget?: number;
  currency: string;
  isDarkMode: boolean;
  wallets: WalletConfig[];
  categories: CategoryConfig[];
  language: 'it' | 'en';
  lastBudgetUpdate?: string;
  lastJointBudgetUpdate?: string;
  currentProfile: ProfileType;
  monthlyOffset?: number;
  lastOffsetDate?: string;
}

export interface AiInsight {
  title: string;
  advice: string;
  type: 'saving' | 'warning' | 'tip';
}
