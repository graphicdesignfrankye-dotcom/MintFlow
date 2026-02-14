
export const translations = {
  it: {
    nav: {
      dashboard: 'Dashboard',
      expenses: 'Spese',
      subscriptions: 'Abbonamenti',
      wallets: 'Ricariche',
      ai: 'AI Insights',
      settings: 'Impostazioni',
      extra: 'Extra'
    },
    dashboard: {
      hello: 'Ciao',
      subtitle: 'Ecco lo stato delle finanze di questo mese',
      spentThisMonth: 'Speso questo mese',
      target: 'Target',
      vsLastMonth: 'Rispetto a Mese Scorso',
      month: 'Mese',
      plannedExpenses: 'Spese Programmate',
      plannedCount: (n: number) => `Hai ${n} ${n === 1 ? 'spesa' : 'spese'} nei prossimi mesi`,
      walletBalances: 'Saldi Wallet',
      expenseDistribution: 'Distribuzione Spese',
      topCategories: 'Top Categorie',
      noData: 'Nessun dato questo mese',
      noExpenses: 'Nessuna spesa registrata a',
      rechargeInflow: 'Entrate/Ricariche'
    },
    settings: {
      profile: 'Il tuo Profilo',
      edit: 'Modifica',
      displayName: 'Nome Visualizzato',
      changePassword: 'Cambia Password',
      manageWallets: 'Cambia Ricariche',
      manageCategories: 'Cambia Categorie',
      monthlyBudget: 'Budget Mensile',
      appearance: 'Aspetto',
      darkMode: 'Tema Scuro',
      lightMode: 'Tema Chiaro',
      dataArchive: 'Dati e Archivio',
      history: 'Storico Mesi',
      export: 'Esporta CSV',
      import: 'Importa CSV',
      security: 'Sicurezza',
      logout: 'Disconnetti',
      deleteAccount: 'Cancella Account',
      clearData: 'Elimina dati Cloud',
      language: 'Lingua'
    }
  },
  en: {
    nav: {
      dashboard: 'Dashboard',
      expenses: 'Expenses',
      subscriptions: 'Subscriptions',
      wallets: 'Wallets',
      ai: 'AI Insights',
      settings: 'Settings',
      extra: 'Extra'
    },
    dashboard: {
      hello: 'Hello',
      subtitle: 'Here is your financial status for this month',
      spentThisMonth: 'Spent this month',
      target: 'Goal',
      vsLastMonth: 'Vs Last Month',
      month: 'Month',
      plannedExpenses: 'Planned Expenses',
      plannedCount: (n: number) => `You have ${n} ${n === 1 ? 'expense' : 'expenses'} coming up`,
      walletBalances: 'Wallet Balances',
      expenseDistribution: 'Expense Distribution',
      topCategories: 'Top Categories',
      noData: 'No data this month',
      noExpenses: 'No expenses recorded in',
      rechargeInflow: 'Inflow/Refills'
    },
    settings: {
      profile: 'Your Profile',
      edit: 'Edit',
      displayName: 'Display Name',
      changePassword: 'Change Password',
      manageWallets: 'Manage Wallets',
      manageCategories: 'Manage Categories',
      monthlyBudget: 'Monthly Budget',
      appearance: 'Appearance',
      darkMode: 'Dark Mode',
      lightMode: 'Light Mode',
      dataArchive: 'Data & Archive',
      history: 'Monthly History',
      export: 'Export CSV',
      import: 'Import CSV',
      security: 'Security',
      logout: 'Log Out',
      deleteAccount: 'Delete Account',
      clearData: 'Clear Cloud Data',
      language: 'Language'
    }
  }
};
