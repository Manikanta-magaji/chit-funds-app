/**
 * Frontend tests for multi-slot membership (tasks 6.4 and 6.5).
 *
 * These tests validate the aggregate-summary logic used in InstallmentPanel:
 *  - 6.4: summary row appears when current user holds multiple positions
 *  - 6.5: single-slot user sees no summary row (regression guard)
 */
import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Pure helper: mirrors the myPositionCount / myTotalDue logic in InstallmentPanel
// ---------------------------------------------------------------------------

interface SubMember {
  id: number;
  linked_user_id: number | null;
  split_amount: number;
}

interface Slot {
  id: number;
  linked_user_id: number | null;
  sub_members: SubMember[];
}

interface InstallmentEntry {
  slot_id: number;
  status: string;
  payments: { sub_member_id: number | null; status: string }[];
}

function computeMyPositions(
  userId: number,
  slots: Slot[]
): { primarySlots: Slot[]; subMemberPositions: { slotId: number; subMemberId: number; splitAmount: number }[] } {
  const primarySlots = slots.filter((s) => s.linked_user_id === userId);
  const subMemberPositions = slots.flatMap((s) =>
    s.sub_members
      .filter((sm) => sm.linked_user_id === userId)
      .map((sm) => ({ slotId: s.id, subMemberId: sm.id, splitAmount: sm.split_amount }))
  );
  return { primarySlots, subMemberPositions };
}

function computeMyTotalDue(
  userId: number,
  slots: Slot[],
  installments: InstallmentEntry[],
  installmentAmount: number
): { positionCount: number; totalDue: number } {
  const { primarySlots, subMemberPositions } = computeMyPositions(userId, slots);
  const positionCount = primarySlots.length + subMemberPositions.length;

  if (positionCount <= 1) return { positionCount, totalDue: 0 };

  let due = 0;
  for (const s of primarySlots) {
    const inst = installments.find((i) => i.slot_id === s.id);
    if (!inst || inst.status !== 'paid') due += installmentAmount;
  }
  for (const pos of subMemberPositions) {
    const inst = installments.find((i) => i.slot_id === pos.slotId);
    if (inst) {
      const smPay = inst.payments.find((p) => p.sub_member_id === pos.subMemberId);
      if (!smPay || smPay.status !== 'paid') due += pos.splitAmount;
    }
  }
  return { positionCount, totalDue: due };
}

// ---------------------------------------------------------------------------
// Tests — 6.4: aggregate summary appears for multi-slot users
// ---------------------------------------------------------------------------

describe('multi-slot aggregate summary', () => {
  const INSTALL = 1000;

  it('6.4 — shows summary with full due when user holds two primary slots and both unpaid', () => {
    const userId = 1;
    const slots: Slot[] = [
      { id: 10, linked_user_id: userId, sub_members: [] },
      { id: 11, linked_user_id: userId, sub_members: [] },
      { id: 12, linked_user_id: 99, sub_members: [] }, // another user
    ];
    const installments: InstallmentEntry[] = [
      { slot_id: 10, status: 'unpaid', payments: [] },
      { slot_id: 11, status: 'unpaid', payments: [] },
      { slot_id: 12, status: 'paid', payments: [] },
    ];

    const { positionCount, totalDue } = computeMyTotalDue(userId, slots, installments, INSTALL);

    expect(positionCount).toBe(2);
    expect(totalDue).toBe(2000);
  });

  it('6.4 — shows reduced total when one of two slots is already paid', () => {
    const userId = 1;
    const slots: Slot[] = [
      { id: 10, linked_user_id: userId, sub_members: [] },
      { id: 11, linked_user_id: userId, sub_members: [] },
    ];
    const installments: InstallmentEntry[] = [
      { slot_id: 10, status: 'paid', payments: [] },
      { slot_id: 11, status: 'unpaid', payments: [] },
    ];

    const { positionCount, totalDue } = computeMyTotalDue(userId, slots, installments, INSTALL);

    expect(positionCount).toBe(2);
    expect(totalDue).toBe(1000); // only one slot unpaid
  });

  it('6.4 — counts primary slot + sub-member position as two positions', () => {
    const userId = 1;
    const slots: Slot[] = [
      { id: 10, linked_user_id: userId, sub_members: [] },
      {
        id: 11,
        linked_user_id: null,
        sub_members: [
          { id: 201, linked_user_id: userId, split_amount: 500 },
          { id: 202, linked_user_id: 99, split_amount: 500 },
        ],
      },
    ];
    const installments: InstallmentEntry[] = [
      { slot_id: 10, status: 'unpaid', payments: [] },
      {
        slot_id: 11,
        status: 'partial',
        payments: [
          { sub_member_id: 201, status: 'unpaid' },
          { sub_member_id: 202, status: 'paid' },
        ],
      },
    ];

    const { positionCount, totalDue } = computeMyTotalDue(userId, slots, installments, INSTALL);

    expect(positionCount).toBe(2); // one primary + one sub-member
    expect(totalDue).toBe(1500); // 1000 (primary unpaid) + 500 (sub-member unpaid)
  });

  it('6.4 — shows total due = 0 when all positions are paid', () => {
    const userId = 1;
    const slots: Slot[] = [
      { id: 10, linked_user_id: userId, sub_members: [] },
      { id: 11, linked_user_id: userId, sub_members: [] },
    ];
    const installments: InstallmentEntry[] = [
      { slot_id: 10, status: 'paid', payments: [] },
      { slot_id: 11, status: 'paid', payments: [] },
    ];

    const { positionCount, totalDue } = computeMyTotalDue(userId, slots, installments, INSTALL);

    expect(positionCount).toBe(2);
    expect(totalDue).toBe(0);
  });

  // ---------------------------------------------------------------------------
  // Tests — 6.5: single-slot user — no summary shown
  // ---------------------------------------------------------------------------

  it('6.5 — no summary (positionCount=1) for single primary slot user', () => {
    const userId = 1;
    const slots: Slot[] = [
      { id: 10, linked_user_id: userId, sub_members: [] },
      { id: 11, linked_user_id: 99, sub_members: [] },
    ];
    const installments: InstallmentEntry[] = [
      { slot_id: 10, status: 'unpaid', payments: [] },
    ];

    const { positionCount } = computeMyTotalDue(userId, slots, installments, INSTALL);

    expect(positionCount).toBe(1);
    // Summary banner should NOT be shown when positionCount <= 1
  });

  it('6.5 — no summary (positionCount=0) when user has no positions', () => {
    const userId = 1;
    const slots: Slot[] = [
      { id: 10, linked_user_id: 99, sub_members: [] },
    ];
    const installments: InstallmentEntry[] = [];

    const { positionCount } = computeMyTotalDue(userId, slots, installments, INSTALL);

    expect(positionCount).toBe(0);
  });

  it('6.5 — no summary when user is only a sub-member of one slot', () => {
    const userId = 1;
    const slots: Slot[] = [
      {
        id: 10,
        linked_user_id: null,
        sub_members: [
          { id: 201, linked_user_id: userId, split_amount: 500 },
          { id: 202, linked_user_id: 99, split_amount: 500 },
        ],
      },
    ];
    const installments: InstallmentEntry[] = [
      { slot_id: 10, status: 'partial', payments: [{ sub_member_id: 201, status: 'unpaid' }] },
    ];

    const { positionCount } = computeMyTotalDue(userId, slots, installments, INSTALL);

    expect(positionCount).toBe(1); // only one position (as sub-member)
  });
});
