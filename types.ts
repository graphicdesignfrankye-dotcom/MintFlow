
export enum Category {
  Sigarette = 'Sigarette',
  Benzina = 'Benzina',
  Autostrada = 'Autostrada',
  RicaricaChiavetta = 'Ricarica Chiavetta',
  Svago = 'Svago',
  Salute = 'Salute',
  Abbonamenti = 'Abbonamenti',
  Altro = 'Altro'
}

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

// Added Expense interface to fix the "Module has no exported member 'Expense'" errors in multiple files
export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: Category;
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
}

export interface AiInsight {
  title: string;
  advice: string;
  type: 'saving' | 'warning' | 'tip';
}
