-- Loop Workouts' server side, in Supabase (see docs/features/backup-and-sync.md, Sync).
-- Run it in the project's SQL editor. It's safe to run again: it replaces what it made.

-- Every record an account syncs, of every kind, in one table. A deletion is a record with
-- deleted_at set, kept for good. seq goes up on every write, so a device can fetch
-- everything written since the last seq it saw.
create sequence if not exists public.records_seq;

create table if not exists public.records (
    user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
    -- 'workout', 'history', 'exercise', 'exercise-note', 'hidden-exercise',
    -- 'ready-made-favourite', 'ready-made-change', 'library-order', 'plan' or 'profile'
    kind text not null,
    id text not null,
    -- When it last changed, and was deleted, in ms since the epoch, as on the device
    updated_at bigint not null,
    deleted_at bigint,
    -- The record itself; null for a deletion
    data jsonb,
    seq bigint not null default nextval('public.records_seq'),
    primary key (user_id, kind, id)
);

-- The app's data version the record was written in (as in backup-file.ts), so an older app
-- leaves alone what it can't read yet
alter table public.records add column if not exists version integer not null default 7;

create index if not exists records_user_seq on public.records (user_id, seq);

-- A write moves the record to the end of the queue of changes
create or replace function public.records_next_seq() returns trigger
language plpgsql set search_path = '' as $$
begin
    new.seq := nextval('public.records_seq');
    return new;
end;
$$;

drop trigger if exists records_next_seq on public.records;
create trigger records_next_seq before update on public.records
    for each row execute function public.records_next_seq();

-- Each account reads only its own records, and writes them only through push_records(),
-- below
alter table public.records enable row level security;

drop policy if exists "Own records" on public.records;
drop policy if exists "Read own records" on public.records;
create policy "Read own records" on public.records
    for select to authenticated
    using ((select auth.uid()) = user_id);

-- Now by the server's clock, in ms since the epoch, as records are dated
create or replace function public.now_ms() returns bigint
language sql volatile set search_path = '' as $$
    select (extract(epoch from clock_timestamp()) * 1000)::bigint;
$$;

-- Sync sends changes: a list of {kind, id, updated_at, deleted_at, data, version}, a deletion
-- having deleted_at (and updated_at the same). Each is kept only if it's newer than the copy
-- here, a deletion winning a tie, as the app merges. A date more than a minute ahead of the
-- server's clock (a device's clock running fast) is taken as now. Gives the server's time,
-- so the device can date its changes by it.
--
-- Limits, so one account can't fill the database (anyone can make one): at most 500 changes
-- a call (the app sends 200), an id of at most 200 characters, a record of at most 64 kB, and
-- an account of at most 20,000 records and 20 MB. Over any of them, nothing is written and it
-- says why; far above what anyone's workouts need.
create or replace function public.push_records(changes jsonb) returns bigint
language plpgsql security definer set search_path = '' as $$
declare
    me uuid := auth.uid();
    server_now bigint := public.now_ms();
    record_count bigint;
    total_bytes bigint;
begin
    if me is null then
        raise exception 'Not signed in';
    end if;
    if jsonb_typeof(changes) <> 'array' or jsonb_array_length(changes) > 500 then
        raise exception 'Too many changes at once';
    end if;
    if exists (
        select from jsonb_array_elements(changes) as c
        where length(c ->> 'id') > 200 or pg_column_size(c -> 'data') > 65536
    ) then
        raise exception 'Record too large';
    end if;
    -- One write at a time for each account, so its rows' seq goes up in the order they're
    -- written, and a device that's fetched up to a seq can't miss one below it
    perform pg_advisory_xact_lock(hashtextextended(me::text, 0));
    insert into public.records as r (user_id, kind, id, updated_at, deleted_at, data, version)
    select distinct on (c.kind, c.id)
        me,
        c.kind,
        c.id,
        case when c.updated_at > server_now + 60000 then server_now else c.updated_at end,
        case when c.deleted_at > server_now + 60000 then server_now else c.deleted_at end,
        case when c.deleted_at is null then c.data end,
        coalesce(c.version, 7)
    from jsonb_to_recordset(changes) as c(
        kind text, id text, updated_at bigint, deleted_at bigint, data jsonb, version integer
    )
    where c.kind in ('workout', 'history', 'exercise', 'exercise-note', 'hidden-exercise', 'ready-made-favourite', 'ready-made-change', 'library-order', 'plan', 'profile')
        and c.id <> ''
        and c.updated_at > 0
        and (c.deleted_at is not null or c.data is not null)
    order by c.kind, c.id, c.updated_at desc
    on conflict (user_id, kind, id) do update
        set updated_at = excluded.updated_at,
            deleted_at = excluded.deleted_at,
            data = excluded.data,
            version = excluded.version
        where excluded.updated_at > r.updated_at
            or (excluded.updated_at = r.updated_at
                and excluded.deleted_at is not null and r.deleted_at is null);
    -- Raising undoes the write above
    select count(*), coalesce(sum(pg_column_size(data)), 0)
        into record_count, total_bytes
        from public.records
        where user_id = me;
    if record_count > 20000 or total_bytes > 20 * 1024 * 1024 then
        raise exception 'Account storage full';
    end if;
    return server_now;
end;
$$;

revoke execute on function public.push_records(jsonb) from public, anon;
grant execute on function public.push_records(jsonb) to authenticated;

-- Sync fetches changes: the account's records written since seq `after`, oldest first, up to
-- `page_size` of them, with the server's time.
create or replace function public.pull_records(after bigint, page_size integer default 500)
returns jsonb
language sql stable set search_path = '' as $$
    select jsonb_build_object(
        'now', public.now_ms(),
        'records', coalesce(jsonb_agg(to_jsonb(page) order by page.seq), '[]'::jsonb)
    )
    from (
        select kind, id, updated_at, deleted_at, data, version, seq
        from public.records
        where user_id = (select auth.uid()) and seq > after
        order by seq
        limit least(greatest(page_size, 1), 1000)
    ) as page;
$$;

revoke execute on function public.pull_records(bigint, integer) from public, anon;
grant execute on function public.pull_records(bigint, integer) to authenticated;

-- Delete account (SYN-8): the signed-in user deletes themselves, and with them their records
-- (on delete cascade). A browser can't delete a user itself, so this runs as the owner.
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
begin
    if auth.uid() is null then
        raise exception 'Not signed in';
    end if;
    delete from auth.users where id = auth.uid();
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
