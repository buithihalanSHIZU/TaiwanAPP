-- Optional standalone duplicate guards for the new user-owned tables.
-- standard_vocabulary intentionally permits repeated Traditional Chinese
-- spellings because imported entries may represent different senses.

create unique index if not exists user_groups_owner_name_ci_uidx
  on public.user_groups (user_id, lower(btrim(name)));

create unique index if not exists user_vocabulary_owner_word_ci_uidx
  on public.user_vocabulary (user_id, lower(btrim(traditional)));