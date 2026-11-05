# MintFlow – Gestione Spese AI

MintFlow è una web app (PWA) per tenere sotto controllo le spese mensili, con sincronizzazione cloud, gestione di più portafogli e consigli generati da Gemini. Interfaccia in italiano e inglese, tema chiaro/scuro, pensata soprattutto per l'uso da smartphone.

## Funzionalità

### Spese
- Inserimento di una spesa con descrizione, importo, categoria, metodo di pagamento e data.
- **Scansione scontrino**: dal form "Nuova Spesa" scatti una foto e Gemini compila descrizione, importo, categoria e metodo di pagamento (da controllare prima di salvare). Serve il permesso per la fotocamera.
- Suggerimento automatico della categoria mentre scrivi la descrizione (parole chiave come sigarette, benzina, autostrada, Netflix/Spotify).
- Lista spese con ricerca testuale e filtri per categoria e metodo di pagamento; modifica ed eliminazione di ogni voce.
- Categorie personalizzabili (nome e colore). Predefinite: Sigarette, Benzina, Autostrada, Ricarica Chiavetta, Svago, Salute, Abbonamenti, Altro.

### Dashboard
- Totale speso nel mese rispetto al budget mensile e confronto con il mese scorso.
- Grafico a torta della distribuzione per categoria, classifica delle categorie principali e grafico a barre.
- Saldi dei portafogli e spese programmate nei mesi successivi.
- Possibilità di correggere a mano il totale mensile; la correzione si azzera a ogni nuovo mese.

### Portafogli e ricariche
- Portafogli predefiniti: Contanti, Prepagata Flash, Prepagata Revolut, App Q8; ne puoi creare e rinominare altri.
- Registrazione delle ricariche e storico. Il saldo è cumulativo e non si azzera a fine mese.
- Correzione manuale del saldo, che cambia solo il valore mostrato e non crea transazioni.

### Abbonamenti
- Una spesa può essere segnata come *abbonamento ricorrente*.
- Elenco degli abbonamenti attivi con costo mensile fisso.
- Ogni mese gli abbonamenti dei mesi precedenti vengono ricreati in automatico, se non esiste già una voce con la stessa descrizione.

### Extra
- Sezione separata per i movimenti "Ho dato" / "Ho ricevuto" (prestiti e somme tra persone), con saldo dedicato.
- Questi movimenti non entrano nei totali delle spese.

### Storico
- Archivio dei mesi conclusi, organizzato per anno, con budget impostato e risparmio/avanzo del mese.
- Filtro per categoria, eliminazione di una singola spesa o di un intero mese, esportazione completa.
- Il budget di ogni mese viene salvato, così lo storico resta corretto anche se poi cambi il budget.

### AI (Gemini)
- **AI Insights**: analisi delle tue spese con 3 consigli in italiano di tipo *risparmio*, *attenzione* o *suggerimento*. Servono almeno 3 spese.
- Il modello usato è `gemini-3-flash-preview`.

### Dati
- **Esporta CSV** di tutte le spese.
- **Importa CSV** con riepilogo di spese importate, saltate ed errori.
- **Elimina dati cloud** e **Cancella account** dalle impostazioni.

### Account e sincronizzazione
- Registrazione e accesso con email e password, conferma email, recupero password, "Rimani collegato".
- Modifica di nome, email e password dalle impostazioni.
- Le impostazioni (budget, portafogli, categorie, lingua, tema) sono salvate nel cloud e si aggiornano in tempo reale su tutti i tuoi dispositivi.
- **Uso offline**: le spese vengono salvate subito in locale e sincronizzate appena c'è connessione. Dopo 5 tentativi falliti una spesa viene segnalata come bloccata. Alla riapertura dell'app la sincronizzazione riparte.
- Notifiche ricevute dall'amministratore, con aggiornamento in tempo reale.

### Area amministratore
L'account `admin@mintflow.com` vede al posto dell'app un pannello con:
- elenco utenti con ricerca per nome o email e data dell'ultimo accesso;
- blocco e riattivazione degli utenti (un utente bloccato vede subito una schermata di accesso sospeso);
- invio di notifiche agli utenti e invio dell'email di reset password.

## Tecnologie

| Ambito | Strumento |
| --- | --- |
| Interfaccia | React 19, TypeScript, Tailwind CSS (CDN), lucide-react |
| Grafici | Recharts |
| Date | date-fns |
| Build | Vite 6 |
| Backend | Supabase (Auth, Postgres, Realtime) |
| AI | Google Gemini (`@google/genai`) |

## Avvio in locale

Serve Node.js.

1. Installa le dipendenze:
   ```bash
   npm install
   ```
2. Crea il file `.env.local` con la tua chiave Gemini:
   ```
   GEMINI_API_KEY=la_tua_chiave
   ```
3. Avvia l'app su http://localhost:3000:
   ```bash
   npm run dev
   ```

Altri comandi:

| Comando | Cosa fa |
| --- | --- |
| `npm run build` | Crea la versione di produzione in `dist/` |
| `npm run preview` | Serve la build di produzione |
| `npm run lint` | Controlla i tipi con TypeScript |

## Struttura del progetto

```
├── index.html            Pagina di ingresso, meta tag, icone e manifest
├── index.tsx             Avvio di React
├── App.tsx               Stato dell'app, sincronizzazione, autenticazione, routing tra le schede
├── types.ts              Tipi condivisi (Expense, UserSettings, WalletConfig, ...)
├── components/
│   ├── Layout.tsx        Intestazione, navigazione, notifiche
│   ├── Dashboard.tsx     Riepilogo e grafici
│   ├── ExpenseForm.tsx   Inserimento e modifica spese
│   ├── ExpenseList.tsx   Lista con ricerca e filtri
│   ├── RicaricheView.tsx Portafogli e ricariche
│   ├── SubscriptionsView.tsx  Abbonamenti
│   ├── ExtraView.tsx     Movimenti "Ho dato / Ho ricevuto"
│   ├── HistoryView.tsx   Archivio storico
│   ├── AiInsights.tsx    Consigli generati da Gemini
│   ├── SettingsView.tsx  Profilo, portafogli, categorie, CSV, sicurezza
│   ├── Auth.tsx          Accesso e registrazione
│   ├── AdminDashboard.tsx  Pannello amministratore
│   ├── SmartCategorizer.tsx  Suggerimento categoria
│   ├── ReceiptScanner.tsx    Lettura scontrini con Gemini
│   └── ConfirmModal.tsx  Finestra di conferma
├── services/
│   ├── supabase.ts       Client Supabase, autenticazione e accesso ai dati
│   └── gemini.ts         Chiamate a Gemini
├── utils/i18n.ts         Traduzioni italiano / inglese
└── public/               Icone, favicon e manifest della PWA
```

## Note tecniche

- **Tabelle Supabase**: `profiles` (impostazioni, ruolo, stato attivo/disabilitato), `expenses` e `notifications`.
- **Formato delle spese**: nella tabella `expenses` il metodo di pagamento, l'abbonamento, il profilo e i dati "Extra" sono salvati nel campo `description`, separati da ` |#| `. Va tenuto presente se leggi i dati direttamente dal database.
- **Cache locale**: le spese sono in `localStorage` alla chiave `mintflow_cache_v2`, le impostazioni in `mintflow_user_settings`.
- **PWA**: icone e manifest sono in `public/` e vengono copiati nella build. Su iPhone e Android l'app si può aggiungere alla schermata Home.
- **Variabili d'ambiente**: `GEMINI_API_KEY` è letta da `vite.config.ts` e inserita nel codice inviato al browser, quindi chi apre il sito può leggerla. Limita la chiave su Google AI Studio (restrizioni sul dominio e quota) oppure sposta le chiamate a Gemini su un piccolo backend. Non mettere mai la service role key di Supabase in variabili `VITE_`.
