import { CategoryConfig, PaymentMethod, UserSettings, WalletConfig } from '../types';
import { NO_SPENDING_RULE } from './spendingRule';

// Impostazioni di partenza di un NUOVO utente: nomi generici che rinomina da solo.
// Chi ha già impostazioni salvate le mantiene (vedi mergeSavedSettings).
export const createDefaultSettings = (): UserSettings => {
  const defaultWallets: WalletConfig[] = [
    {
      id: "w0",
      name: "Contanti",
      method: PaymentMethod.Contanti,
      icon: "wallet",
    },
    // Portafogli generici: ogni nuovo utente li rinomina da Impostazioni → Cambia Ricariche
    {
      id: "w1",
      name: "Portafoglio 1",
      method: PaymentMethod.Wallet4,
      icon: "credit-card",
    },
    {
      id: "w2",
      name: "Portafoglio 2",
      method: PaymentMethod.Wallet5,
      icon: "credit-card",
    },
    {
      id: "w3",
      name: "Portafoglio 3",
      method: PaymentMethod.Wallet6,
      icon: "credit-card",
    },
  ];

  // Categorie generiche: ogni nuovo utente le rinomina da Impostazioni → Cambia Categorie.
  // "Abbonamenti" e "Altro" restano perché il codice le usa (abbonamenti ricorrenti e categoria di riserva).
  const defaultCategories: CategoryConfig[] = [
    { id: "c1", name: "Categoria 1", color: "#ef4444" },
    { id: "c2", name: "Categoria 2", color: "#f97316" },
    { id: "c3", name: "Categoria 3", color: "#eab308" },
    { id: "c4", name: "Categoria 4", color: "#84cc16" },
    { id: "c5", name: "Categoria 5", color: "#06b6d4" },
    {
      id: "c7",
      name: "Abbonamenti",
      isSubscriptionDefault: true,
      color: "#8b5cf6",
    },
    { id: "c8", name: "Altro", color: "#64748b" },
  ];

  const defaultSettings: UserSettings = {
    name: "Utente",
    monthlyBudget: 1000,
    currency: "€",
    isDarkMode: false,
    wallets: defaultWallets,
    categories: defaultCategories,
    language: "it",
    currentProfile: "personal",
    monthlyOffset: 0,
    lastOffsetDate: new Date().toISOString(),
    // Nuovo utente: nessuna regola "spese già contate alla ricarica" (la sceglie lui dalle Impostazioni)
    spendingRule: NO_SPENDING_RULE,
  };

  return defaultSettings;
};
