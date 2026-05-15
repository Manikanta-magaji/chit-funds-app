import { useState, useRef, useEffect } from "react";

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getGroup, listSlots, getDrawHistory, addSlot, removeSlot, advanceCycle,
  setSubMembers, searchUsers, linkSlotToUser, linkSubMemberToUser, deleteGroup,
  getInstallments, updateGroupSettings, grantAdmin, revokeAdmin,
} from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import DrawModal from "../components/DrawModal";
import InstallmentPanel from "../components/InstallmentPanel";
import UpiPaymentModal from "../components/UpiPaymentModal";
import type { User } from "../api/types";

interface SubMemberDraft {
  name: string;
  split_amount: string;
  linked_user_id?: number;
}

interface LinkConfirmState {
  type: "slot" | "sub-member";
  slotId: number;
  subMemberId?: number;
  targetName: string;    // contributor / sub-member name
  user: User;            // selected registered user
}

function UserSuggestion({
  query,
  onSelect,
}: {
  query: string;
  onSelect: (u: User | null) => void;
}) {
  const debouncedQuery = useDebounce(query, 500);
  const { data: matches = [], isFetching } = useQuery({
    queryKey: ["user-search", debouncedQuery],
    queryFn: () => searchUsers(debouncedQuery),
    enabled: debouncedQuery.trim().length > 0,
  });

  if (!query.trim()) return null;
  if (isFetching) return <p className="suggestion-hint">Searching…</p>;
  if (matches.length === 0) return <p className="suggestion-hint text-muted">No registered user found — will be added as offline.</p>;

  return (
    <div className="suggestion-list">
      {matches.map((u) => (
        <button
          key={u.id}
          type="button"
          className="suggestion-item"
          onClick={() => onSelect(u)}
        >
          <span className="suggestion-name">{u.display_name}</span>
          <span className="suggestion-email text-muted">{u.email}</span>
        </button>
      ))}
    </div>
  );
}

function SubMemberSuggestion({ query, onSelect }: { query: string; onSelect: (u: User) => void }) {
  const debouncedQuery = useDebounce(query, 500);
  const { data: matches = [] } = useQuery({
    queryKey: ["user-search", debouncedQuery],
    queryFn: () => searchUsers(debouncedQuery),
    enabled: debouncedQuery.trim().length > 0,
  });
  if (!query.trim() || matches.length === 0) return null;
  return (
    <div className="suggestion-list" style={{ position: "absolute", zIndex: 10, top: "100%", left: 0, right: 0 }}>
      {matches.map((u) => (
        <button key={u.id} type="button" className="suggestion-item" onClick={() => onSelect(u)}>
          <span className="suggestion-name">{u.display_name}</span>
          <span className="suggestion-email text-muted">{u.email}</span>
        </button>
      ))}
    </div>
  );
}

function LinkAccountButton({ label, onLink }: { label: string; onLink: (u: User) => void }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      {!open ? (
        <button className="btn btn-sm btn-ghost" onClick={() => setOpen(true)}>{label}</button>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <input
            autoFocus
            className="input-sm"
            placeholder="Name, email or mobile"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ minWidth: "160px" }}
          />
          <UserSuggestion query={query} onSelect={(u) => { if (u) { onLink(u); setOpen(false); setQuery(""); } }} />
          <button className="btn btn-sm btn-ghost" style={{ fontSize: "0.75rem" }} onClick={() => { setOpen(false); setQuery(""); }}>Cancel</button>
        </div>
      )}
    </div>
  );
}

function AdminManagementSection({
  groupId,
  adminIds,
  createdBy,
  slots,
  currentUserId,
  onChanged,
}: {
  groupId: number;
  adminIds: number[];
  createdBy: number;
  slots: any[];
  currentUserId: number;
  onChanged: () => void;
}) {
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  // Build a name map from slot linked users for display
  const nameMap: Record<number, string> = {};
  for (const s of slots) {
    if (s.linked_user_id) nameMap[s.linked_user_id] = s.name;
    for (const sm of s.sub_members ?? []) {
      if (sm.linked_user_id) nameMap[sm.linked_user_id] = sm.name;
    }
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
              {nameMap[uid] ?? (uid === currentUserId ? "You" : `User #${uid}`)}
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
  const [showDraw, setShowDraw] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);

  // Viewed cycle — lifted here so it persists across tab switches
  const [viewCycle, setViewCycle] = useState(0);
  const prevCurrentCycleRef = useRef(0);

  // Tab navigation state
  const [activeTab, setActiveTab] = useState<"overview" | "contributors" | "history" | "settings">("overview");

  // Settings panel state
  const [settingName, setSettingName] = useState("");
  const [settingInstallment, setSettingInstallment] = useState("");
  const [settingCycles, setSettingCycles] = useState("");
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

  // Add-contributor state
  const [newSlotName, setNewSlotName] = useState("");
  const [newSlotLinkedUser, setNewSlotLinkedUser] = useState<User | null>(null);
  const [addingSlot, setAddingSlot] = useState(false);
  const [slotError, setSlotError] = useState("");
  const addInputRef = useRef<HTMLInputElement>(null);

  // Sub-member editing state
  const [expandedSlotId, setExpandedSlotId] = useState<number | null>(null);
  const [subDrafts, setSubDrafts] = useState<SubMemberDraft[]>([]);
  const [subError, setSubError] = useState("");
  const [subSaving, setSubSaving] = useState(false);

  // Link confirmation dialog state
  const [linkConfirm, setLinkConfirm] = useState<LinkConfirmState | null>(null);
  const [linkPending, setLinkPending] = useState(false);
  const [linkError, setLinkError] = useState("");

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

  const addSlotMutation = useMutation({
    mutationFn: () => addSlot(groupId, newSlotLinkedUser ? (newSlotLinkedUser.display_name ?? newSlotName.trim()) : newSlotName.trim(), newSlotLinkedUser?.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["slots", groupId] });
      qc.invalidateQueries({ queryKey: ["group", groupId] });
      setNewSlotName(""); setNewSlotLinkedUser(null); setAddingSlot(false); setSlotError("");
    },
    onError: (err: any) => setSlotError(err.response?.data?.detail || "Failed to add slot."),
  });

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

  const openSubMembers = (slot: any) => {
    const drafts: SubMemberDraft[] =
      slot.sub_members?.length > 0
        ? slot.sub_members.map((sm: any) => ({
            name: sm.name,
            split_amount: String(sm.split_amount),
            linked_user_id: sm.linked_user_id,
          }))
        : [{ name: slot.name, split_amount: group ? String(group.installment_amount) : "" }];
    setSubDrafts(drafts);
    setSubError("");
    setExpandedSlotId(slot.id);
  };

  const saveSubMembers = async (slotId: number) => {
    setSubError("");
    const total = subDrafts.reduce((s, d) => s + parseFloat(d.split_amount || "0"), 0);
    if (!group) return;
    if (Math.abs(total - group.installment_amount) > 0.01) {
      setSubError(`Split total ₹${total} must equal installment amount ₹${group.installment_amount}.`);
      return;
    }
    if (subDrafts.some((d) => !d.name.trim())) {
      setSubError("All sub-members need a name.");
      return;
    }
    setSubSaving(true);
    try {
      await setSubMembers(groupId, slotId, subDrafts.map((d) => ({
        name: d.name.trim(),
        split_amount: parseFloat(d.split_amount),
        linked_user_id: d.linked_user_id,
      })));
      qc.invalidateQueries({ queryKey: ["slots", groupId] });
      setExpandedSlotId(null);
    } catch (err: any) {
      setSubError(err.response?.data?.detail || "Failed to save.");
    } finally {
      setSubSaving(false);
    }
  };

  const confirmLink = async () => {
    if (!linkConfirm) return;
    setLinkPending(true);
    setLinkError("");
    try {
      if (linkConfirm.type === "slot") {
        await linkSlotToUser(groupId, linkConfirm.slotId, linkConfirm.user.id);
      } else {
        await linkSubMemberToUser(groupId, linkConfirm.slotId, linkConfirm.subMemberId!, linkConfirm.user.id);
      }
      qc.invalidateQueries({ queryKey: ["slots", groupId] });
      qc.invalidateQueries({ queryKey: ["group", groupId] });
      setLinkConfirm(null);
    } catch (err: any) {
      setLinkError(err.response?.data?.detail || "Linking failed.");
    } finally {
      setLinkPending(false);
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

  /** Returns true if userId is already linked to any slot or sub-member in the group. */
  const isUserAlreadyInGroup = (userId: number, excludeSlotId?: number): boolean => {
    return slots.some((s: any) => {
      if (excludeSlotId !== undefined && s.id === excludeSlotId) return false;
      if (s.linked_user_id === userId) return true;
      return (s.sub_members ?? []).some((sm: any) => sm.linked_user_id === userId);
    });
  };

  const handleAddSlot = () => {
    if (
      newSlotLinkedUser &&
      isUserAlreadyInGroup(newSlotLinkedUser.id) &&
      !window.confirm(
        `${newSlotLinkedUser.display_name ?? "This user"} is already a contributor in this group. Add them to another slot?`
      )
    ) {
      return;
    }
    addSlotMutation.mutate();
  };

  const saveSubMembersWithCheck = async (slotId: number) => {
    const duplicates = subDrafts.filter(
      (d) => d.linked_user_id && isUserAlreadyInGroup(d.linked_user_id, slotId)
    );
    if (
      duplicates.length > 0 &&
      !window.confirm(
        `${duplicates.length === 1 ? "One sub-member is" : `${duplicates.length} sub-members are`} already linked elsewhere in this group. Save anyway?`
      )
    ) {
      return;
    }
    await saveSubMembers(slotId);
  };

  if (isLoading) return <div className="page-container"><div className="loading">Loading…</div></div>;
  if (!group) return <div className="page-container"><p>Group not found.</p></div>;

  const winnerDeclared = history.some((h) => h.winner_slot != null);

  const openSettings = () => {
    setSettingName(group.name);
    setSettingInstallment(String(group.installment_amount));
    setSettingCycles(String(group.total_cycles));
    setSettingError("");
  };

  const saveSettings = async () => {
    setSettingError("");
    const patch: { name?: string; installment_amount?: number; total_cycles?: number } = {};
    if (settingName.trim() && settingName.trim() !== group.name) patch.name = settingName.trim();
    const newAmt = parseFloat(settingInstallment);
    if (!isNaN(newAmt) && newAmt !== group.installment_amount) patch.installment_amount = newAmt;
    const newCycles = parseInt(settingCycles, 10);
    if (!isNaN(newCycles) && newCycles !== group.total_cycles) patch.total_cycles = newCycles;
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
  const splitTotal = subDrafts.reduce((s, d) => s + parseFloat(d.split_amount || "0"), 0);
  const splitValid = Math.abs(splitTotal - installmentTotal) < 0.01;

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
                            : viewCycleHistory.winner_slot.upi_id
                              ? (
                                <button className="btn btn-sm btn-primary" onClick={() => setShowPayModal(true)}>
                                  💸 Pay Now
                                </button>
                              )
                              : isAdmin && (
                                <span className="text-muted" style={{ fontSize: "0.78rem" }}>No UPI ID — ask winner to update profile</span>
                              )
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
              <button className="btn btn-sm btn-secondary" onClick={() => { setAddingSlot(!addingSlot); setNewSlotName(""); setNewSlotLinkedUser(null); setSlotError(""); }}>
                + Add Contributor
              </button>
            )}
          </div>
          {addingSlot && (
            <div className="inline-form" style={{ flexDirection: "column", alignItems: "stretch", gap: "6px" }}>
              {newSlotLinkedUser ? (
                <div className="suggestion-selected">
                  <span className="badge badge-registered">Registered</span>
                  <span>{newSlotLinkedUser.display_name}</span>
                  <span className="text-muted">{newSlotLinkedUser.email}</span>
                  <button className="btn btn-sm btn-ghost" onClick={() => setNewSlotLinkedUser(null)}>✕ Clear</button>
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input
                      ref={addInputRef}
                      type="text"
                      value={newSlotName}
                      onChange={(e) => { setNewSlotName(e.target.value); setNewSlotLinkedUser(null); }}
                      placeholder="Name, email or mobile number"
                      className="input-sm"
                      style={{ flex: 1 }}
                    />
                  </div>
                  <UserSuggestion query={newSlotName} onSelect={(u) => { if (u) setNewSlotLinkedUser(u); }} />
                </>
              )}
              <div style={{ display: "flex", gap: "8px" }}>
                <button className="btn btn-sm btn-primary"
                  onClick={() => handleAddSlot()}
                  disabled={!newSlotName.trim() && !newSlotLinkedUser || addSlotMutation.isPending}>
                  Add
                </button>
                <button className="btn btn-sm btn-ghost" onClick={() => { setAddingSlot(false); setSlotError(""); setNewSlotName(""); setNewSlotLinkedUser(null); }}>
                  Cancel
                </button>
              </div>
              {slotError && <p className="form-error">{slotError}</p>}
            </div>
          )}
          <div className="contributor-list">
            {slots.map((slot: any) => {
              const isWinnerSlot = slot.id === currentCycleWinnerSlotId;
              const isExpanded = expandedSlotId === slot.id;
              const isRegistered = !!slot.linked_user_id;
              return (
                <div key={slot.id} className={`contributor-block${isWinnerSlot ? " contributor-block-winner" : ""}`}>
                  {/* Main row */}
                  <div className="contributor-row">
                    <div className="contributor-info">
                      <span className="contributor-name">{slot.name}</span>
                      {isWinnerSlot && <span className="badge badge-winner">🏆 Winner</span>}
                      {isRegistered ? (
                        <span className="badge badge-registered" title={slot.linked_user_display_name ?? undefined}>Registered</span>
                      ) : (
                        <span className="badge badge-offline">Unregistered</span>
                      )}
                      {slot.sub_members?.length > 1 && (
                        <span className="badge badge-split">{slot.sub_members.length} sub-members</span>
                      )}
                    </div>
                    <div className="contributor-actions">
                      <span className={`payment-chip payment-chip-${slot.current_cycle_payment_status || "unpaid"}`}>
                        {slot.current_cycle_payment_status === "partial"
                          ? "partially paid"
                          : slot.current_cycle_payment_status || "unpaid"}
                      </span>
                      {isAdmin && !isRegistered && (
                        <LinkAccountButton
                          label="Link Account"
                          onLink={(u) => setLinkConfirm({ type: "slot", slotId: slot.id, targetName: slot.name, user: u })}
                        />
                      )}
                      {isAdmin && (
                        <button className="btn btn-sm btn-ghost"
                          onClick={() => isExpanded ? setExpandedSlotId(null) : openSubMembers(slot)}>
                          {isExpanded ? "Close" : "Sub-members"}
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

                  {/* Sub-member editor */}
                  {isExpanded && isAdmin && (
                    <div className="sub-member-editor">
                      <div className="sub-member-header">
                        <span className="sub-header-label">Sub-member splits (must total ₹{installmentTotal.toLocaleString()})</span>
                        <button className="btn btn-sm btn-ghost"
                          onClick={() => setSubDrafts([...subDrafts, { name: "", split_amount: "" }])}>
                          + Add
                        </button>
                      </div>
                      {slot.sub_members?.length > 0 && (
                        <div className="sub-member-existing">
                          {slot.sub_members.map((sm: any) => (
                            <div key={sm.id} className="sub-member-row" style={{ alignItems: "center" }}>
                              <span style={{ flex: 2 }}>{sm.name}</span>
                              <div style={{ width: "110px", flexShrink: 0, display: "flex", alignItems: "center", gap: "4px" }}>
                                {sm.linked_user_id ? (
                                  <span className="badge badge-registered" title={sm.linked_user_display_name ?? undefined}>Registered</span>
                                ) : (
                                  <>
                                    <span className="badge badge-offline">Unregistered</span>
                                    <LinkAccountButton
                                      label="Link"
                                      onLink={(u) => setLinkConfirm({ type: "sub-member", slotId: slot.id, subMemberId: sm.id, targetName: sm.name, user: u })}
                                    />
                                  </>
                                )}
                              </div>
                              <span className="text-muted" style={{ flex: 1, textAlign: "right" }}>₹{sm.split_amount.toLocaleString()}</span>
                            </div>
                          ))}
                          <hr style={{ margin: "8px 0", borderColor: "var(--border)" }} />
                        </div>
                      )}
                      <p className="text-muted" style={{ fontSize: "0.8rem", marginBottom: "6px" }}>Edit splits below (replaces all sub-members):</p>
                      {subDrafts.map((draft, i) => (
                        <div key={i} className="sub-member-row">
                          <div style={{ position: "relative", flex: 2, minWidth: 0 }}>
                            <input
                              className="input-sm"
                              style={{ width: "100%" }}
                              type="text"
                              placeholder="Name, email or mobile"
                              value={draft.name}
                              onChange={(e) => {
                                const updated = [...subDrafts];
                                updated[i] = { ...updated[i], name: e.target.value, linked_user_id: undefined };
                                setSubDrafts(updated);
                              }}
                            />
                            {!draft.linked_user_id && (
                              <SubMemberSuggestion
                                query={draft.name}
                                onSelect={(u) => {
                                  const updated = [...subDrafts];
                                  updated[i] = { ...updated[i], name: u.display_name ?? draft.name, linked_user_id: u.id };
                                  setSubDrafts(updated);
                                }}
                              />
                            )}
                          </div>
                          <div style={{ width: "110px", flexShrink: 0 }}>
                            {draft.linked_user_id ? (
                              <span className="badge badge-registered">Registered</span>
                            ) : (
                              <span className="badge badge-offline" style={{ opacity: 0.6 }}>Unregistered</span>
                            )}
                          </div>
                          <input
                            className="input-sm"
                            style={{ flex: 1 }}
                            type="number"
                            min="0"
                            placeholder="Amount"
                            value={draft.split_amount}
                            onChange={(e) => {
                              const updated = [...subDrafts];
                              updated[i] = { ...updated[i], split_amount: e.target.value };
                              setSubDrafts(updated);
                            }}
                          />
                          {subDrafts.length > 1 && (
                            <button className="btn btn-sm btn-ghost" style={{ color: "var(--danger)" }}
                              onClick={() => setSubDrafts(subDrafts.filter((_, j) => j !== i))}>
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                      <div className="sub-member-footer">
                        <span className={`split-total ${splitValid ? "split-ok" : "split-bad"}`}>
                          Total: ₹{splitTotal.toLocaleString()} / ₹{installmentTotal.toLocaleString()}
                          {splitValid ? " ✓" : " ✗"}
                        </span>
                        {subError && <p className="form-error">{subError}</p>}
                        <div className="btn-group">
                          <button className="btn btn-sm btn-ghost" onClick={() => setExpandedSlotId(null)}>Cancel</button>
                          <button className="btn btn-sm btn-primary" disabled={!splitValid || subSaving}
                            onClick={() => saveSubMembersWithCheck(slot.id)}>
                            {subSaving ? "Saving…" : "Save"}
                          </button>
                        </div>
                      </div>
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
            createdBy={group.created_by}
            slots={slots}
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

      {showPayModal && currentCycleHistory?.winner_slot?.upi_id && (
        <UpiPaymentModal
          winnerName={currentCycleHistory.winner_slot.display_name ?? currentCycleHistory.winner_slot.name}
          winnerUpiId={currentCycleHistory.winner_slot.upi_id}
          amount={payNowTotal || group.installment_amount}
          groupName={group.name}
          cycleNumber={group.current_cycle}
          breakdown={payNowBreakdown.length > 1 ? payNowBreakdown : undefined}
          onClose={() => setShowPayModal(false)}
        />
      )}

      {/* Link-account confirmation modal */}
      {linkConfirm && (
        <div className="modal-overlay" onClick={() => { if (!linkPending) setLinkConfirm(null); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Confirm Account Link</h3>
              <button className="modal-close" onClick={() => setLinkConfirm(null)} disabled={linkPending}>×</button>
            </div>
            <div className="modal-body">
              <p>You are about to link <strong>{linkConfirm.targetName}</strong> to the registered account:</p>
              <div className="suggestion-selected" style={{ margin: "12px 0" }}>
                <span className="badge badge-registered">Registered</span>
                <span><strong>{linkConfirm.user.display_name}</strong></span>
                <span className="text-muted">{linkConfirm.user.email}</span>
              </div>
              <p className="text-muted" style={{ fontSize: "0.85rem" }}>
                Once linked, this user will immediately see historical and current cycles for this contributor.
              </p>
              {linkError && <p className="form-error">{linkError}</p>}
              <div className="btn-group mt-2">
                <button className="btn btn-ghost" onClick={() => setLinkConfirm(null)} disabled={linkPending}>Cancel</button>
                <button className="btn btn-primary" onClick={confirmLink} disabled={linkPending}>
                  {linkPending ? "Linking…" : "Confirm Link"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

