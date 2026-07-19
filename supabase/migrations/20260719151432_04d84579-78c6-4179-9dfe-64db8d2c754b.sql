
CREATE OR REPLACE FUNCTION public.settle_bonus_question()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  uids uuid[];
  ba record;
  part jsonb;
  parts jsonb;
  total int;
  key text;
  kind text;
  pe int;
  pc int;
  margin numeric;
  user_val jsonb;
  correct_val jsonb;
  diff numeric;
  ce int;    -- closest points for number_closest
  ma numeric;
begin
  if new.status = 'settled' and new.correct_answer is not null then
    if new.answer_type = 'composite' then
      parts := coalesce(new.options -> 'parts', '[]'::jsonb);
      for ba in select id, answer from public.bonus_answers where question_id = new.id loop
        total := 0;
        for part in select * from jsonb_array_elements(parts) loop
          key := part ->> 'key';
          kind := coalesce(part ->> 'kind', 'text');
          pe := coalesce((part ->> 'points_exact')::int, 0);
          pc := coalesce((part ->> 'points_closest')::int, 0);
          margin := coalesce((part ->> 'margin')::numeric, 0);
          user_val := ba.answer -> key;
          correct_val := new.correct_answer -> key;
          if user_val is null or correct_val is null then
            continue;
          end if;
          if kind = 'number' then
            begin
              diff := abs((user_val #>> '{}')::numeric - (correct_val #>> '{}')::numeric);
              if diff = 0 then
                total := total + pe;
              elsif pc > 0 and margin > 0 and diff <= margin then
                total := total + pc;
              end if;
            exception when others then
              null;
            end;
          else
            if lower(trim(user_val #>> '{}')) = lower(trim(correct_val #>> '{}')) then
              total := total + pe;
            end if;
          end if;
        end loop;
        update public.bonus_answers set points = total where id = ba.id;
      end loop;

    elsif new.answer_type = 'number_closest' then
      pe := coalesce((new.options ->> 'points_exact')::int, new.points);
      ce := coalesce((new.options ->> 'points_closest')::int, 0);
      ma := coalesce((new.options ->> 'margin')::numeric, 0);
      for ba in select id, answer from public.bonus_answers where question_id = new.id loop
        total := 0;
        user_val := ba.answer -> 'value';
        correct_val := new.correct_answer -> 'value';
        if user_val is not null and correct_val is not null then
          begin
            diff := abs((user_val #>> '{}')::numeric - (correct_val #>> '{}')::numeric);
            if diff = 0 then
              total := pe;
            elsif ce > 0 and ma > 0 and diff <= ma then
              total := ce;
            end if;
          exception when others then
            total := 0;
          end;
        end if;
        update public.bonus_answers set points = total where id = ba.id;
      end loop;

    else
      -- Existerande all-or-nothing (text/number/player/team/multiple_choice/multi_choice)
      update public.bonus_answers ba
        set points = case when ba.answer::text = new.correct_answer::text then new.points else 0 end
        where ba.question_id = new.id;
    end if;

    -- Uppdatera profilernas total_points för berörda spelare
    select array_agg(distinct user_id) into uids from public.bonus_answers where question_id = new.id;
    if uids is not null then
      update public.profiles p set total_points = coalesce(
        (select sum(points) from public.predictions where user_id = p.id and points is not null), 0
      ) + coalesce(
        (select sum(points) from public.bonus_answers where user_id = p.id and points is not null), 0
      )
      where p.id = any(uids);
    end if;
  end if;
  return new;
end; $function$;
