-- Account lifecycle status, used for churn rate reporting on the Sales dashboard.

alter table accounts add column status text not null default 'active' check (status in ('active', 'churned'));

-- Won leads should carry their deal value into the account as its starting MRR,
-- instead of defaulting to 0 (which made every fresh account look churned).

create or replace function convert_won_lead_to_account()
returns trigger as $$
begin
  if new.stage = 'won' and (old.stage is distinct from 'won') then
    insert into accounts (clinic_name, phone, mrr, converted_from_lead_id, sold_by_rep_id)
    values (new.clinic_name, new.phone, new.deal_value, new.id, new.owner_id)
    on conflict (phone) do nothing;
  end if;
  return new;
end;
$$ language plpgsql;
