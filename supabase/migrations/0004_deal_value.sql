-- Nominal estimated monthly deal value per lead, used for pipeline value and the
-- stage-weighted forecast view (flat lead counts don't reflect revenue at risk/expected).

alter table leads add column deal_value numeric not null default 15000;

-- Stage weights for the forecast view: how likely a lead at this stage is to close.

create or replace function lead_stage_weight(p_stage lead_stage)
returns numeric as $$
begin
  return case p_stage
    when 'new' then 0.05
    when 'contacted' then 0.15
    when 'demo_scheduled' then 0.35
    when 'demo_done' then 0.55
    when 'negotiation' then 0.75
    when 'won' then 1.0
    when 'lost' then 0.0
  end;
end;
$$ language plpgsql immutable;
