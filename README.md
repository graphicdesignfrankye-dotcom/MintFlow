# MintFlow – Gestione Spese AI

MintFlow è una web app (PWA) per tenere sotto controllo le spese mensili, con sincronizzazione cloud, gestione di più portafogli e consigli generati da Gemini. Interfaccia in italiano e inglese, tema chiaro/scuro, pensata soprattutto per l'uso da smartphone.

## Funzionalità

### Spese
- Inserimento di una spesa con descrizione, importo, categoria, metodo di pagamento e data.
- **Scansione scontrino**: dal form "Nuova Spesa" scatti una foto e Gemini compila descrizione, importo, categoria e metodo di pagamento (da controllare prima di salvare). Serve il permesso per la fotocamera.
- Suggerimento automatico della categoria mentre scrivi la descrizione (parole chiave come sigarette, benzina, autostrada, Netflix/Spotify).
- Lista spese con ricerca testuale e filtri per categoria e metodo di pagamento; modifica ed eliminazione di ogni voce.
- Categorie personalizzabili (nome e colore). Un nuovo utente parte con categorie generiche (Categoria 1–5) più Abbonamenti e Altro, e le rinomina da Impostazioni → Cambia Categorie. Chi ha già le proprie categorie le mantiene.

### Dashboard
- Totale speso nel mese rispetto al budget mensile e confronto con il mese scorso.
- Grafico a torta della distribuzione per categoria, classifica delle categorie principali e grafico a barre.
- Saldi dei portafogli e spese programmate nei mesi successivi.
- Possibilità di correggere a mano il totale mensile; la correzione si azzera a ogni nuovo mese.

### Portafogli e ricariche
- Un nuovo utente parte con Contanti e tre portafogli generici (Portafoglio 1–3), che rinomina da Impostazioni → Cambia Ricariche; ne puoi creare e rinominare altri. Chi ha già i propri portafogli li mantiene.
- Registrazione delle ricariche e storico. Il saldo è cumulativo e non si azzera a fine mese.
- Correzione manuale del saldo, che cambia solo il valore mostrato e non crea transazioni.
- **Spese già contate alla ricarica** (opzionale, in Impostazioni): se ricarichi un portafoglio, per esempio una carta carburante, e conti la spesa alla ricarica, scegli categoria, portafoglio e metodo con cui paghi la ricarica. Le spese di quella categoria pagate con quel portafoglio non si contano due volte nei totali. Un nuovo utente parte senza questa regola; chi c'era già mantiene quella usata finora (Benzina, App Q8, ricarica con Revolut).

### Contocorrente
- Scheda dedicata al conto: mostra il **saldo attuale**, le entrate e le uscite del mese e l'elenco dei movimenti raggruppati per mese.
- L'elenco contiene tutte le spese pagate con **Bancomat** (comprese le ricariche dei portafogli) e le entrate che aggiungi.
- La scheda **Mesi** mostra l'andamento mese per mese, come l'analisi di Revolut: saldo a fine mese, entrate, uscite e netto, con un grafico a barre degli ultimi sei mesi (a scelta Saldo, Entrate o Uscite). Si cambia mese con le frecce o toccando una barra, e sotto compaiono i movimenti di quel mese.
- Il tasto **Aggiungi entrata** registra, per esempio, lo stipendio (con scorciatoie Stipendio, Rimborso, Regalo). Le entrate si possono modificare ed eliminare.
- Il saldo è cumulativo: entrate meno spese Bancomat, più un saldo di partenza che imposti con la matita (non crea movimenti). I movimenti con data futura risultano "in programma" e non sono ancora sottratti.
- Le entrate non entrano nei totali delle spese e non compaiono nella scheda Extra.

### Pagamenti automatici (Apple Pay)
- Quando paghi con Apple Pay, l'iPhone invia la spesa a MintFlow, che la mette in **Da confermare**. Ogni pagamento resta una bozza finché non lo confermi tu.
- **Da confermare** compare in cima alla scheda Spese e come icona con contatore accanto alla campanella. Le bozze arrivano in tempo reale, senza ricaricare.
- Per ogni bozza puoi **Confermare** con un tocco, **Modificare** (si apre il modulo già compilato) o **Scartare**. La prima volta che un esercente compare chiede la categoria ("Completa"); dalle volte successive categoria e portafoglio sono già proposti, in base allo storico dello stesso esercente.
- Il collegamento carta → portafoglio (per esempio "Revolut Visa" → Portafoglio 1) viene imparato alla prima conferma, oppure proposto dal nome della carta se somiglia a quello di un portafoglio.
- Rimborsi (importo negativo) e pagamenti in una valuta diversa da quella dell'app vengono segnalati e non registrati in automatico: i rimborsi si scartano e, se serve, si aggiungono a mano; la valuta estera si inserisce con "Modifica".
- Un invio ripetuto dello stesso pagamento (il Comando che riparte) non crea una seconda bozza.
- **Disponibile solo con iPhone e Apple Pay.** Altri tipi di pagamento o di telefono non sono coperti.

**Come si attiva** (per ogni utente):
1. In Impostazioni → **Pagamenti automatici** tocca "Genera il codice" e copialo: viene mostrato una sola volta. Nel database resta solo la sua impronta, e puoi revocarlo quando vuoi.
2. Sull'iPhone apri **Comandi → Automazione → +**, scegli **Transazione**, imposta le carte (anche "Qualsiasi carta") ed **Esegui immediatamente**, e disattiva "Avvisa".
3. Aggiungi l'azione **Ottieni contenuti dell'URL**: indirizzo `https://<il-tuo-sito>/api/pending`, metodo **POST**.
4. In **Intestazioni** aggiungi `Authorization` con valore `Bearer ` seguito dal tuo codice (uno spazio in mezzo).
5. In **Corpo della richiesta** scegli **JSON** e aggiungi tre campi di testo con le variabili della transazione: `esercente` (Esercente), `importo` (Importo) e `carta` (Carta o biglietto). Facoltativo: `data` con la data corrente in formato ISO 8601; se manca, vale l'ora di arrivo.

La guida con gli stessi passaggi è anche nell'app, sotto la scheda "Pagamenti automatici".

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
├── index.css             Stile delle barre di scorrimento (sottili, in tinta menta)
├── App.tsx               Stato dell'app, sincronizzazione, autenticazione, routing tra le schede
├── types.ts              Tipi condivisi (Expense, UserSettings, WalletConfig, PendingExpense, ...)
├── components/
│   ├── Layout.tsx        Intestazione, navigazione, notifiche
│   ├── Dashboard.tsx     Riepilogo e grafici
│   ├── ExpenseForm.tsx   Inserimento e modifica spese
│   ├── ExpenseList.tsx   Lista con ricerca e filtri
│   ├── RicaricheView.tsx Portafogli e ricariche
│   ├── SubscriptionsView.tsx  Abbonamenti
│   ├── ContoCorrenteView.tsx  Saldo e movimenti del conto (Bancomat), entrate
│   ├── ExtraView.tsx     Movimenti "Ho dato / Ho ricevuto"
│   ├── HistoryView.tsx   Archivio storico
│   ├── AiInsights.tsx    Consigli generati da Gemini
│   ├── SettingsView.tsx  Profilo, portafogli, categorie, CSV, sicurezza
│   ├── SpendingRuleCard.tsx  Scelta della regola "spese già contate alla ricarica"
│   ├── AutoPaymentsCard.tsx  Codice personale e guida al Comando per i pagamenti automatici
│   ├── PendingInbox.tsx  Casella "Da confermare" (bozze dei pagamenti automatici)
│   ├── Auth.tsx          Accesso e registrazione
│   ├── AdminDashboard.tsx  Pannello amministratore
│   ├── SmartCategorizer.tsx  Suggerimento categoria
│   ├── ReceiptScanner.tsx    Lettura scontrini con Gemini
│   └── ConfirmModal.tsx  Finestra di conferma
├── api/
│   ├── gemini.ts         Funzione server (Vercel): unico punto che usa la chiave Gemini
│   └── pending.ts        Funzione server (Vercel): riceve i pagamenti dal Comando dell'iPhone
├── sql/
│   └── pending-expenses.sql  Tabelle, regole di accesso e funzione per i pagamenti automatici (da eseguire una volta su Supabase)
├── services/
│   ├── supabase.ts       Client Supabase, autenticazione e accesso ai dati
│   └── gemini.ts         Chiamate a /api/gemini
├── utils/i18n.ts         Traduzioni italiano / inglese
├── utils/spendingRule.ts Regola "spese già contate alla ricarica" (valori di partenza e calcolo)
├── utils/apiToken.ts     Generazione del codice personale e della sua impronta sha256
├── utils/pendingSuggestions.ts  Proposta di categoria e portafoglio per le bozze
└── public/               Icone, favicon e manifest della PWA
```

## Note tecniche

- **Tabelle Supabase**: `profiles` (impostazioni, ruolo, stato attivo/disabilitato), `expenses` e `notifications`, più `api_tokens` e `pending_expenses` per i pagamenti automatici (create da `sql/pending-expenses.sql`).
- **Formato delle spese**: nella tabella `expenses` il metodo di pagamento, l'abbonamento, il profilo e i dati "Extra" sono salvati nel campo `description`, separati da ` |#| `. Va tenuto presente se leggi i dati direttamente dal database.
- **Cache locale**: le spese sono in `localStorage` alla chiave `mintflow_cache_v2`, le impostazioni in `mintflow_user_settings`.
- **PWA**: icone e manifest sono in `public/` e vengono copiati nella build. Su iPhone e Android l'app si può aggiungere alla schermata Home.
- **Chiave Gemini**: non arriva mai al browser. Le chiamate passano da `api/gemini.ts`, una funzione server di Vercel che verifica il token di accesso Supabase dell'utente, costruisce i prompt lato server, accetta immagini fino a circa 3 MB e limita a 10 richieste al minuto per utente (controllo per istanza, quindi indicativo). Su Vercel crea la variabile `GEMINI_API_KEY` (senza prefisso `VITE_`); in locale mettila in `.env.local`, e `npm run dev` serve `/api/gemini` da solo. Conviene impostare anche una quota giornaliera su Google Cloud.
- **Pagamenti automatici, lato server**: `api/pending.ts` riceve il POST del Comando con il codice in `Authorization: Bearer`, legge l'importo anche in formato italiano (`4,30 €`, `1.234,56 €`) e chiama la funzione `ingest_pending_expense` del database. Sul server non c'è nessuna chiave segreta: solo la chiave pubblica di Supabase. È la funzione, che gira nel database, a controllare il codice (confronto con l'impronta sha256 salvata in `api_tokens`) e a scrivere la bozza solo per il proprietario di quel codice. Le bozze entrano solo da lì (`pending_expenses` non ha policy di inserimento) e sono protette da RLS; ci sono limiti anti-abuso (20 bozze al minuto, 500 in attesa) e un codice revocato smette subito di funzionare. Prima di usare la funzione esegui `sql/pending-expenses.sql` nell'SQL Editor di Supabase: si può rieseguire senza danni.
- **Variabili `VITE_`**: finiscono nel codice inviato al browser. Non ci vanno mai messi segreti, in particolare la service role key di Supabase.
