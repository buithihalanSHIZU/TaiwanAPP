-- TaiwanAPP database schema.
-- Safe to run alongside the legacy tables: this file never drops user data.
-- Run this before import_grammar_taiwan_to_supabase.sql on a fresh project.

create extension if not exists pgcrypto;

-- Legacy import tables. Keep these as the import source and rollback copy.
create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  user_name varchar check (user_name is null or char_length(trim(user_name)) between 1 and 32),
  address varchar check (address is null or char_length(address) <= 255),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  admin_role text not null default 'admin' check (admin_role in ('admin', 'super_admin')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.vocabulary_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 36),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, name)
);

create table if not exists public.vocabulary (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  group_id uuid,
  traditional text not null check (char_length(trim(traditional)) > 0),
  zhuyin text not null default '',
  pinyin text not null default '',
  han_viet text not null default '',
  meaning text not null check (char_length(trim(meaning)) > 0),
  part_of_speech text not null default '',
  usage_vi text not null default '',
  learned boolean not null default false,
  source_type text not null default 'user' check (source_type in ('user', 'imported')),
  review_status text not null default 'draft' check (review_status in ('draft', 'checked')),
  example text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  constraint vocabulary_group_owner_fk foreign key (group_id, user_id)
    references public.vocabulary_groups(id, user_id) on delete cascade
);

create table if not exists public.vocabulary_characters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vocabulary_id uuid not null,
  position smallint not null check (position >= 1),
  character text not null check (char_length(trim(character)) > 0),
  han_viet text not null default '',
  context_meaning_vi text not null default '',
  review_status text not null default 'draft' check (review_status in ('draft', 'checked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (vocabulary_id, position),
  constraint vocabulary_character_owner_fk foreign key (vocabulary_id, user_id)
    references public.vocabulary(id, user_id) on delete cascade
);

create table if not exists public.vocabulary_examples (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vocabulary_id uuid not null,
  traditional text not null check (char_length(trim(traditional)) > 0),
  zhuyin text not null default '',
  pinyin text not null default '',
  meaning_vi text not null check (char_length(trim(meaning_vi)) > 0),
  review_status text not null default 'draft' check (review_status in ('draft', 'checked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vocabulary_example_owner_fk foreign key (vocabulary_id, user_id)
    references public.vocabulary(id, user_id) on delete cascade
);

create table if not exists public.vocabulary_relations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  from_vocabulary_id uuid not null,
  to_vocabulary_id uuid not null,
  relation_type text not null check (relation_type in ('related', 'synonym', 'antonym', 'contextual_alternative')),
  note_vi text not null default '',
  review_status text not null default 'draft' check (review_status in ('draft', 'checked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, from_vocabulary_id, to_vocabulary_id, relation_type),
  constraint vocabulary_relation_from_owner_fk foreign key (from_vocabulary_id, user_id)
    references public.vocabulary(id, user_id) on delete cascade,
  constraint vocabulary_relation_to_owner_fk foreign key (to_vocabulary_id, user_id)
    references public.vocabulary(id, user_id) on delete cascade
);

-- Shared, read-only lesson catalog. Only admins may manage these tables.
create table if not exists public.standard_vocabulary_groups (
  id uuid primary key default gen_random_uuid(),
  lesson_number smallint not null unique check (lesson_number between 1 and 15),
  source_group_id uuid unique,
  name text not null unique check (char_length(trim(name)) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.standard_vocabulary (
  id uuid primary key default gen_random_uuid(),
  source_id text not null unique,
  standard_group_id uuid not null references public.standard_vocabulary_groups(id) on delete restrict,
  traditional text not null check (char_length(trim(traditional)) > 0),
  zhuyin text not null default '',
  pinyin text not null default '',
  han_viet text not null default '',
  meaning text not null check (char_length(trim(meaning)) > 0),
  part_of_speech text not null default '',
  usage_vi text not null default '',
  example text not null default '',
  review_status text not null default 'draft' check (review_status in ('draft', 'checked')),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.standard_vocabulary_characters (
  id uuid primary key default gen_random_uuid(),
  vocabulary_id uuid not null references public.standard_vocabulary(id) on delete cascade,
  position smallint not null check (position >= 1),
  character text not null check (char_length(trim(character)) > 0),
  han_viet text not null default '',
  context_meaning_vi text not null default '',
  review_status text not null default 'draft' check (review_status in ('draft', 'checked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (vocabulary_id, position)
);

create table if not exists public.standard_vocabulary_examples (
  id uuid primary key default gen_random_uuid(),
  vocabulary_id uuid not null references public.standard_vocabulary(id) on delete cascade,
  traditional text not null check (char_length(trim(traditional)) > 0),
  zhuyin text not null default '',
  pinyin text not null default '',
  meaning_vi text not null check (char_length(trim(meaning_vi)) > 0),
  review_status text not null default 'draft' check (review_status in ('draft', 'checked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.standard_vocabulary_relations (
  id uuid primary key default gen_random_uuid(),
  from_vocabulary_id uuid not null references public.standard_vocabulary(id) on delete cascade,
  to_vocabulary_id uuid not null references public.standard_vocabulary(id) on delete cascade,
  relation_type text not null check (relation_type in ('related', 'synonym', 'antonym', 'contextual_alternative')),
  note_vi text not null default '',
  review_status text not null default 'draft' check (review_status in ('draft', 'checked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (from_vocabulary_id, to_vocabulary_id, relation_type)
);

-- Private user-created groups and vocabulary.
create table if not exists public.user_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  legacy_group_id uuid unique,
  name text not null check (char_length(trim(name)) between 1 and 36),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create table if not exists public.user_vocabulary (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  group_id uuid,
  legacy_vocabulary_id uuid unique,
  traditional text not null check (char_length(trim(traditional)) > 0),
  zhuyin text not null default '',
  pinyin text not null default '',
  han_viet text not null default '',
  meaning text not null check (char_length(trim(meaning)) > 0),
  part_of_speech text not null default '',
  usage_vi text not null default '',
  example text not null default '',
  learned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  constraint user_vocabulary_group_owner_fk foreign key (group_id, user_id)
    references public.user_groups(id, user_id) on delete cascade
);

create table if not exists public.user_word_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  vocabulary_id uuid not null references public.standard_vocabulary(id) on delete cascade,
  learned boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, vocabulary_id)
);

create table if not exists public.user_group_vocabulary (
  user_id uuid not null references auth.users(id) on delete cascade,
  group_id uuid not null,
  vocabulary_id uuid not null references public.standard_vocabulary(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, group_id, vocabulary_id),
  constraint user_group_vocabulary_owner_fk foreign key (group_id, user_id)
    references public.user_groups(id, user_id) on delete cascade
);

create table if not exists public.user_group_user_vocabulary (
  user_id uuid not null references auth.users(id) on delete cascade,
  group_id uuid not null,
  vocabulary_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, group_id, vocabulary_id),
  constraint user_group_user_vocabulary_group_owner_fk foreign key (group_id, user_id)
    references public.user_groups(id, user_id) on delete cascade,
  constraint user_group_user_vocabulary_word_owner_fk foreign key (vocabulary_id, user_id)
    references public.user_vocabulary(id, user_id) on delete cascade
);

insert into public.user_group_user_vocabulary (user_id, group_id, vocabulary_id)
select user_id, group_id, id
from public.user_vocabulary
where group_id is not null
on conflict do nothing;

update public.user_vocabulary set group_id = null where group_id is not null;

create index if not exists legacy_vocabulary_owner_group_idx
  on public.vocabulary (user_id, group_id);
create index if not exists standard_vocabulary_group_idx
  on public.standard_vocabulary (standard_group_id, traditional);
create index if not exists standard_vocabulary_search_idx
  on public.standard_vocabulary using gin (to_tsvector('simple', traditional || ' ' || pinyin || ' ' || meaning));
create index if not exists user_vocabulary_owner_group_idx
  on public.user_vocabulary (user_id, group_id, created_at desc);
create index if not exists user_group_vocabulary_word_idx
  on public.user_group_vocabulary (user_id, vocabulary_id);
create index if not exists user_group_user_vocabulary_word_idx
  on public.user_group_user_vocabulary (user_id, vocabulary_id);
create unique index if not exists user_groups_owner_name_ci_uidx
  on public.user_groups (user_id, lower(btrim(name)));
create unique index if not exists user_vocabulary_owner_word_ci_uidx
  on public.user_vocabulary (user_id, lower(btrim(traditional)));

create or replace function public.is_app_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.admins a where a.user_id = auth.uid());
$$;

create or replace function public.prevent_duplicate_user_vocabulary()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  normalized_word text := lower(btrim(new.traditional));
begin
  if tg_op = 'UPDATE'
    and old.user_id = new.user_id
    and lower(btrim(old.traditional)) = normalized_word then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text || ':user-word:' || normalized_word, 0));
  if exists (
    select 1 from public.user_vocabulary v
    where v.user_id = new.user_id
      and lower(btrim(v.traditional)) = normalized_word
      and v.id is distinct from new.id
  ) then
    raise exception 'Vocabulary already exists for this user' using errcode = '23505';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_duplicate_user_vocabulary on public.user_vocabulary;
create trigger prevent_duplicate_user_vocabulary
  before insert or update on public.user_vocabulary
  for each row execute function public.prevent_duplicate_user_vocabulary();

alter table public.user_profiles enable row level security;
alter table public.admins enable row level security;
alter table public.vocabulary_groups enable row level security;
alter table public.vocabulary enable row level security;
alter table public.vocabulary_characters enable row level security;
alter table public.vocabulary_examples enable row level security;
alter table public.vocabulary_relations enable row level security;
alter table public.standard_vocabulary_groups enable row level security;
alter table public.standard_vocabulary enable row level security;
alter table public.standard_vocabulary_characters enable row level security;
alter table public.standard_vocabulary_examples enable row level security;
alter table public.standard_vocabulary_relations enable row level security;
alter table public.user_groups enable row level security;
alter table public.user_vocabulary enable row level security;
alter table public.user_word_progress enable row level security;
alter table public.user_group_vocabulary enable row level security;
alter table public.user_group_user_vocabulary enable row level security;

drop policy if exists user_profiles_owner_all on public.user_profiles;
create policy user_profiles_owner_all on public.user_profiles for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists admins_owner_read on public.admins;
create policy admins_owner_read on public.admins for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists legacy_groups_owner_all on public.vocabulary_groups;
create policy legacy_groups_owner_all on public.vocabulary_groups for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists legacy_vocabulary_owner_all on public.vocabulary;
create policy legacy_vocabulary_owner_all on public.vocabulary for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists legacy_characters_owner_all on public.vocabulary_characters;
create policy legacy_characters_owner_all on public.vocabulary_characters for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists legacy_examples_owner_all on public.vocabulary_examples;
create policy legacy_examples_owner_all on public.vocabulary_examples for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists legacy_relations_owner_all on public.vocabulary_relations;
create policy legacy_relations_owner_all on public.vocabulary_relations for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists standard_groups_authenticated_read on public.standard_vocabulary_groups;
create policy standard_groups_authenticated_read on public.standard_vocabulary_groups for select to authenticated
  using (true);
drop policy if exists standard_groups_admin_all on public.standard_vocabulary_groups;
create policy standard_groups_admin_all on public.standard_vocabulary_groups for all to authenticated
  using (public.is_app_admin()) with check (public.is_app_admin());

drop policy if exists standard_vocabulary_published_read on public.standard_vocabulary;
create policy standard_vocabulary_published_read on public.standard_vocabulary for select to authenticated
  using (is_published or public.is_app_admin());
drop policy if exists standard_vocabulary_admin_write on public.standard_vocabulary;
create policy standard_vocabulary_admin_write on public.standard_vocabulary for all to authenticated
  using (public.is_app_admin()) with check (public.is_app_admin());

drop policy if exists standard_characters_published_read on public.standard_vocabulary_characters;
create policy standard_characters_published_read on public.standard_vocabulary_characters for select to authenticated
  using (exists (select 1 from public.standard_vocabulary v where v.id = vocabulary_id and (v.is_published or public.is_app_admin())));
drop policy if exists standard_characters_admin_write on public.standard_vocabulary_characters;
create policy standard_characters_admin_write on public.standard_vocabulary_characters for all to authenticated
  using (public.is_app_admin()) with check (public.is_app_admin());

drop policy if exists standard_examples_published_read on public.standard_vocabulary_examples;
create policy standard_examples_published_read on public.standard_vocabulary_examples for select to authenticated
  using (exists (select 1 from public.standard_vocabulary v where v.id = vocabulary_id and (v.is_published or public.is_app_admin())));
drop policy if exists standard_examples_admin_write on public.standard_vocabulary_examples;
create policy standard_examples_admin_write on public.standard_vocabulary_examples for all to authenticated
  using (public.is_app_admin()) with check (public.is_app_admin());

drop policy if exists standard_relations_published_read on public.standard_vocabulary_relations;
create policy standard_relations_published_read on public.standard_vocabulary_relations for select to authenticated
  using (
    public.is_app_admin()
    or (
      exists (select 1 from public.standard_vocabulary f where f.id = from_vocabulary_id and f.is_published)
      and exists (select 1 from public.standard_vocabulary t where t.id = to_vocabulary_id and t.is_published)
    )
  );
drop policy if exists standard_relations_admin_write on public.standard_vocabulary_relations;
create policy standard_relations_admin_write on public.standard_vocabulary_relations for all to authenticated
  using (public.is_app_admin()) with check (public.is_app_admin());

drop policy if exists user_groups_owner_all on public.user_groups;
create policy user_groups_owner_all on public.user_groups for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists user_vocabulary_owner_all on public.user_vocabulary;
create policy user_vocabulary_owner_all on public.user_vocabulary for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists user_progress_owner_all on public.user_word_progress;
create policy user_progress_owner_all on public.user_word_progress for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists user_group_vocabulary_owner_all on public.user_group_vocabulary;
create policy user_group_vocabulary_owner_all on public.user_group_vocabulary for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists user_group_user_vocabulary_owner_all on public.user_group_user_vocabulary;
create policy user_group_user_vocabulary_owner_all on public.user_group_user_vocabulary for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant execute on function public.is_app_admin() to authenticated;
grant select, insert, update, delete on public.user_profiles to authenticated;
grant select on public.admins to authenticated;
grant select, insert, update, delete on public.vocabulary_groups, public.vocabulary,
  public.vocabulary_characters, public.vocabulary_examples, public.vocabulary_relations to authenticated;
grant select, insert, update, delete on public.standard_vocabulary_groups,
  public.standard_vocabulary, public.standard_vocabulary_characters,
  public.standard_vocabulary_examples, public.standard_vocabulary_relations to authenticated;
grant select, insert, update, delete on public.user_groups, public.user_vocabulary,
  public.user_word_progress, public.user_group_vocabulary,
  public.user_group_user_vocabulary to authenticated;