import api from "./client";
import type { GroupDetail, GroupSummary, DrawHistoryEntry, InstallmentEntry, User } from "./types";

// Auth
export const getMe = () => api.get<User>("/auth/me").then((r) => r.data);
export const register = (mobile_number: string, password: string, email?: string, display_name?: string) =>
  api.post<User>("/auth/register", { mobile_number, password, email, display_name }).then((r) => r.data);
export const login = (identifier: string, password: string) =>
  api.post<User>("/auth/login", { identifier, password }).then((r) => r.data);
export const logout = () => api.post("/auth/logout");
export const updateProfile = (data: { display_name: string; mobile_number: string; upi_id?: string }) =>
  api.put<User>("/users/me/profile", data).then((r) => r.data);

// Groups
export const listGroups = () => api.get<GroupSummary[]>("/groups").then((r) => r.data);
export const getGroup = (id: number) => api.get<GroupDetail>(`/groups/${id}`).then((r) => r.data);
export const createGroup = (data: {
  name: string;
  installment_amount: number;
  total_cycles: number;
  exclude_arrears_from_draw?: boolean;
  start_date?: string; // ISO date YYYY-MM-DD
}) => api.post<GroupDetail>("/groups", data).then((r) => r.data);
export const deleteGroup = (groupId: number) =>
  api.delete(`/groups/${groupId}`).then((r) => r.data);
export const updateGroupSettings = (
  groupId: number,
  data: { name?: string; installment_amount?: number; total_cycles?: number; start_date?: string },
) => api.patch<GroupDetail>(`/groups/${groupId}`, data).then((r) => r.data);
export const grantAdmin = (groupId: number, userId: number) =>
  api.post(`/groups/${groupId}/admins`, { user_id: userId }).then((r) => r.data);
export const revokeAdmin = (groupId: number, userId: number) =>
  api.delete(`/groups/${groupId}/admins/${userId}`).then((r) => r.data);

// User search
export const searchUsers = (q: string) =>
  api.get<User[]>("/users/search", { params: { q } }).then((r) => r.data);

// Slots
export const listSlots = (groupId: number) =>
  api.get(`/groups/${groupId}/slots`).then((r) => r.data);
export const addSlot = (groupId: number, name: string, linked_user_id?: number, mobile_number?: string, upi_id?: string) =>
  api.post(`/groups/${groupId}/slots`, { name, linked_user_id, mobile_number, upi_id }).then((r) => r.data);
export const removeSlot = (groupId: number, slotId: number) =>
  api.delete(`/groups/${groupId}/slots/${slotId}`).then((r) => r.data);
export const updateSlot = (groupId: number, slotId: number, data: { name?: string; mobile_number?: string; upi_id?: string }) =>
  api.patch(`/groups/${groupId}/slots/${slotId}`, data).then((r) => r.data);
export const updateSubMember = (
  groupId: number,
  slotId: number,
  subMemberId: number,
  data: { name?: string; mobile_number?: string; upi_id?: string; split_amount?: number },
) => api.patch(`/groups/${groupId}/slots/${slotId}/sub-members/${subMemberId}`, data).then((r) => r.data);
export const setSubMembers = (
  groupId: number,
  slotId: number,
  sub_members: { name: string; linked_user_id?: number; split_amount: number; mobile_number?: string; upi_id?: string }[]
) => api.put(`/groups/${groupId}/slots/${slotId}/sub-members`, { sub_members }).then((r) => r.data);
export const linkSlotToUser = (groupId: number, slotId: number, userId: number) =>
  api.put(`/groups/${groupId}/slots/${slotId}/link`, { user_id: userId }).then((r) => r.data);
export const linkSubMemberToUser = (groupId: number, slotId: number, subMemberId: number, userId: number) =>
  api.put(`/groups/${groupId}/slots/${slotId}/sub-members/${subMemberId}/link`, { user_id: userId }).then((r) => r.data);

// Installments
export const getInstallments = (groupId: number, cycleNumber: number) =>
  api.get<InstallmentEntry[]>(`/groups/${groupId}/cycles/${cycleNumber}/installments`).then((r) => r.data);
export const markInstallment = (
  groupId: number,
  cycleNumber: number,
  slotId: number,
  action: "pay" | "unpay",
  sub_member_id?: number
) =>
  api
    .put(`/groups/${groupId}/cycles/${cycleNumber}/installments/${slotId}`, { action, sub_member_id })
    .then((r) => r.data);
export const selfReportPayment = (groupId: number, cycleNumber: number, slotId: number) =>
  api.post(`/groups/${groupId}/cycles/${cycleNumber}/installments/${slotId}/self-report`).then((r) => r.data);
export const confirmPayment = (groupId: number, cycleNumber: number, slotId: number, approve: boolean) =>
  api
    .put(`/groups/${groupId}/cycles/${cycleNumber}/installments/${slotId}/confirm`, { approve })
    .then((r) => r.data);
export const advanceCycle = (groupId: number, force = false) =>
  api.post(`/groups/${groupId}/cycles/advance?force=${force}`).then((r) => r.data);

// Draw
export const randomDraw = (groupId: number, cycleNumber: number) =>
  api.post(`/groups/${groupId}/cycles/${cycleNumber}/draw/random`).then((r) => r.data);
export const manualDraw = (
  groupId: number,
  cycleNumber: number,
  slot_id: number,
  override_eligibility = false
) =>
  api
    .post(`/groups/${groupId}/cycles/${cycleNumber}/draw/manual`, { slot_id, override_eligibility })
    .then((r) => r.data);
export const confirmDraw = (groupId: number, cycleNumber: number, slot_id: number) =>
  api.post(`/groups/${groupId}/cycles/${cycleNumber}/draw/confirm`, { slot_id }).then((r) => r.data);
export const getDrawHistory = (groupId: number) =>
  api.get<DrawHistoryEntry[]>(`/groups/${groupId}/draw-history`).then((r) => r.data);

// Payouts
export const recordPayout = (groupId: number, cycleNumber: number) =>
  api.post(`/groups/${groupId}/cycles/${cycleNumber}/payout`).then((r) => r.data);
export const winnerConfirmPayout = (groupId: number, cycleNumber: number) =>
  api.post(`/groups/${groupId}/cycles/${cycleNumber}/payout/winner-confirm`).then((r) => r.data);
export const getMyPayoutHistory = () =>
  api.get("/users/me/payout-history").then((r) => r.data);
