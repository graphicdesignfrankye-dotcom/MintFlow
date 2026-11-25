-- MintFlow: pagamenti automatici (Apple Pay) come bozze "Da confermare".
-- Da eseguire UNA volta nell'SQL Editor di Supabase. Si può rieseguire senza danni.
--
-- Cosa crea:
--   1. api_tokens        codici personali dell'utente (si salva solo l'impronta, mai il codice)
--   2. pending_expenses  bozze di spesa in attesa di conferma
--   3. ingest_pending_expense()  l'unico modo di aggiungere una bozza da fuori: controlla il codice
--                                e scrive solo per il proprietario di quel codice
--
-- Sicurezza: nessuna chiave segreta sul server. La funzione gira nel database con i
-- permessi minimi necessari ed è l'unica cosa che l'indirizzo /api/pending può chiamare.

-- ---------------------------------------------------------------------------------------
-- 1) Codici personali
-- ---------------------------------------------------------------------------------------
create table if not exists public.api_tokens (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  label        text not null default 'Apple Pay',
  token_hash   text not null unique,          -- sha256 esadecimale del codice
  created_at   timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at   timestamptz
);

alter table public.api_tokens enable row level security;

drop policy if exists "api_tokens: leggo i miei" on public.api_tokens;
create policy "api_tokens: leggo i miei" on public.api_tokens
  for select using (auth.uid() = user_id);

drop policy if exists "api_tokens: creo i miei" on public.api_tokens;
create policy "api_tokens: creo i miei" on public.api_tokens
  for insert with check (auth.uid() = user_id);

drop policy if exists "api_tokens: revoco i miei" on public.api_tokens;
create policy "api_tokens: revoco i miei" on public.api_tokens
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "api_tokens: elimino i miei" on public.api_tokens;
create policy "api_tokens: elimino i miei" on public.api_tokens
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------------------
-- 2) Bozze di spesa
-- ---------------------------------------------------------------------------------------
create table if not exists public.pending_expenses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  merchant    text not null,
  amount      numeric(12,2) not null,           -- negativo = rimborso
  currency    text not null default 'EUR',
  card        text,                             -- nome della carta in Wallet, per es. "Revolut Visa"
  occurred_at timestamptz not null default now(),
  source      text not null default 'apple_pay',
  dedupe_key  text not null,                    -- stesso pagamento ricevuto due volte = una sola bozza
  status      text not null default 'pending' check (status in ('pending', 'confirmed', 'dismissed')),
  created_at  timestamptz not null default now(),
  unique (user_id, dedupe_key)
);

create index if not exists pending_expenses_user_status_idx
  on public.pending_expenses (user_id, status, created_at desc);

alter table public.pending_expenses enable row level security;

-- Nessuna policy di INSERT: le bozze entrano solo dalla funzione qui sotto.
drop policy if exists "pending_expenses: leggo le mie" on public.pending_expenses;
create policy "pending_expenses: leggo le mie" on public.pending_expenses
  for select using (auth.uid() = user_id);

drop policy if exists "pending_expenses: aggiorno le mie" on public.pending_expenses;
create policy "pending_expenses: aggiorno le mie" on public.pending_expenses
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "pending_expenses: elimino le mie" on public.pending_expenses;
create policy "pending_expenses: elimino le mie" on public.pending_expenses
  for delete using (auth.uid() = user_id);

-- Aggiornamento in tempo reale nell'app (la bozza compare appena arriva)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'pending_expenses'
  ) then
    alter publication supabase_realtime add table public.pending_expenses;
  end if;
end $$;

-- ---------------------------------------------------------------------------------------
-- 3) Funzione di inserimento (l'unica porta d'ingresso)
-- ---------------------------------------------------------------------------------------
-- pgcrypto serve per l'impronta sha256 del codice. Su Supabase sta nello schema "extensions".
create extension if not exists pgcrypto with schema extensions;

create or replace function public.ingest_pending_expense(
  p_token       text,
  p_merchant    text,
  p_amount      numeric,
  p_currency    text,
  p_card        text,
  p_occurred_at timestamptz,
  p_dedupe_key  text
) returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_token_id uuid;
  v_user_id  uuid;
  v_new_id   uuid;
begin
  if p_token is null or length(p_token) < 20 or length(p_token) > 200 then
    raise exception 'codice non valido' using errcode = '28000';
  end if;

  select t.id, t.user_id into v_token_id, v_user_id
  from public.api_tokens t
  where t.token_hash = encode(digest(p_token, 'sha256'), 'hex')
    and t.revoked_at is null;

  if v_user_id is null then
    raise exception 'codice non valido' using errcode = '28000';
  end if;

  if p_amount is null or p_amount = 0 or abs(p_amount) > 100000 then
    raise exception 'importo non valido' using errcode = '22023';
  end if;
  if coalesce(length(trim(p_merchant)), 0) = 0 or length(p_merchant) > 120 then
    raise exception 'esercente non valido' using errcode = '22023';
  end if;
  if p_dedupe_key is null or length(p_dedupe_key) < 16 or length(p_dedupe_key) > 128 then
    raise exception 'identificativo non valido' using errcode = '22023';
  end if;

  -- Freni: se un codice finisse in mani sbagliate non può riempire il database
  if (select count(*) from public.pending_expenses
      where user_id = v_user_id and created_at > now() - interval '1 minute') >= 20 then
    raise exception 'troppe richieste' using errcode = '54000';
  end if;
  if (select count(*) from public.pending_expenses
      where user_id = v_user_id and status = 'pending') >= 500 then
    raise exception 'troppe bozze in attesa' using errcode = '54000';
  end if;

  insert into public.pending_expenses (user_id, merchant, amount, currency, card, occurred_at, dedupe_key)
  values (
    v_user_id,
    trim(p_merchant),
    round(p_amount, 2),
    upper(left(coalesce(nullif(trim(p_currency), ''), 'EUR'), 3)),
    left(nullif(trim(p_card), ''), 60),
    coalesce(p_occurred_at, now()),
    p_dedupe_key
  )
  on conflict (user_id, dedupe_key) do nothing
  returning id into v_new_id;

  update public.api_tokens set last_used_at = now() where id = v_token_id;

  return case when v_new_id is null then 'duplicate' else 'created' end;
end;
$$;

-- Solo questa funzione è raggiungibile da fuori, con la chiave pubblica dell'app.
revoke all on function public.ingest_pending_expense(text, text, numeric, text, text, timestamptz, text) from public;
grant execute on function public.ingest_pending_expense(text, text, numeric, text, text, timestamptz, text) to anon, authenticated;

-- ---------------------------------------------------------------------------------------
-- CONTROLLI (facoltativi, in sola lettura): eseguili dopo, uno alla volta
-- ---------------------------------------------------------------------------------------
-- La funzione esiste ed è protetta (security definer = true):
--   select proname, prosecdef from pg_proc where proname = 'ingest_pending_expense';
-- La RLS è attiva sulle due tabelle (rowsecurity = true):
--   select relname, relrowsecurity from pg_class where relname in ('api_tokens', 'pending_expenses');
-- Le bozze non si possono inserire direttamente: nessuna policy di insert tra queste:
--   select tablename, policyname, cmd from pg_policies where tablename in ('api_tokens', 'pending_expenses') order by 1, 3;
