-- Allow one private vocabulary entry to belong to multiple personal groups.
-- Existing user_vocabulary.group_id memberships are copied into the link table.

begin;

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

create index if not exists user_group_user_vocabulary_word_idx
  on public.user_group_user_vocabulary (user_id, vocabulary_id);

alter table public.user_group_user_vocabulary enable row level security;
drop policy if exists user_group_user_vocabulary_owner_all on public.user_group_user_vocabulary;
create policy user_group_user_vocabulary_owner_all on public.user_group_user_vocabulary for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update, delete on public.user_group_user_vocabulary to authenticated;

commit;