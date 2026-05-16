export interface User {
  id: number;
  email: string | null;
  display_name: string | null;
  mobile_number: string | null;
  upi_id: string | null;
  is_profile_complete: boolean;
}

export interface GroupSummary {
  id: number;
  name: string;
  installment_amount: number;
  total_cycles: number;
  current_cycle: number;
  is_admin: boolean;
}

export interface SubMember {
  id: number;
  name: string;
  linked_user_id: number | null;
  linked_user_display_name: string | null;
  split_amount: number;
  mobile_number: string | null;
  upi_id: string | null;
}

export interface Slot {
  id: number;
  name: string;
  is_offline: boolean;
  linked_user_id: number | null;
  linked_user_display_name: string | null;
  mobile_number: string | null;
  upi_id: string | null;
  sub_members: SubMember[];
  current_cycle_payment_status?: string;
}

export interface AdminUser {
  id: number;
  display_name: string | null;
}

export interface GroupDetail {
  id: number;
  name: string;
  installment_amount: number;
  total_cycles: number;
  current_cycle: number;
  exclude_arrears_from_draw: boolean;
  start_date: string | null;  // ISO date string YYYY-MM-DD, optional
  created_by: number;
  created_at: string;
  admin_ids: number[];
  admin_users: AdminUser[];
  slots: Slot[];
}

export interface DrawHistoryEntry {
  cycle_number: number;
  is_closed: boolean;
  winner_slot: {
    id: number;
    name: string;
    upi_id: string | null;
    display_name: string | null;
    sub_members: { id: number; name: string; upi_id: string | null; share_amount: number }[];
  } | null;
  payout_status: "pending" | "completed" | null;
}

export interface InstallmentEntry {
  slot_id: number;
  slot_name: string;
  status: "unpaid" | "pending" | "paid" | "partial";
  confirmed_by_name: string | null;
  is_self_reported: boolean;
  paid_at: string | null;
  payments: {
    id: number;
    sub_member_id: number | null;
    status: "unpaid" | "pending" | "paid";
    paid_at: string | null;
    confirmed_by: number | null;
    confirmed_by_name: string | null;
  }[];
}
