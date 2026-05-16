import { useState, useRef, useEffect } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getGroup, listSlots, getDrawHistory, removeSlot, advanceCycle,
  setSubMembers, deleteGroup,
  getInstallments, updateGroupSettings, grantAdmin, revokeAdmin,
} from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import DrawModal from "../components/DrawModal";
import InstallmentPanel from "../components/InstallmentPanel";
import UpiPaymentModal from "../components/UpiPaymentModal";
import AddContributorModal from "../components/AddContributorModal";
import EditContributorModal from "../components/EditContributorModal";
import UserSuggestion from "../components/UserSuggestion";
import type { User } from "../api/types";
import { normalizeMobile } from "../utils/normalizeMobile";

function AdminManagementSection({
  groupId,
  adminIds,
  adminUsers,
  createdBy,
  currentUserId,
  onChanged,
}: {
  groupId: number;
  adminIds: number[];
  adminUsers: { id: number; display_name: string | null }[];
  createdBy: number;
  currentUserId: number;
  onChanged: () => void;
}) {
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const nameMap: Record<number, string> = {};
  for (const a of adminUsers) {
    if (a.display_name) nameMap[a.id] = a.display_name;
  }

  const handleGrant = async (u: User) => {
    setError("");
    setPending(true);
    try {
      await grantAdmin(groupId, u.id);
      onChanged();
      setQuery("");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to grant admin.");
    } finally {
      setPending(false);
    }
  };

  const handleRevoke = async (userId: number) => {
    setError("");
    try {
      await revokeAdmin(groupId, userId);
      onChanged();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to revoke admin.");
    }
  };

  return (
    <div className="section">
      <div className="section-header">
        <h3>Admins</h3>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxWidth: "480px" }}>
        {adminIds.map((uid) => (
          <div key={uid} className="slot-row" style={{ padding: "8px 12px" }}>
            <span style={{ flex: 1 }}>
              {uid === currentUserId ? "You" : (nameMap[uid] ?? "Admin")}
              {uid === createdBy && <span className="badge badge-registered" style={{ marginLeft: "6px" }}>Creator</span>}
            </span>
            {adminIds.length > 1 && (
              <button
                className="btn btn-sm btn-ghost"
                style={{ color: "var(--danger)" }}
                onClick={() => handleRevoke(uid)}
              >
                Revoke
              </button>
            )}
          </div>
        ))}
        <div style={{ marginTop: "8px" }}>
          <p className="text-muted" style={{ fontSize: "0.85rem", marginBottom: "4px" }}>Add admin (search by name, email, or mobile):</p>
          <div style={{ position: "relative" }}>
            <input
              className="input-sm"
              placeholder="Search user…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={pending}
              style={{ width: "100%" }}
            />
            <UserSuggestion
              query={query}
              onSelect={(u) => {
                if (u) handleGrant(u);
              }}
            />
          </div>
          {error && <p className="form-error" style={{ marginTop: "4px" }}>{error}</p>}
        </div>
      </div>
    </div>
  );
}

export default function GroupDashboardPage() {
  const { id } = useParams<{ id: string }>();
  const groupId = Number(id);
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const [showDraw, setShowDraw] = useState(false);
  const [showPayModal, setShowPayModal] = useState<{ payeeName: string; payeeUpiId: string | null; amount: number } | null>(null);

  // Viewed cycle — lifted here so it persists across tab switches
  const [viewCycle, setViewCycle] = useState(0);
  const prevCurrentCycleRef = useRef(0);

  // Tab navigation state
  const [activeTab, setActiveTab] = useState<"overview" | "contributors" | "history" | "settings">(
    (location.state as any)?.tab ?? "overview"
  );

  // Settings panel state
  const [settingName, setSettingName] = useState("");
  const [settingInstallment, setSettingInstallment] = useState("");
  const [settingCycles, setSettingCycles] = useState("");
  const [settingStartMonth, setSettingStartMonth] = useState("");
  const [settingStartYear, setSettingStartYear] = useState("");
  const [settingError, setSettingError] = useState("");
  const [settingSaving, setSettingSaving] = useState(false);

  const deleteGroupMutation = useMutation({
    mutationFn: () => deleteGroup(groupId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["groups"] });
      navigate("/groups");
    },
    onError: (err: any) => alert(err.response?.data?.detail || "Failed to delete group."),
  });

  const handleDeleteGroup = () => {
    if (window.confirm(`Delete "${group?.name}" and all its records? This cannot be undone.`)) {
      deleteGroupMutation.mutate();
    }
  };

  // Add-contributor modal state
  const [showAddModal, setShowAddModal] = useState(false);
  type EditTarget =
    | { kind: "slot"; slotId: number; name: string; mobile_number: string | null; upi_id: string | null }
    | { kind: "sub-member"; slotId: number; subMemberId: number; name: string; mobile_number: string | null; upi_id: string | null; split_amount: number };
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);

  // Sub-member editing state
  const [expandedSlotIds, setExpandedSlotIds] = useState<Set<number>>(new Set());
  const [editingSubsSlotId, setEditingSubsSlotId] = useState<number | null>(null);
  const [editSubsDrafts, setEditSubsDrafts] = useState<{ id: number; name: string; mobile_number: string; upi_id: string; split_amount: string; isRegistered: boolean; linked_user_id?: number }[]>([]);
  const [editSubsSaving, setEditSubsSaving] = useState(false);
  const [editSubsError, setEditSubsError] = useState("");
  const [addContributorError, setAddContributorError] = useState("");

  const { data: group, isLoading } = useQuery({
    queryKey: ["group", groupId],
    queryFn: () => getGroup(groupId),
  });

  const { data: slots = [] } = useQuery({
    queryKey: ["slots", groupId],
    queryFn: () => listSlots(groupId),
  });

  const { data: history = [] } = useQuery({
    queryKey: ["draw-history", groupId],
    queryFn: () => getDrawHistory(groupId),
  });

  const isAdmin = group?.admin_ids.includes(user!.id) ?? false;

  // Initialise viewCycle once group loads; reset when current_cycle advances
  useEffect(() => {
    if (group?.current_cycle && viewCycle === 0) setViewCycle(group.current_cycle);
  }, [group?.current_cycle]);
  useEffect(() => {
    if (group?.current_cycle && group.current_cycle !== prevCurrentCycleRef.current) {
      prevCurrentCycleRef.current = group.current_cycle;
      setViewCycle(group.current_cycle);
    }
  }, [group?.current_cycle]);

  const removeSlotMutation = useMutation({
    mutationFn: (slotId: number) => removeSlot(groupId, slotId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["slots", groupId] });
      qc.invalidateQueries({ queryKey: ["group", groupId] });
    },
    onError: (err: any) => alert(err.response?.data?.detail || "Cannot remove slot."),
  });

  const advanceMutation = useMutation({
    mutationFn: (force: boolean) => advanceCycle(groupId, force),
    onSuccess: (data) => {
      if (data.warning) {
        if (window.confirm(`Warning: ${data.unpaid_slots?.join(", ")} have unpaid installments.\n\nAdvance anyway?`)) {
          advanceMutation.mutate(true);
        }
      } else {
        qc.invalidateQueries({ queryKey: ["group", groupId] });
        qc.invalidateQueries({ queryKey: ["draw-history", groupId] });
        qc.invalidateQueries({ queryKey: ["slots", groupId] });
      }
    },
    onError: (err: any) => alert(err.response?.data?.detail || "Cannot advance cycle."),
  });

  const expandSubMembers = (slotId: number) =>
    setExpandedSlotIds(prev => new Set([...prev, slotId]));

  const collapseSubMembers = (slotId: number) => {
    setExpandedSlotIds(prev => { const n = new Set(prev); n.delete(slotId); return n; });
  };

  const saveSubMemberEdits = async (slotId: number) => {
    if (!group) return;
    if (editSubsDrafts.length === 0) {
      setEditSubsError("At least one sub-member is required.");
      return;
    }
    const total = editSubsDrafts.reduce((s, d) => s + parseFloat(d.split_amount || "0"), 0);
    if (Math.abs(total - group.installment_amount) > 0.01) {
      setEditSubsError(`Split total ₹${total.toLocaleString()} must equal ₹${group.installment_amount.toLocaleString()}.`);
      return;
    }
    if (editSubsDrafts.some((d) => !d.isRegistered && !d.name.trim())) {
      setEditSubsError("All sub-members need a name.");
      return;
    }
    const offlineWithoutMobile = editSubsDrafts.find((d) => !d.isRegistered && !d.mobile_number?.trim());
    if (offlineWithoutMobile) {
      setEditSubsError(`Mobile number is required for "${offlineWithoutMobile.name || "(unnamed)"}"`);
      return;
    }
    // Normalize mobile numbers
    const normalized: typeof editSubsDrafts = [];
    for (const d of editSubsDrafts) {
      if (d.isRegistered || !d.mobile_number?.trim()) {
        normalized.push(d);
      } else {
        const norm = normalizeMobile(d.mobile_number);
        if (!norm) {
          setEditSubsError(`"${d.mobile_number}" is not a valid 10-digit mobile number for "${d.name}".`);
          return;
        }
        normalized.push({ ...d, mobile_number: norm });
      }
    }
    setEditSubsSaving(true);
    setEditSubsError("");
    try {
      await setSubMembers(groupId, slotId, normalized.map((d) => ({
        name: d.name.trim(),
        split_amount: parseFloat(d.split_amount),
        linked_user_id: d.linked_user_id,
        mobile_number: d.linked_user_id ? undefined : d.mobile_number?.trim() || undefined,
        upi_id: d.linked_user_id ? undefined : d.upi_id?.trim() || undefined,
      })));
      qc.invalidateQueries({ queryKey: ["slots", groupId] });
      setEditingSubsSlotId(null);
      setEditSubsDrafts([]);
    } catch (e: any) {
      setEditSubsError(e.response?.data?.detail || "Failed to save.");
    } finally {
      setEditSubsSaving(false);
    }
  };

  // Winner for the cycle currently being viewed in InstallmentPanel
  const viewCycleHistory = history.find((h) => h.cycle_number === viewCycle);
  const viewCycleWinnerSlotId = viewCycleHistory?.winner_slot?.id ?? null;
  // Winner for the actual current cycle — used to gate the Draw Prize button
  const currentCycleHistory = history.find((h) => h.cycle_number === group?.current_cycle);
  const currentCycleWinnerSlotId = currentCycleHistory?.winner_slot?.id ?? null;

  // Read installments for the selected viewCycle (shared cache with InstallmentPanel)
  const { data: currentInstallments = [], isFetched: installmentsFetched } = useQuery({
    queryKey: ["installments", groupId, viewCycle],
    queryFn: () => getInstallments(groupId, viewCycle),
    enabled: !!group && viewCycle > 0,
  });

  // Collect all positions (primary slots + sub-member entries) belonging to the current user,
  // excluding the winner slot. Used to compute the consolidated Pay Now amount.
  const mySlotIds = slots
    .filter((s: any) => s.linked_user_id === user!.id)
    .map((s: any) => s.id as number);

  const iAmTheWinner = mySlotIds.includes(viewCycleWinnerSlotId ?? -1);

  const myPayNowPositions: { label: string; amount: number }[] = (() => {
    const positions: { label: string; amount: number }[] = [];
    for (const s of slots as any[]) {
      if (s.linked_user_id !== user!.id) continue;
      if (s.id === viewCycleWinnerSlotId) continue; // winner slot excluded
      const inst = (currentInstallments as any[]).find((i) => i.slot_id === s.id);
      if (!inst || inst.status !== "paid") {
        positions.push({ label: s.name, amount: group?.installment_amount ?? 0 });
      }
    }
    for (const s of slots as any[]) {
      if (s.id === viewCycleWinnerSlotId) continue; // winner slot excluded
      for (const sm of (s.sub_members ?? []) as any[]) {
        if (sm.linked_user_id !== user!.id) continue;
        const inst = (currentInstallments as any[]).find((i) => i.slot_id === s.id);
        const smPayment = inst?.payments?.find((p: any) => p.sub_member_id === sm.id);
        if (!smPayment || smPayment.status !== "paid") {
          positions.push({ label: `${s.name} (${sm.name})`, amount: sm.split_amount as number });
        }
      }
    }
    return positions;
  })();

  const payNowTotal = myPayNowPositions.reduce((sum, p) => sum + p.amount, 0);
  const payNowBreakdown = myPayNowPositions;

  // Auto-expand slots with sub-members when Contributors tab is active
  useEffect(() => {
    if (activeTab === "contributors" && slots.length > 0) {
      setExpandedSlotIds(new Set(
        slots
          .filter((s: any) => (s.sub_members?.length ?? 0) > 0)
          .map((s: any) => s.id)
      ));
    }
  }, [activeTab, slots]);

  if (isLoading) return <div className="page-container"><div className="loading">Loading…</div></div>;
  if (!group) return <div className="page-container"><p>Group not found.</p></div>;

  const winnerDeclared = history.some((h) => h.winner_slot != null);

  const openSettings = () => {
    setSettingName(group.name);
    setSettingInstallment(String(group.installment_amount));
    setSettingCycles(String(group.total_cycles));
    if (group.start_date) {
      const [, m, ] = group.start_date.split("-");
      setSettingStartMonth(String(parseInt(m, 10)));
      setSettingStartYear(group.start_date.split("-")[0]);
    } else {
      setSettingStartMonth("");
      setSettingStartYear("");
    }
    setSettingError("");
  };

  const saveSettings = async () => {
    setSettingError("");
    const patch: { name?: string; installment_amount?: number; total_cycles?: number; start_date?: string } = {};
    if (settingName.trim() && settingName.trim() !== group.name) patch.name = settingName.trim();
    const newAmt = parseFloat(settingInstallment);
    if (!isNaN(newAmt) && newAmt !== group.installment_amount) patch.installment_amount = newAmt;
    const newCycles = parseInt(settingCycles, 10);
    if (!isNaN(newCycles) && newCycles !== group.total_cycles) patch.total_cycles = newCycles;
    // start_date: both must be filled or both empty; partial is an error
    if (settingStartMonth && settingStartYear) {
      const iso = `${settingStartYear}-${String(parseInt(settingStartMonth, 10)).padStart(2, "0")}-01`;
      if (iso !== (group.start_date ?? "")) patch.start_date = iso;
    } else if (settingStartMonth || settingStartYear) {
      setSettingError("Please fill in both start month and year, or leave both empty.");
      return;
    }
    if (Object.keys(patch).length === 0) { return; }
    setSettingSaving(true);
    try {
      await updateGroupSettings(groupId, patch);
      qc.invalidateQueries({ queryKey: ["group", groupId] });
    } catch (err: any) {
      setSettingError(err.response?.data?.detail || "Failed to save settings.");
    } finally {
      setSettingSaving(false);
    }
  };

  const installmentTotal = group.installment_amount;

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="breadcrumb"><Link to="/groups">My Funds</Link> / {group.name}</div>
          <h2>{group.name}</h2>
        </div>
      </div>

      {/* Tab Bar (Task 2.2) */}
      <div className="tab-bar">
        <button className={`tab-btn${activeTab === "overview" ? " tab-btn-active" : ""}`} onClick={() => setActiveTab("overview")}>Overview</button>
        <button className={`tab-btn${activeTab === "contributors" ? " tab-btn-active" : ""}`} onClick={() => setActiveTab("contributors")}>Contributors</button>
        <button className={`tab-btn${activeTab === "history" ? " tab-btn-active" : ""}`} onClick={() => setActiveTab("history")}>History</button>
        {isAdmin && (
          <button className={`tab-btn${activeTab === "settings" ? " tab-btn-active" : ""}`} onClick={() => { setActiveTab("settings"); openSettings(); }}>Settings</button>
        )}
      </div>

      {/* ── Overview Tab (Task 3.1) ── */}
      {activeTab === "overview" && (
        <>
          {/* Admin cycle actions */}
          {isAdmin && (
            <div className="btn-group" style={{ marginBottom: "1rem" }}>
              <button className="btn btn-secondary" onClick={() => setShowDraw(true)}
                disabled={!!currentCycleWinnerSlotId}>
                🎲 Draw Prize
              </button>
              <button className="btn btn-secondary" onClick={() => advanceMutation.mutate(false)}
                disabled={advanceMutation.isPending}>
                Next Cycle →
              </button>
            </div>
          )}

          {/* Stats */}
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-label">Monthly Installment</span>
              <span className="stat-value">₹{group.installment_amount.toLocaleString()}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Current Cycle</span>
              <span className="stat-value">{group.current_cycle} / {group.total_cycles}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Contributors</span>
              <span className="stat-value">{slots.length} / {group.total_cycles}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">
                {viewCycle === group.current_cycle ? "This Month's Winner" : `Cycle ${viewCycle} Winner`}
              </span>
              <span className="stat-value">
                {viewCycleHistory?.winner_slot
                  ? (
                    <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "0.4rem" }}>
                      <span>🏆 {viewCycleHistory.winner_slot.name}</span>
                      {viewCycle === group.current_cycle && (
                        iAmTheWinner
                          ? <span className="text-muted" style={{ fontSize: "0.85rem" }}>You won this cycle 🎉</span>
                          : installmentsFetched && payNowTotal === 0
                            ? <span className="text-muted" style={{ fontSize: "0.85rem" }}>✓ All payments cleared</span>
                            : (() => {
                                // Use live slot data (always fresh after edits) rather than
                                // the draw-history snapshot, so UPI changes show immediately.
                                const liveWinnerSlot = slots.find((s: any) => s.id === viewCycleWinnerSlotId);
                                const subMembers: any[] = liveWinnerSlot?.sub_members ?? [];
                                if (subMembers.length > 1) {
                                  // Multi-sub-member: one Pay Now per sub-member
                                  const perShare = payNowTotal > 0 ? payNowTotal / subMembers.length : group.installment_amount / subMembers.length;
                                  return (
                                    <span style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                      {subMembers.map((sm) => (
                                        <span key={sm.id} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                          <span style={{ fontSize: "0.82rem" }}>{sm.name}</span>
                                          {sm.upi_id ? (
                                            <button
                                              className="btn btn-sm btn-primary"
                                              onClick={() => setShowPayModal({ payeeName: sm.name, payeeUpiId: sm.upi_id, amount: sm.share_amount ?? perShare })}
                                            >
                                              💸 Pay {sm.name.split(" ")[0]}
                                            </button>
                                          ) : (
                                            <span className="text-muted" style={{ fontSize: "0.78rem" }}>No UPI available</span>
                                          )}
                                        </span>
                                      ))}
                                    </span>
                                  );
                                }
                                // Single slot or single sub-member
                                const upi = subMembers.length === 1 ? subMembers[0].upi_id : liveWinnerSlot?.upi_id;
                                const payeeName = subMembers.length === 1
                                  ? subMembers[0].name
                                  : (liveWinnerSlot?.display_name ?? liveWinnerSlot?.name ?? viewCycleHistory.winner_slot.name);
                                return upi ? (
                                  <button className="btn btn-sm btn-primary" onClick={() => setShowPayModal({ payeeName, payeeUpiId: upi, amount: payNowTotal || group.installment_amount })}>
                                    💸 Pay Now
                                  </button>
                                ) : isAdmin && (
                                  <span className="text-muted" style={{ fontSize: "0.78rem" }}>No UPI ID — ask winner to update profile</span>
                                );
                              })()
                      )}
                    </span>
                  )
                  : <span className="text-muted">Not drawn yet</span>}
              </span>
            </div>
          </div>

          {/* Installment Tracking */}
          <InstallmentPanel
            groupId={groupId}
            currentCycle={group.current_cycle}
            totalCycles={group.total_cycles}
            isAdmin={isAdmin}
            installmentAmount={group.installment_amount}
            slots={slots}
            winnerSlotId={viewCycleWinnerSlotId}
            groupCreatedAt={group.created_at}
            groupStartDate={group.start_date}
            viewCycle={viewCycle}
            onViewCycleChange={setViewCycle}
          />

        </>
      )}

      {/* ── Contributors Tab (Task 4.1) ── */}
      {activeTab === "contributors" && (
        <div className="section">
          <div className="section-header">
            <h3>Contributors</h3>
            {isAdmin && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <button className="btn btn-sm btn-secondary" onClick={() => {
                  if (slots.length >= group.total_cycles) {
                    setAddContributorError("Group is full — remove a slot to add another.");
                  } else {
                    setAddContributorError("");
                    setShowAddModal(true);
                  }
                }}>
                  + Add Contributor
                </button>
                {addContributorError && <span style={{ color: "var(--danger)", fontSize: ".85rem" }}>{addContributorError}</span>}
              </div>
            )}
          </div>
          <div className="contributor-list">
            {slots.map((slot: any) => {
              const isWinnerSlot = slot.id === currentCycleWinnerSlotId;
              const isExpanded = expandedSlotIds.has(slot.id);
              const isRegistered = !!slot.linked_user_id;
              return (
                <div key={slot.id} className={`contributor-block${isWinnerSlot ? " contributor-block-winner" : ""}${isRegistered && !isWinnerSlot ? " contributor-block-registered" : ""}`}>
                  {/* Main row */}
                  <div className="contributor-row">
                    <div className="contributor-info">
                      <span className="contributor-name">{slot.name}</span>
                      {isWinnerSlot && <span title="Prize winner this cycle" style={{ marginLeft: "4px" }}>🏆</span>}
                      {slot.sub_members?.length > 1 && (
                        <span className="badge badge-split">{slot.sub_members.length} sub-members</span>
                      )}
                    </div>
                    <div className="contributor-actions">
                      {isAdmin && slot.sub_members?.length > 0 && (
                        <button className="btn btn-sm btn-ghost"
                          onClick={() => isExpanded ? collapseSubMembers(slot.id) : expandSubMembers(slot.id)}>
                          {isExpanded ? "Close" : "Sub-members"}
                        </button>
                      )}
                      {isAdmin && !isRegistered && (
                        <button
                          className="btn btn-sm btn-ghost"
                          onClick={() => setEditTarget({ kind: "slot", slotId: slot.id, name: slot.name, mobile_number: slot.mobile_number ?? null, upi_id: slot.upi_id ?? null })}
                        >
                          Edit
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          className="btn btn-sm btn-ghost"
                          style={{ color: "var(--danger)" }}
                          onClick={() => {
                            if (window.confirm(`Remove "${slot.name}"?`)) removeSlotMutation.mutate(slot.id);
                          }}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Sub-member section */}
                  {isExpanded && isAdmin && (
                    <div className="sub-member-editor">
                      <div className="sub-member-header">
                        <span className="sub-header-label">Sub-members</span>
                        <div style={{ display: "flex", gap: "4px" }}>
                          {slot.sub_members?.length > 0 && editingSubsSlotId !== slot.id && (
                            <button className="btn btn-sm btn-ghost"
                              onClick={() => {
                                setEditingSubsSlotId(slot.id);
                                setEditSubsDrafts((slot.sub_members ?? []).map((sm: any) => ({
                                  id: sm.id,
                                  name: sm.name,
                                  mobile_number: sm.mobile_number ?? "",
                                  upi_id: sm.upi_id ?? "",
                                  split_amount: String(sm.split_amount),
                                  isRegistered: !!sm.linked_user_id,
                                  linked_user_id: sm.linked_user_id ?? undefined,
                                })));
                                setEditSubsError("");
                              }}>
                              Edit
                            </button>
                          )}
                          {editingSubsSlotId === slot.id && (
                            <button className="btn btn-sm btn-ghost"
                              onClick={() => setEditSubsDrafts([...editSubsDrafts, {
                                id: -(Date.now()),
                                name: "", mobile_number: "", upi_id: "",
                                split_amount: "", isRegistered: false,
                              }])}>
                              + Add Sub-member
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Edit mode: all sub-members as inputs with total validation */}
                      {editingSubsSlotId === slot.id && (() => {
                        const editTotal = editSubsDrafts.reduce((s, d) => s + parseFloat(d.split_amount || "0"), 0);
                        const editValid = Math.abs(editTotal - installmentTotal) < 0.01;
                        return (
                          <>
                            {editSubsDrafts.map((d, di) => (
                              <div key={d.id} className="sub-member-row">
                                {d.isRegistered
                                  ? <span style={{ flex: 3, minWidth: 0 }}>{d.name}</span>
                                  : <input className="input-sm" style={{ flex: 3, minWidth: 0 }} placeholder="Name"
                                      value={d.name}
                                      onChange={(e) => { const u = [...editSubsDrafts]; u[di] = { ...u[di], name: e.target.value }; setEditSubsDrafts(u); }} />
                                }
                                <input className="input-sm" style={{ flex: 2, minWidth: 0 }} type="tel" placeholder="Mobile"
                                  disabled={d.isRegistered}
                                  value={d.mobile_number}
                                  onChange={(e) => {
                                    if (d.isRegistered) return;
                                    const newMobile = e.target.value;
                                    const prevInferred = normalizeMobile(d.mobile_number)
                                      ? `${normalizeMobile(d.mobile_number)}@upi`
                                      : "";
                                    const u = [...editSubsDrafts];
                                    u[di] = {
                                      ...u[di],
                                      mobile_number: newMobile,
                                      upi_id: (!u[di].upi_id.trim() || u[di].upi_id.trim() === prevInferred)
                                        ? (normalizeMobile(newMobile) ? `${normalizeMobile(newMobile)}@upi` : "")
                                        : u[di].upi_id,
                                    };
                                    setEditSubsDrafts(u);
                                  }} />
                                <input className="input-sm" style={{ flex: 2, minWidth: 0 }} placeholder="UPI ID"
                                  disabled={d.isRegistered}
                                  value={d.upi_id}
                                  onChange={(e) => { if (d.isRegistered) return; const u = [...editSubsDrafts]; u[di] = { ...u[di], upi_id: e.target.value }; setEditSubsDrafts(u); }} />
                                <input className="input-sm" style={{ flex: 1, minWidth: 80 }} type="number" placeholder="Amount"
                                  value={d.split_amount}
                                  onChange={(e) => { const u = [...editSubsDrafts]; u[di] = { ...u[di], split_amount: e.target.value }; setEditSubsDrafts(u); }} />
                                <button className="btn btn-sm btn-ghost" style={{ color: "var(--danger)", flexShrink: 0 }}
                                  onClick={() => setEditSubsDrafts(editSubsDrafts.filter((_, j) => j !== di))}>
                                  Remove
                                </button>
                              </div>
                            ))}
                            <div className="sub-member-footer">
                              <span className={`split-total ${editValid ? "split-ok" : "split-bad"}`}>
                                Total: ₹{editTotal.toLocaleString()} / ₹{installmentTotal.toLocaleString()}{editValid ? " ✓" : " ✗"}
                              </span>
                              {editSubsError && <p className="form-error">{editSubsError}</p>}
                              <div className="btn-group">
                                <button className="btn btn-sm btn-ghost"
                                  onClick={() => { setEditingSubsSlotId(null); setEditSubsDrafts([]); setEditSubsError(""); }}>
                                  Cancel
                                </button>
                                <button className="btn btn-sm btn-primary" disabled={!editValid || editSubsSaving}
                                  onClick={() => saveSubMemberEdits(slot.id)}>
                                  {editSubsSaving ? "Saving…" : "Save"}
                                </button>
                              </div>
                            </div>
                          </>
                        );
                      })()}

                      {/* View mode: name-only read-only rows */}
                      {editingSubsSlotId !== slot.id && (slot.sub_members ?? []).map((sm: any) => (
                        <div key={sm.id} className="sub-member-row">
                          <span style={{ flex: 1 }}>{sm.name}</span>
                        </div>
                      ))}

                    </div>
                  )}
                </div>
              );
            })}
          </div>


        </div>
      )}

      {/* ── History Tab (Tasks 5.1, 5.2) ── */}
      {activeTab === "history" && (
        <>
          {isAdmin && (
            <div className="section-header" style={{ marginBottom: "1rem" }}>
              <div className="btn-group">
                <button className="btn btn-secondary" onClick={() => setShowDraw(true)}
                  disabled={!!currentCycleWinnerSlotId}>
                  🎲 Draw Prize
                </button>
                <button className="btn btn-secondary" onClick={() => advanceMutation.mutate(false)}
                  disabled={advanceMutation.isPending}>
                  Next Cycle →
                </button>
              </div>
            </div>
          )}
          <div className="section">
            <h3>Prize History</h3>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Winner</th>
                    <th>Payout</th>
                  </tr>
                </thead>
                <tbody>
                  {history.filter((h) => h.winner_slot).map((h) => {
                    const d = new Date(group.created_at);
                    d.setMonth(d.getMonth() + h.cycle_number - 1);
                    const monthLabel = d.toLocaleDateString("en-IN", { year: "numeric", month: "short" });
                    return (
                      <tr key={h.cycle_number}>
                        <td>{monthLabel}</td>
                        <td>
                          <span>🏆 {h.winner_slot!.name}</span>
                        </td>
                        <td>
                          {h.payout_status ? (
                            <span className={`badge ${h.payout_status === "completed" ? "badge-success" : "badge-warning"}`}>
                              {h.payout_status}
                            </span>
                          ) : <span className="text-muted">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                  {history.filter((h) => h.winner_slot).length === 0 && (
                    <tr><td colSpan={3} className="text-muted" style={{ textAlign: "center" }}>No draws yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── Settings Tab (Tasks 6.1, 6.3) — admin only ── */}
      {activeTab === "settings" && isAdmin && (
        <>
          {/* Fund Settings */}
          <div className="section">
            <div className="section-header">
              <h3>Fund Settings</h3>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "420px" }}>
              <div className="form-group">
                <label>Fund Name</label>
                <input
                  value={settingName}
                  onChange={(e) => setSettingName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>
                  Monthly Installment (₹)
                  {winnerDeclared && <span className="hint"> — locked after first draw 🔒</span>}
                </label>
                <input
                  type="number"
                  min="1"
                  value={settingInstallment}
                  onChange={(e) => setSettingInstallment(e.target.value)}
                  disabled={winnerDeclared}
                />
              </div>
              <div className="form-group">
                <label>
                  Total Cycles
                  {winnerDeclared && <span className="hint"> — locked after first draw 🔒</span>}
                </label>
                <input
                  type="number"
                  min={slots.length}
                  value={settingCycles}
                  onChange={(e) => setSettingCycles(e.target.value)}
                  disabled={winnerDeclared}
                />
              </div>
              <div className="form-group">
                <label>
                  Fund Start Month/Year
                  {winnerDeclared && <span className="hint"> — locked after first draw 🔒</span>}
                </label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <select
                    value={settingStartMonth}
                    onChange={(e) => setSettingStartMonth(e.target.value)}
                    disabled={winnerDeclared}
                    style={{ flex: 1 }}
                  >
                    <option value="">Month (optional)</option>
                    {["January","February","March","April","May","June","July","August","September","October","November","December"].map((m, i) => (
                      <option key={i + 1} value={String(i + 1)}>{m}</option>
                    ))}
                  </select>
                  <select
                    value={settingStartYear}
                    onChange={(e) => setSettingStartYear(e.target.value)}
                    disabled={winnerDeclared}
                    style={{ flex: 1 }}
                  >
                    <option value="">Year (optional)</option>
                    {Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 5 + i).map((y) => (
                      <option key={y} value={String(y)}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
              {settingError && <p className="form-error">{settingError}</p>}
              <div className="btn-group">
                <button className="btn btn-primary" onClick={saveSettings} disabled={settingSaving}>
                  {settingSaving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </div>
          </div>

          {/* Admin Management */}
          <AdminManagementSection
            groupId={groupId}
            adminIds={group.admin_ids}
            adminUsers={group.admin_users ?? []}
            createdBy={group.created_by}
            currentUserId={user!.id}
            onChanged={() => qc.invalidateQueries({ queryKey: ["group", groupId] })}
          />

          {/* Danger Zone — Delete Fund (Task 6.3) */}
          <div className="section">
            <div className="section-header">
              <h3>Danger Zone</h3>
            </div>
            <button className="btn btn-danger" onClick={handleDeleteGroup}
              disabled={deleteGroupMutation.isPending}>
              🗑 Delete Fund
            </button>
          </div>
        </>
      )}

      {/* Modals — always rendered outside tabs (Task 7.2) */}
      {showAddModal && (
        <AddContributorModal
          groupId={groupId}
          installmentAmount={group.installment_amount}
          slots={slots}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => setShowAddModal(false)}
        />
      )}

      {editTarget && (
        <EditContributorModal
          groupId={groupId}
          target={editTarget}
          onClose={() => setEditTarget(null)}
          onSuccess={() => setEditTarget(null)}
        />
      )}

      {showDraw && (
        <DrawModal
          groupId={groupId}
          cycleNumber={group.current_cycle}
          slots={slots}
          onClose={() => {
            setShowDraw(false);
            qc.invalidateQueries({ queryKey: ["draw-history", groupId] });
            qc.invalidateQueries({ queryKey: ["group", groupId] });
            qc.invalidateQueries({ queryKey: ["installments", groupId, group.current_cycle] });
            qc.invalidateQueries({ queryKey: ["slots", groupId] });
          }}
        />
      )}

      {showPayModal && showPayModal.payeeUpiId && (
        <UpiPaymentModal
          winnerName={showPayModal.payeeName}
          winnerUpiId={showPayModal.payeeUpiId}
          amount={showPayModal.amount}
          groupName={group.name}
          cycleNumber={group.current_cycle}
          breakdown={payNowBreakdown.length > 1 ? payNowBreakdown : undefined}
          onClose={() => setShowPayModal(null)}
        />
      )}

    </div>
  );
}

