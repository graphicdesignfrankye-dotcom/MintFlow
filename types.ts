
export enum Category {
  Alimentari = 'Alimentari',
  Trasporti = 'Trasporti',
  Casa = 'Casa',
  Svago = 'Svago',
  Salute = 'Salute',
  Shopping = 'Shopping',
  Utenze = 'Utenze',
  Altro = 'Altro'
}

export interface Expense {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: Category;
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
