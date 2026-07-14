-- Row Level Security — enforces the role table from the product plan at the DB layer

create or replace function auth_role()
returns user_role as $$
  select role from profiles where id = auth.uid();
$$ language sql stable security definer set search_path = public;

create or replace function auth_state()
returns text as $$
  select territory_state from profiles where id = auth.uid();
$$ language sql stable security definer set search_path = public;

alter table profiles enable row level security;
alter table leads enable row level security;
alter table accounts enable row level security;
alter table activities enable row level security;
alter table demos enable row level security;
alter table tickets enable row level security;
alter table notifications enable row level security;
alter table import_batches enable row level security;

-- profiles: any authenticated user can read (needed for owner/assignee lookups);
-- only admins manage roles/territory, users may update their own name.

create policy profiles_select_all on profiles
  for select to authenticated using (true);

create policy profiles_admin_write on profiles
  for all to authenticated
  using (auth_role() = 'admin')
  with check (auth_role() = 'admin');

create policy profiles_self_update_name on profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from profiles p where p.id = auth.uid()));

-- leads: admin + sales_manager full; sales_rep own/territory; support_lead read-only; support_agent none

create policy leads_admin_manager_all on leads
  for all to authenticated
  using (auth_role() in ('admin', 'sales_manager'))
  with check (auth_role() in ('admin', 'sales_manager'));

create policy leads_rep_own on leads
  for all to authenticated
  using (auth_role() = 'sales_rep' and (owner_id = auth.uid() or state = auth_state()))
  with check (auth_role() = 'sales_rep' and (owner_id = auth.uid() or state = auth_state()));

create policy leads_support_lead_read on leads
  for select to authenticated
  using (auth_role() = 'support_lead');

-- demos: same visibility as the parent lead

create policy demos_via_lead on demos
  for all to authenticated
  using (exists (
    select 1 from leads l
    where l.id = demos.lead_id
      and (
        auth_role() in ('admin', 'sales_manager')
        or (auth_role() = 'sales_rep' and (l.owner_id = auth.uid() or l.state = auth_state()))
      )
  ))
  with check (exists (
    select 1 from leads l
    where l.id = demos.lead_id
      and (
        auth_role() in ('admin', 'sales_manager')
        or (auth_role() = 'sales_rep' and (l.owner_id = auth.uid() or l.state = auth_state()))
      )
  ));

create policy demos_support_lead_read on demos
  for select to authenticated
  using (auth_role() = 'support_lead');

-- accounts: admin full; sales_manager full; sales_rep read own sold accounts;
-- support_agent + support_lead full read (customer context), support_lead can also update (assignment context)

create policy accounts_admin_manager_all on accounts
  for all to authenticated
  using (auth_role() in ('admin', 'sales_manager'))
  with check (auth_role() in ('admin', 'sales_manager'));

create policy accounts_rep_own_read on accounts
  for select to authenticated
  using (auth_role() = 'sales_rep' and sold_by_rep_id = auth.uid());

create policy accounts_support_read on accounts
  for select to authenticated
  using (auth_role() in ('support_agent', 'support_lead'));

-- activities: visibility follows the subject (lead / account / ticket)

create policy activities_lead_subject on activities
  for all to authenticated
  using (
    subject_type = 'lead' and exists (
      select 1 from leads l
      where l.id = activities.subject_id
        and (
          auth_role() in ('admin', 'sales_manager', 'support_lead')
          or (auth_role() = 'sales_rep' and (l.owner_id = auth.uid() or l.state = auth_state()))
        )
    )
  )
  with check (
    subject_type = 'lead' and exists (
      select 1 from leads l
      where l.id = activities.subject_id
        and (
          auth_role() in ('admin', 'sales_manager')
          or (auth_role() = 'sales_rep' and (l.owner_id = auth.uid() or l.state = auth_state()))
        )
    )
  );

create policy activities_account_subject on activities
  for all to authenticated
  using (
    subject_type = 'account' and (
      auth_role() in ('admin', 'sales_manager', 'support_agent', 'support_lead')
      or (auth_role() = 'sales_rep' and exists (
        select 1 from accounts a where a.id = activities.subject_id and a.sold_by_rep_id = auth.uid()
      ))
    )
  )
  with check (
    subject_type = 'account' and auth_role() in ('admin', 'sales_manager', 'support_agent', 'support_lead')
  );

create policy activities_ticket_subject on activities
  for all to authenticated
  using (
    subject_type = 'ticket' and exists (
      select 1 from tickets t
      where t.id = activities.subject_id
        and (
          auth_role() in ('admin', 'support_lead', 'sales_manager')
          or (auth_role() = 'support_agent' and t.assigned_agent_id = auth.uid())
        )
    )
  )
  with check (
    subject_type = 'ticket' and exists (
      select 1 from tickets t
      where t.id = activities.subject_id
        and (
          auth_role() in ('admin', 'support_lead')
          or (auth_role() = 'support_agent' and t.assigned_agent_id = auth.uid())
        )
    )
  );

-- tickets: admin + support_lead full; support_agent own/unassigned queue; sales_manager read-only; sales_rep none

create policy tickets_admin_support_lead_all on tickets
  for all to authenticated
  using (auth_role() in ('admin', 'support_lead'))
  with check (auth_role() in ('admin', 'support_lead'));

create policy tickets_agent_queue on tickets
  for all to authenticated
  using (auth_role() = 'support_agent' and (assigned_agent_id = auth.uid() or assigned_agent_id is null))
  with check (auth_role() = 'support_agent' and (assigned_agent_id = auth.uid() or assigned_agent_id is null));

create policy tickets_manager_read on tickets
  for select to authenticated
  using (auth_role() = 'sales_manager');

-- notifications: strictly own

create policy notifications_own on notifications
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- import_batches: admin + sales_manager + sales_rep (their own runs)

create policy import_batches_admin_manager on import_batches
  for all to authenticated
  using (auth_role() in ('admin', 'sales_manager'))
  with check (auth_role() in ('admin', 'sales_manager'));

create policy import_batches_own on import_batches
  for all to authenticated
  using (auth_role() = 'sales_rep' and created_by = auth.uid())
  with check (auth_role() = 'sales_rep' and created_by = auth.uid());
