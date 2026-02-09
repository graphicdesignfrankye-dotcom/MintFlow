
export enum Category {
  Sigarette = 'Sigarette',
  Benzina = 'Benzina',
  Autostrada = 'Autostrada',
  RicaricaChiavetta = 'Ricarica Chiavetta',
  Svago = 'Svago',
  Salute = 'Salute',
  Altro = 'Altro'
}

export enum PaymentMethod {
  Contanti = 'Contanti',
  Flash = 'Prepagata Flash',
  Revolut = 'Prepagata Revolut',
  AppQ8 = 'App Q8'
}

export interface Expense {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: Category;
  paymentMethod: PaymentMethod;
}

export interface UserSettings {
  name: string;
  monthlyBudget: number;
  currency: string;
  isDarkMode: boolean;
}

export interface AiInsight {
  title: string;
  advice: string;
  type: 'saving' | 'warning' | 'tip';
}
