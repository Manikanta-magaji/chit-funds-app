import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getInstallments, markInstallment, confirmPayment, recordPayout, winnerConfirmPayout } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import type { Slot } from "../api/types";

interface Props {
  groupId: number;
  currentCycle: number;
  totalCycles: number;
  isAdmin: boolean;
  slots: Slot[];
  winnerSlotId?: number | null;
  groupCreatedAt: string;
}

// Parse year/month directly from ISO string to avoid Date mutation / timezone issues
function cycleLabel(cycleNum: number, createdAt: string): string {
  const match = createdAt.match(/^(\d{4})-(\d{2})/);
  if (!match) return `Cycle ${cycleNum}`;
  let year = parseInt(match[1], 10);
  let month = parseInt(match[2], 10) - 1; // 0-indexed
  month += cycleNum - 1;
  year += Math.floor(month / 12);
  month = ((month % 12) + 12) % 12;
  return new Date(year, month, 1).toLocaleDateString("en-IN", { year: "numeric", month: "short" });
}

function statusBadgeClass(status: string) {
  if (status === "paid") return "badge-success";
  if (status === "pending") return "badge-warning";
  if (status === "partial") return "badge-partial";
  return "badge-error";
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" });
}

export default function InstallmentPanel({ groupId, currentCycle, totalCycles, isAdmin, slots, winnerSlotId, groupCreatedAt }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [viewCycle, setViewCycle] = useState(currentCycle);
  const [expandedSlots, setExpandedSlots] = useState<Set<number>>(new Set());

  useEffect(() => { setViewCycle(currentCycle); }, [currentCycle]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["installments", groupId, viewCycle] });
    qc.invalidateQueries({ queryKey: ["slots", groupId] });
    qc.invalidateQueries({ queryKey: ["draw-history", groupId] });
  };

  const { data: installments = [], isLoading } = useQuery({
    queryKey: ["installments", groupId, viewCycle],
    queryFn: () => getInstallments(groupId, viewCycle),
  });

  const markMutation = useMutation({
    mutationFn: ({ slotId, action, subMemberId }: { slotId: number; action: "pay" | "unpay"; subMemberId?: number }) =>
      markInstallment(groupId, viewCycle, slotId, action, subMemberId),
    onSuccess: invalidate,
  });

  const confirmMutation = useMutation({
    mutationFn: ({ slotId, approve }: { slotId: number; approve: boolean }) =>
      confirmPayment(groupId, viewCycle, slotId, approve),
    onSuccess: invalidate,
  });

  const payoutMutation = useMutation({
    mutationFn: () => recordPayout(groupId, currentCycle),
    onSuccess: invalidate,
    onError: (err: any) => alert(err.response?.data?.detail || "Failed."),
  });

  const winnerConfirmMutation = useMutation({
    mutationFn: () => winnerConfirmPayout(groupId, currentCycle),
    onSuccess: invalidate,
    onError: (err: any) => alert(err.response?.data?.detail || "Failed."),
  });

  const toggleExpand = (slotId: number) => {
    setExpandedSlots((prev) => {
      const next = new Set(prev);
      next.has(slotId) ? next.delete(slotId) : next.add(slotId);
      return next;
    });
  };

  const mySlotIds = slots
    .filter((s: any) => s.linked_user_id === user!.id)
    .map((s: any) => s.id);

  const isCurrentCycleView = viewCycle === currentCycle;
  const pendingItems = installments.filter((i: any) => i.status === "pending");
  const cycles = Array.from({ length: totalCycles }, (_, i) => i + 1);

  return (
    <div className="section">
      {/* Header with cycle selector */}
      <div className="section-header">
        <h3>Installments</h3>
        <div className="cycle-selector">
          <label htmlFor="cycle-select">Cycle:</label>
          <select
            id="cycle-select"
            value={viewCycle}
            onChange={(e) => setViewCycle(Number(e.target.value))}
            className="input-sm"
          >
            {cycles.map((c) => (
              <option key={c} value={c}>
                {cycleLabel(c, groupCreatedAt)}{c === currentCycle ? " (current)" : ""}
              </option>
            ))}
          </select>
          <div className="badge-group">
            <span className="badge badge-success">{installments.filter((i: any) => i.status === "paid").length} paid</span>
            <span className="badge badge-warning">{pendingItems.length} pending</span>
            <span className="badge badge-partial">{installments.filter((i: any) => i.status === "partial").length} partial</span>
            <span className="badge badge-error">{installments.filter((i: any) => i.status === "unpaid").length} unpaid</span>
          </div>
        </div>
      </div>

      {/* Draw-required notice */}
      {isAdmin && isCurrentCycleView && !winnerSlotId && (
        <div className="info-banner">
          ⚠️ Draw Prize first before marking installments as paid.
        </div>
      )}

      {/* Admin: pending confirmations */}
      {isAdmin && isCurrentCycleView && pendingItems.length > 0 && (
        <div className="pending-panel">
          <h4>⏳ Pending Confirmations</h4>
          {pendingItems.map((item: any) => (
            <div key={item.slot_id} className="pending-row">
              <div>
                <span className="fw-600">{item.slot_name}</span>
                <span className="text-muted ml-1">— self-reported payment</span>
              </div>
              <div className="btn-group">
                <button className="btn btn-sm btn-success" onClick={() => confirmMutation.mutate({ slotId: item.slot_id, approve: true })}>
                  Approve
                </button>
                <button className="btn btn-sm btn-danger" onClick={() => confirmMutation.mutate({ slotId: item.slot_id, approve: false })}>
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Installment table */}
      {isLoading ? (
        <p className="text-muted">Loading…</p>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Contributor</th>
                <th>Status</th>
                <th>Paid at</th>
                <th>Confirmed by</th>
                {isCurrentCycleView && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {installments.map((item: any) => {
                const slotInfo = slots.find((s: any) => s.id === item.slot_id);
                const subMembers: any[] = slotInfo?.sub_members ?? [];
                const hasSubMembers = subMembers.length > 1;
                const isExpanded = expandedSlots.has(item.slot_id);
                const isMySlot = mySlotIds.includes(item.slot_id);
                const isWinner = winnerSlotId === item.slot_id;

                return (
                  <React.Fragment key={item.slot_id}>
                    {/* Slot row */}
                    <tr className={isWinner ? "row-winner" : ""}>
                      <td>
                        {hasSubMembers && (
                          <button
                            className="btn btn-sm btn-ghost"
                            style={{ padding: "0 .3rem", marginRight: ".3rem" }}
                            onClick={() => toggleExpand(item.slot_id)}
                            title={isExpanded ? "Collapse" : "Expand sub-members"}
                          >
                            {isExpanded ? "▾" : "▸"}
                          </button>
                        )}
                        <span className="fw-600">{item.slot_name}</span>
                        {isWinner && <span className="badge badge-winner ml-1">🏆 Winner</span>}
                      </td>
                      <td>
                        <span className={`badge ${statusBadgeClass(item.status)}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="text-muted small">{fmtDate(item.paid_at)}</td>
                      <td className="text-muted small">
                        {item.is_self_reported ? <em>Self-reported</em> : item.confirmed_by_name || "—"}
                      </td>
                      {isCurrentCycleView && (
                        <td>
                          <div className="btn-group">
                            {/* Slot-level actions only for slots without multiple sub-members */}
                            {!hasSubMembers && (isAdmin || isMySlot) && item.status !== "paid" && !isWinner && (
                              <button
                                className="btn btn-sm btn-success"
                                disabled={markMutation.isPending || !winnerSlotId}
                                title={!winnerSlotId ? "Draw Prize first" : undefined}
                                onClick={() => markMutation.mutate({ slotId: item.slot_id, action: "pay" })}>
                                Mark Paid
                              </button>
                            )}
                            {!hasSubMembers && (isAdmin || isMySlot) && item.status === "paid" && !isWinner && (
                              <button className="btn btn-sm btn-ghost" disabled={markMutation.isPending}
                                onClick={() => markMutation.mutate({ slotId: item.slot_id, action: "unpay" })}>
                                Undo
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>

                    {/* Sub-member rows */}
                    {hasSubMembers && isExpanded && subMembers.map((sm: any) => {
                      const smPayment = item.payments.find((p: any) => p.sub_member_id === sm.id);
                      const smStatus: string = smPayment?.status || "unpaid";
                      const isMySubMember = sm.linked_user_id === user!.id;
                      return (
                        <tr key={`sm-${sm.id}`} className="sub-member-payment-row">
                          <td>
                            <span className="sub-indent">↳</span>
                            {sm.name}
                            <span className="text-muted small ml-1">₹{sm.split_amount.toLocaleString()}</span>
                          </td>
                          <td>
                            <span className={`badge ${statusBadgeClass(smStatus)}`}>{smStatus}</span>
                          </td>
                          <td className="text-muted small">{fmtDate(smPayment?.paid_at ?? null)}</td>
                          <td className="text-muted small">{smPayment?.confirmed_by_name || "—"}</td>
                          {isCurrentCycleView && (
                            <td>
                              <div className="btn-group">
                                {(isAdmin || isMySubMember) && smStatus !== "paid" && !isWinner && (
                                  <button
                                    className="btn btn-sm btn-success"
                                    disabled={markMutation.isPending || !winnerSlotId}
                                    title={!winnerSlotId ? "Draw Prize first" : undefined}
                                    onClick={() => markMutation.mutate({ slotId: item.slot_id, action: "pay", subMemberId: sm.id })}>
                                    Mark Paid
                                  </button>
                                )}
                                {(isAdmin || isMySubMember) && smStatus === "paid" && !isWinner && (
                                  <button className="btn btn-sm btn-ghost" disabled={markMutation.isPending}
                                    onClick={() => markMutation.mutate({ slotId: item.slot_id, action: "unpay", subMemberId: sm.id })}>
                                    Undo
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Payout actions — only on current cycle */}
      {isCurrentCycleView && (
        <div className="btn-group mt-2">
          {isAdmin && (
            <button className="btn btn-secondary" onClick={() => payoutMutation.mutate()}
              disabled={payoutMutation.isPending}>
              Mark Payout Sent
            </button>
          )}
          {mySlotIds.some((id) => id === winnerSlotId) && (
            <button className="btn btn-secondary" onClick={() => winnerConfirmMutation.mutate()}
              disabled={winnerConfirmMutation.isPending}>
              Confirm Payout Received
            </button>
          )}
        </div>
      )}
    </div>
  );
}

