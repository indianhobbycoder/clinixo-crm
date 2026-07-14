-- Clinixo CRM v2 — core schema
-- Enums

create type user_role as enum ('admin', 'sales_manager', 'sales_rep', 'support_agent', 'support_lead');
create type lead_stage as enum ('new', 'contacted', 'demo_scheduled', 'demo_done', 'negotiation', 'won', 'lost');
create type lead_priority as enum ('urgent', 'high', 'normal', 'low');
create type demo_result as enum ('pending', 'won', 'lost', 'no_show', 'rescheduled');
create type ticket_channel as enum ('phone', 'whatsapp', 'email');
create type ticket_category as enum ('billing', 'product_bug', 'training', 'hardware', 'other');
create type ticket_status as enum ('new', 'acknowledged', 'in_progress', 'resolved', 'closed');
create type activity_subject as enum ('lead', 'account', 'ticket');

-- profiles: one row per auth user, holds role + territory

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  email text not null,
  role user_role not null default 'sales_rep',
  territory_state text,
  created_at timestamptz not null default now()
);

-- leads: sourced clinics, sales pipeline

create table leads (
  id uuid primary key default gen_random_uuid(),
  clinic_name text not null,
  phone text not null,
  rating numeric(2, 1),
  review_count integer default 0,
  address text,
  city text,
  state text,
  speciality text,
  city_tier smallint default 3,
  stage lead_stage not null default 'new',
  priority lead_priority not null default 'normal',
  priority_score numeric default 0,
  owner_id uuid references profiles (id),
  demo_date timestamptz,
  demo_result demo_result default 'pending',
  source text default 'google_maps',
  import_batch_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index leads_phone_idx on leads (phone);
create index leads_owner_idx on leads (owner_id);
create index leads_stage_idx on leads (stage);
create index leads_state_idx on leads (state);

-- accounts: created when a lead is won; ties sales + service history together

create table accounts (
  id uuid primary key default gen_random_uuid(),
  clinic_name text not null,
  phone text not null unique,
  plan text,
  mrr numeric default 0,
  converted_from_lead_id uuid references leads (id),
  sold_by_rep_id uuid references profiles (id),
  created_at timestamptz not null default now()
);

create index accounts_phone_idx on accounts (phone);

-- activities: shared timeline for leads, accounts, and tickets

create table activities (
  id uuid primary key default gen_random_uuid(),
  subject_type activity_subject not null,
  subject_id uuid not null,
  actor_id uuid references profiles (id),
  type text not null,
  note text,
  created_at timestamptz not null default now()
);

create index activities_subject_idx on activities (subject_type, subject_id);

-- demos

create table demos (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads (id) on delete cascade,
  scheduled_at timestamptz not null,
  result demo_result not null default 'pending',
  notes text,
  created_at timestamptz not null default now()
);

create index demos_lead_idx on demos (lead_id);
create index demos_scheduled_idx on demos (scheduled_at);

-- tickets: service CRM

create table tickets (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts (id),
  channel ticket_channel not null,
  category ticket_category not null,
  description text not null,
  priority lead_priority not null default 'normal',
  status ticket_status not null default 'new',
  sla_due_at timestamptz not null,
  resolved_at timestamptz,
  resolution_notes text,
  csat smallint check (csat between 1 and 5),
  assigned_agent_id uuid references profiles (id),
  sold_by_rep_id uuid references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tickets_account_idx on tickets (account_id);
create index tickets_status_idx on tickets (status);
create index tickets_sla_idx on tickets (sla_due_at);
create index tickets_agent_idx on tickets (assigned_agent_id);

-- notifications

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  type text not null,
  payload jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on notifications (user_id, read_at);

-- import_batches: audit trail for CSV imports (ongoing + one-time migration)

create table import_batches (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'lead_import' check (kind in ('lead_import', 'legacy_migration')),
  file_name text,
  row_count integer default 0,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

alter table leads
  add constraint leads_import_batch_fk foreign key (import_batch_id) references import_batches (id);

-- updated_at maintenance

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger leads_set_updated_at before update on leads
  for each row execute function set_updated_at();

create trigger tickets_set_updated_at before update on tickets
  for each row execute function set_updated_at();

-- profiles auto-provision on new auth user

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.email),
    new.email,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'sales_rep')
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- SLA due-date defaults, keyed off ticket priority (hours): urgent=4, high=8, normal=24, low=72

create or replace function compute_sla_due_at()
returns trigger as $$
begin
  if new.sla_due_at is null then
    new.sla_due_at := new.created_at + (case new.priority
      when 'urgent' then interval '4 hours'
      when 'high' then interval '8 hours'
      when 'normal' then interval '24 hours'
      when 'low' then interval '72 hours'
    end);
  end if;
  return new;
end;
$$ language plpgsql;

create trigger tickets_compute_sla before insert on tickets
  for each row execute function compute_sla_due_at();

-- won-lead -> account conversion

create or replace function convert_won_lead_to_account()
returns trigger as $$
begin
  if new.stage = 'won' and (old.stage is distinct from 'won') then
    insert into accounts (clinic_name, phone, converted_from_lead_id, sold_by_rep_id)
    values (new.clinic_name, new.phone, new.id, new.owner_id)
    on conflict (phone) do nothing;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger leads_convert_won after update on leads
  for each row execute function convert_won_lead_to_account();
