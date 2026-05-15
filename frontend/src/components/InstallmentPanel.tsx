import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getInstallments, markInstallment } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import type { Slot } from "../api/types";

interface Props {
  groupId: number;
  currentCycle: number;
  totalCycles: number;
  isAdmin: boolean;
  installmentAmount: number;
  slots: Slot[];
  winnerSlotId?: number | null;
  groupCreatedAt: string;
  viewCycle: number;
  onViewCycleChange: (cycle: number) => void;
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
  if (status === "pending" || status === "partial") return "badge-warning";
  return "badge-error";
}

function statusLabel(status: string) {
  if (status === "paid") return "Paid";
  if (status === "pending" || status === "partial") return "In Progress";
  return "Unpaid";
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" });
}

export default function InstallmentPanel({ groupId, currentCycle, totalCycles, isAdmin, installmentAmount, slots, winnerSlotId, groupCreatedAt, viewCycle, onViewCycleChange }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [expandedSlots, setExpandedSlots] = useState<Set<number>>(new Set());

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

  // All positions (primary slots + sub-member entries) belonging to the current user
  const myPrimaryPositions = slots.filter((s: any) => s.linked_user_id === user!.id);
  const mySubMemberPositions = slots.flatMap((s: any) =>
    ((s.sub_members ?? []) as any[])
      .filter((sm: any) => sm.linked_user_id === user!.id)
      .map((sm: any) => ({ slotId: s.id, subMemberId: sm.id, splitAmount: sm.split_amount as number }))
  );
  const myPositionCount = myPrimaryPositions.length + mySubMemberPositions.length;

  // Total unpaid amount across all of the user's positions for the viewed cycle
  const myTotalDue = myPositionCount > 1
    ? (() => {
        let due = 0;
        for (const s of myPrimaryPositions) {
          const inst = installments.find((i: any) => i.slot_id === s.id);
          if (!inst || inst.status !== "paid") due += installmentAmount;
        }
        for (const pos of mySubMemberPositions) {
          const inst = installments.find((i: any) => i.slot_id === pos.slotId);
          if (inst) {
            const smPay = (inst.payments ?? []).find((p: any) => p.sub_member_id === pos.subMemberId);
            if (!smPay || smPay.status !== "paid") due += pos.splitAmount;
          }
        }
        return due;
      })()
    : 0;

  const isCurrentCycleView = viewCycle === currentCycle;
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
            onChange={(e) => onViewCycleChange(Number(e.target.value))}
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
            <span className="badge badge-warning">{installments.filter((i: any) => i.status === "partial" || i.status === "pending").length} in progress</span>
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

      {/* Multi-slot summary for the current user */}
      {!isAdmin && myPositionCount > 1 && (
        <div className="info-banner">
          You have {myPositionCount} slots in this group —{" "}
          {myTotalDue > 0
            ? <>Total due this cycle: <strong>₹{myTotalDue.toLocaleString()}</strong></>
            : <strong>All paid for this cycle ✓</strong>}
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
                {(isCurrentCycleView || isAdmin) && <th>Actions</th>}
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
                          {statusLabel(item.status)}
                        </span>
                      </td>
                      <td className="text-muted small">{fmtDate(item.paid_at)}</td>
                      <td className="text-muted small">
                        {item.confirmed_by_name || "—"}
                      </td>
                      {(isCurrentCycleView || isAdmin) && (
                        <td>
                          <div className="btn-group">
                            {/* Slot-level actions only for slots without multiple sub-members */}
                            {!hasSubMembers && (isAdmin || (isCurrentCycleView && isMySlot)) && item.status !== "paid" && !isWinner && (
                              <button
                                className="btn btn-sm btn-success"
                                disabled={markMutation.isPending || (!isCurrentCycleView ? false : !winnerSlotId)}
                                title={isCurrentCycleView && !winnerSlotId ? "Draw Prize first" : undefined}
                                onClick={() => markMutation.mutate({ slotId: item.slot_id, action: "pay" })}>
                                Mark Paid
                              </button>
                            )}
                            {!hasSubMembers && (isAdmin || (isCurrentCycleView && isMySlot)) && item.status === "paid" && !isWinner && (
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
                            <span className={`badge ${statusBadgeClass(smStatus)}`}>{statusLabel(smStatus)}</span>
                          </td>
                          <td className="text-muted small">{fmtDate(smPayment?.paid_at ?? null)}</td>
                          <td className="text-muted small">{smPayment?.confirmed_by_name || "—"}</td>
                          {(isCurrentCycleView || isAdmin) && (
                            <td>
                              <div className="btn-group">
                                {(isAdmin || (isCurrentCycleView && isMySubMember)) && smStatus !== "paid" && !isWinner && (
                                  <button
                                    className="btn btn-sm btn-success"
                                    disabled={markMutation.isPending || (isCurrentCycleView && !winnerSlotId)}
                                    title={isCurrentCycleView && !winnerSlotId ? "Draw Prize first" : undefined}
                                    onClick={() => markMutation.mutate({ slotId: item.slot_id, action: "pay", subMemberId: sm.id })}>
                                    Mark Paid
                                  </button>
                                )}
                                {(isAdmin || (isCurrentCycleView && isMySubMember)) && smStatus === "paid" && !isWinner && (
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


    </div>
  );
}

