-- Feirinha: sincronização entre os celulares da casa.
-- Tudo prefixado com feirinha_ pra conviver com outras tabelas do projeto.
-- A tabela não tem políticas de RLS: ninguém lê ou escreve direto nela.
-- O acesso é só pelas duas funções abaixo, que exigem o código secreto da casa.

create sequence if not exists public.feirinha_rev;

create table if not exists public.feirinha_records (
  casa text not null,
  kind text not null check (kind in ('items', 'shops', 'list', 'trips', 'recipes', 'settings')),
  id text not null,
  data jsonb not null,
  updated_at bigint not null,
  rev bigint not null default nextval('public.feirinha_rev'),
  primary key (casa, kind, id)
);

create index if not exists feirinha_records_casa_rev on public.feirinha_records (casa, rev);

alter table public.feirinha_records enable row level security;
revoke all on public.feirinha_records from anon, authenticated;

-- Envia mudanças. Vence o registro com updated_at mais novo.
create or replace function public.feirinha_push(p_casa text, p_rows jsonb)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_casa is null or length(p_casa) < 20 then
    raise exception 'código da casa inválido';
  end if;
  if jsonb_array_length(p_rows) > 500 then
    raise exception 'muitos registros de uma vez';
  end if;

  insert into feirinha_records (casa, kind, id, data, updated_at)
  select p_casa, r->>'kind', r->>'id', r->'data', (r->>'updated_at')::bigint
  from jsonb_array_elements(p_rows) as r
  on conflict (casa, kind, id) do update
    set data = excluded.data,
        updated_at = excluded.updated_at,
        rev = nextval('public.feirinha_rev')
    where excluded.updated_at >= feirinha_records.updated_at;

  return (select coalesce(max(rev), 0) from feirinha_records where casa = p_casa);
end;
$$;

-- Busca o que mudou desde a última vez (rev > p_since).
create or replace function public.feirinha_pull(p_casa text, p_since bigint)
returns table (kind text, id text, data jsonb, updated_at bigint, rev bigint)
language sql
stable
security definer
set search_path = public
as $$
  select r.kind, r.id, r.data, r.updated_at, r.rev
  from feirinha_records r
  where r.casa = p_casa and length(p_casa) >= 20 and r.rev > p_since
  order by r.rev
  limit 2000;
$$;

revoke all on function public.feirinha_push(text, jsonb) from public;
revoke all on function public.feirinha_pull(text, bigint) from public;
grant execute on function public.feirinha_push(text, jsonb) to anon, authenticated;
grant execute on function public.feirinha_pull(text, bigint) to anon, authenticated;
