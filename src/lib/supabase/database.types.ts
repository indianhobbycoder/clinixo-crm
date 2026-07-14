export type UserRole = "admin" | "sales_manager" | "sales_rep" | "support_agent" | "support_lead";
export type LeadStage = "new" | "contacted" | "demo_scheduled" | "demo_done" | "negotiation" | "won" | "lost";
export type LeadPriority = "urgent" | "high" | "normal" | "low";
export type DemoResult = "pending" | "won" | "lost" | "no_show" | "rescheduled";
export type TicketChannel = "phone" | "whatsapp" | "email";
export type TicketCategory = "billing" | "product_bug" | "training" | "hardware" | "other";
export type TicketStatus = "new" | "acknowledged" | "in_progress" | "resolved" | "closed";
export type ActivitySubject = "lead" | "account" | "ticket";

export type Profile = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  territory_state: string | null;
  created_at: string;
};

export type Lead = {
  id: string;
  clinic_name: string;
  phone: string;
  rating: number | null;
  review_count: number;
  address: string | null;
  city: string | null;
  state: string | null;
  speciality: string | null;
  city_tier: number;
  stage: LeadStage;
  priority: LeadPriority;
  priority_score: number;
  deal_value: number;
  owner_id: string | null;
  demo_date: string | null;
  demo_result: DemoResult;
  source: string;
  import_batch_id: string | null;
  created_at: string;
  updated_at: string;
};

export type Account = {
  id: string;
  clinic_name: string;
  phone: string;
  plan: string | null;
  mrr: number;
  converted_from_lead_id: string | null;
  sold_by_rep_id: string | null;
  created_at: string;
};

export type Activity = {
  id: string;
  subject_type: ActivitySubject;
  subject_id: string;
  actor_id: string | null;
  type: string;
  note: string | null;
  created_at: string;
};

export type Demo = {
  id: string;
  lead_id: string;
  scheduled_at: string;
  result: DemoResult;
  notes: string | null;
  created_at: string;
};

export type Ticket = {
  id: string;
  account_id: string;
  channel: TicketChannel;
  category: TicketCategory;
  description: string;
  priority: LeadPriority;
  status: TicketStatus;
  sla_due_at: string;
  resolved_at: string | null;
  resolution_notes: string | null;
  csat: number | null;
  assigned_agent_id: string | null;
  sold_by_rep_id: string | null;
  created_at: string;
  updated_at: string;
};

export type Notification = {
  id: string;
  user_id: string;
  type: string;
  payload: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
};

export type ImportBatch = {
  id: string;
  kind: "lead_import" | "legacy_migration";
  file_name: string | null;
  row_count: number;
  created_by: string | null;
  created_at: string;
};

interface Relationship {
  foreignKeyName: string;
  columns: string[];
  isOneToOne?: boolean;
  referencedRelation: string;
  referencedColumns: string[];
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & Pick<Profile, "id" | "name" | "email">;
        Update: Partial<Profile>;
        Relationships: Relationship[];
      };
      leads: {
        Row: Lead;
        Insert: Partial<Lead> & Pick<Lead, "clinic_name" | "phone">;
        Update: Partial<Lead>;
        Relationships: Relationship[];
      };
      accounts: {
        Row: Account;
        Insert: Partial<Account> & Pick<Account, "clinic_name" | "phone">;
        Update: Partial<Account>;
        Relationships: Relationship[];
      };
      activities: {
        Row: Activity;
        Insert: Partial<Activity> & Pick<Activity, "subject_type" | "subject_id" | "type">;
        Update: Partial<Activity>;
        Relationships: Relationship[];
      };
      demos: {
        Row: Demo;
        Insert: Partial<Demo> & Pick<Demo, "lead_id" | "scheduled_at">;
        Update: Partial<Demo>;
        Relationships: Relationship[];
      };
      tickets: {
        Row: Ticket;
        Insert: Partial<Ticket> & Pick<Ticket, "account_id" | "channel" | "category" | "description">;
        Update: Partial<Ticket>;
        Relationships: Relationship[];
      };
      notifications: {
        Row: Notification;
        Insert: Partial<Notification> & Pick<Notification, "user_id" | "type">;
        Update: Partial<Notification>;
        Relationships: Relationship[];
      };
      import_batches: {
        Row: ImportBatch;
        Insert: Partial<ImportBatch>;
        Update: Partial<ImportBatch>;
        Relationships: Relationship[];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
