
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
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string; // Ora è una stringa dinamica
  paymentMethod: PaymentMethod;
  date: string;
  isSubscription?: boolean;
}

export interface WalletConfig {
  id: string;
  name: string;
  method: PaymentMethod;
  icon: 'zap' | 'wallet' | 'fuel' | 'credit-card';
}

export interface UserSettings {
  name: string;
  monthlyBudget: number;
  currency: string;
  isDarkMode: boolean;
  wallets: WalletConfig[];
  categories: CategoryConfig[];
}

export interface AiInsight {
  title: string;
  advice: string;
  type: 'saving' | 'warning' | 'tip';
}
