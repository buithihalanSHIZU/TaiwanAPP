-- Copy the existing per-user import into the new catalog model.
-- Legacy tables are intentionally left untouched for rollback.
-- Run schema.sql first. Run this in Supabase SQL Editor as a database admin.
-- Imported rows remain hidden until published by an app admin.

do $migration$
declare
  v_source_email text := 'user1@test.com';
  v_source_user_id uuid;
  v_user_count bigint;
  v_group_count bigint;
  v_vocabulary_count bigint;
  v_user_word_count bigint;
  v_user_word_distinct_count bigint;
begin
  select count(*), (array_agg(u.id))[1]
    into v_user_count, v_source_user_id
  from auth.users u
  where lower(u.email) = lower(trim(v_source_email));

  if v_user_count <> 1 then
    raise exception 'Expected exactly one source account for %, found %.',
      v_source_email, v_user_count;
  end if;

  select count(*) into v_group_count
  from public.vocabulary_groups g
  where g.user_id = v_source_user_id
    and g.name ~ '^Bài (0[1-9]|1[0-5]) - ';

  if v_group_count <> 15 then
    raise exception 'Expected 15 standard lesson groups for %, found %.',
      v_source_email, v_group_count;
  end if;

  select count(*) into v_vocabulary_count
  from public.vocabulary v
  join public.vocabulary_groups g
    on g.id = v.group_id and g.user_id = v.user_id
  where v.user_id = v_source_user_id
    and v.source_type = 'imported'
    and g.name ~ '^Bài (0[1-9]|1[0-5]) - ';

  if v_vocabulary_count <> 567 then
    raise exception 'Expected 567 imported standard vocabulary rows for %, found %.',
      v_source_email, v_vocabulary_count;
  end if;

  select count(*), count(distinct lower(btrim(v.traditional)))
    into v_user_word_count, v_user_word_distinct_count
  from public.vocabulary v
  where v.user_id = v_source_user_id
    and v.source_type = 'user';

  if v_user_word_count <> v_user_word_distinct_count then
    raise exception 'Found % user-created words but only % distinct Traditional Chinese spellings. Resolve these duplicates before migration.',
      v_user_word_count, v_user_word_distinct_count;
  end if;

  insert into public.standard_vocabulary_groups (
    id, lesson_number, source_group_id, name, created_at, updated_at
  )
  select g.id,
         substring(g.name from '^Bài ([0-9]{2}) - ')::smallint,
         g.id,
         g.name,
         g.created_at,
         g.updated_at
  from public.vocabulary_groups g
  where g.user_id = v_source_user_id
    and g.name ~ '^Bài (0[1-9]|1[0-5]) - '
  on conflict (id) do update set
    lesson_number = excluded.lesson_number,
    source_group_id = excluded.source_group_id,
    name = excluded.name,
    updated_at = now();

  insert into public.standard_vocabulary (
    id, source_id, standard_group_id, traditional, zhuyin, pinyin, han_viet,
    meaning, part_of_speech, usage_vi, example, review_status,
    is_published, created_at, updated_at
  )
  select v.id,
         'legacy-vocabulary:' || v.id::text,
         v.group_id,
         v.traditional,
         v.zhuyin,
         v.pinyin,
         v.han_viet,
         v.meaning,
         v.part_of_speech,
         v.usage_vi,
         v.example,
         v.review_status,
         v.review_status = 'checked',
         v.created_at,
         v.updated_at
  from public.vocabulary v
  join public.vocabulary_groups g
    on g.id = v.group_id and g.user_id = v.user_id
  where v.user_id = v_source_user_id
    and v.source_type = 'imported'
    and g.name ~ '^Bài (0[1-9]|1[0-5]) - '
  on conflict (id) do update set
    standard_group_id = excluded.standard_group_id,
    traditional = excluded.traditional,
    zhuyin = excluded.zhuyin,
    pinyin = excluded.pinyin,
    han_viet = excluded.han_viet,
    meaning = excluded.meaning,
    part_of_speech = excluded.part_of_speech,
    usage_vi = excluded.usage_vi,
    example = excluded.example,
    review_status = excluded.review_status,
    is_published = public.standard_vocabulary.is_published or excluded.is_published,
    updated_at = now();

  insert into public.standard_vocabulary_characters (
    id, vocabulary_id, position, character, han_viet, context_meaning_vi,
    review_status, created_at, updated_at
  )
  select c.id, c.vocabulary_id, c.position, c.character, c.han_viet,
         c.context_meaning_vi, c.review_status, c.created_at, c.updated_at
  from public.vocabulary_characters c
  join public.standard_vocabulary v on v.id = c.vocabulary_id
  where c.user_id = v_source_user_id
  on conflict (id) do update set
    vocabulary_id = excluded.vocabulary_id,
    position = excluded.position,
    character = excluded.character,
    han_viet = excluded.han_viet,
    context_meaning_vi = excluded.context_meaning_vi,
    review_status = excluded.review_status,
    updated_at = now();

  insert into public.standard_vocabulary_examples (
    id, vocabulary_id, traditional, zhuyin, pinyin, meaning_vi,
    review_status, created_at, updated_at
  )
  select e.id, e.vocabulary_id, e.traditional, e.zhuyin, e.pinyin,
         e.meaning_vi, e.review_status, e.created_at, e.updated_at
  from public.vocabulary_examples e
  join public.standard_vocabulary v on v.id = e.vocabulary_id
  where e.user_id = v_source_user_id
  on conflict (id) do update set
    vocabulary_id = excluded.vocabulary_id,
    traditional = excluded.traditional,
    zhuyin = excluded.zhuyin,
    pinyin = excluded.pinyin,
    meaning_vi = excluded.meaning_vi,
    review_status = excluded.review_status,
    updated_at = now();

  insert into public.standard_vocabulary_relations (
    id, from_vocabulary_id, to_vocabulary_id, relation_type,
    note_vi, review_status, created_at, updated_at
  )
  select r.id, r.from_vocabulary_id, r.to_vocabulary_id, r.relation_type,
         r.note_vi, r.review_status, r.created_at, r.updated_at
  from public.vocabulary_relations r
  join public.standard_vocabulary f on f.id = r.from_vocabulary_id
  join public.standard_vocabulary t on t.id = r.to_vocabulary_id
  where r.user_id = v_source_user_id
  on conflict (id) do update set
    from_vocabulary_id = excluded.from_vocabulary_id,
    to_vocabulary_id = excluded.to_vocabulary_id,
    relation_type = excluded.relation_type,
    note_vi = excluded.note_vi,
    review_status = excluded.review_status,
    updated_at = now();

  insert into public.user_word_progress (user_id, vocabulary_id, learned)
  select v_source_user_id, legacy.id, legacy.learned
  from public.vocabulary legacy
  join public.standard_vocabulary standard on standard.id = legacy.id
  where legacy.user_id = v_source_user_id
  on conflict (user_id, vocabulary_id) do nothing;

  with custom_groups as (
    select distinct on (lower(btrim(g.name)))
      g.id, g.user_id, g.name, g.created_at, g.updated_at
    from public.vocabulary_groups g
    where g.user_id = v_source_user_id
      and g.name !~ '^Bài (0[1-9]|1[0-5]) - '
    order by lower(btrim(g.name)), g.created_at, g.id
  )
  insert into public.user_groups (
    id, user_id, legacy_group_id, name, created_at, updated_at
  )
  select g.id, g.user_id, g.id, g.name, g.created_at, g.updated_at
  from custom_groups g
  on conflict (id) do update set
    name = excluded.name,
    updated_at = now();

  with distinct_user_words as (
    select distinct on (lower(btrim(v.traditional)))
      v.*
    from public.vocabulary v
    where v.user_id = v_source_user_id
      and v.source_type = 'user'
    order by lower(btrim(v.traditional)), v.created_at, v.id
  )
  insert into public.user_vocabulary (
    id, user_id, group_id, legacy_vocabulary_id, traditional, zhuyin,
    pinyin, han_viet, meaning, part_of_speech, usage_vi, example,
    learned, created_at, updated_at
  )
  select v.id,
         v.user_id,
         ug.id,
         v.id,
         v.traditional,
         v.zhuyin,
         v.pinyin,
         v.han_viet,
         v.meaning,
         v.part_of_speech,
         v.usage_vi,
         v.example,
         v.learned,
         v.created_at,
         v.updated_at
  from distinct_user_words v
  left join public.vocabulary_groups legacy_group
    on legacy_group.id = v.group_id and legacy_group.user_id = v.user_id
  left join public.user_groups ug
    on ug.user_id = v.user_id
    and lower(btrim(ug.name)) = lower(btrim(legacy_group.name))
  on conflict (id) do update set
    group_id = excluded.group_id,
    traditional = excluded.traditional,
    zhuyin = excluded.zhuyin,
    pinyin = excluded.pinyin,
    han_viet = excluded.han_viet,
    meaning = excluded.meaning,
    part_of_speech = excluded.part_of_speech,
    usage_vi = excluded.usage_vi,
    example = excluded.example,
    learned = excluded.learned,
    updated_at = now();

  insert into public.user_group_user_vocabulary (user_id, group_id, vocabulary_id)
  select user_id, group_id, id
  from public.user_vocabulary
  where user_id = v_source_user_id and group_id is not null
  on conflict do nothing;

  update public.user_vocabulary
  set group_id = null
  where user_id = v_source_user_id and group_id is not null;

  raise notice 'Copied 15 standard groups and % standard words from %. Existing legacy rows were not deleted. Unchecked content remains unpublished.',
    v_vocabulary_count, v_source_email;
end;
$migration$;