-- Lead priority scoring — replaces the old logic that marked nearly every lead "Urgent".
-- Weighted blend of rating, review volume (diminishing returns), city tier, and recency
-- (a proxy for response speed until real first-contact timing data exists).

create or replace function compute_lead_priority_score(
  p_rating numeric,
  p_review_count integer,
  p_city_tier smallint,
  p_created_at timestamptz
)
returns numeric as $$
declare
  rating_component numeric := coalesce(p_rating, 0) / 5.0;
  review_component numeric := least(ln(coalesce(p_review_count, 0) + 1) / ln(500), 1);
  tier_component numeric := (4 - coalesce(p_city_tier, 3))::numeric / 3.0;
  recency_component numeric := case
    when p_created_at is null then 0.5
    when now() - p_created_at <= interval '3 days' then 1
    when now() - p_created_at <= interval '14 days' then 0.6
    else 0.2
  end;
begin
  return round(
    (rating_component * 0.35) +
    (review_component * 0.30) +
    (tier_component * 0.20) +
    (recency_component * 0.15),
    3
  );
end;
$$ language plpgsql immutable;

create or replace function compute_lead_priority(p_score numeric)
returns lead_priority as $$
begin
  return case
    when p_score >= 0.75 then 'urgent'
    when p_score >= 0.55 then 'high'
    when p_score >= 0.35 then 'normal'
    else 'low'
  end::lead_priority;
end;
$$ language plpgsql immutable;

create or replace function leads_apply_scoring()
returns trigger as $$
begin
  new.priority_score := compute_lead_priority_score(new.rating, new.review_count, new.city_tier, coalesce(new.created_at, now()));
  new.priority := compute_lead_priority(new.priority_score);
  return new;
end;
$$ language plpgsql;

create trigger leads_score_on_insert before insert on leads
  for each row execute function leads_apply_scoring();

-- One-time / on-demand re-score for already-imported leads. Only touches
-- priority/priority_score — stage, owner, and notes are left untouched,
-- so this is safe to run against the migrated real-lead dataset.

create or replace function recompute_lead_priorities()
returns integer as $$
declare
  affected integer;
begin
  update leads
  set priority_score = compute_lead_priority_score(rating, review_count, city_tier, created_at),
      priority = compute_lead_priority(compute_lead_priority_score(rating, review_count, city_tier, created_at));
  get diagnostics affected = row_count;
  return affected;
end;
$$ language plpgsql security definer set search_path = public;
