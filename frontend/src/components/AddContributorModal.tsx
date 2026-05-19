import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addSlot, setSubMembers } from "../api/endpoints";
import type { User } from "../api/types";
import UserSuggestion from "./UserSuggestion";
import { normalizeMobile } from "../utils/normalizeMobile";

interface SubDraft {
  name: string;
  split_amount: string;
  mobile_number: string;
  upi_id: string;
  linked_user_id?: number;
  dismissed?: boolean;
}

interface Props {
  groupId: number;
  installmentAmount: number;
  slots: any[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddContributorModal({ groupId, installmentAmount, slots, onClose, onSuccess }: Props) {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [linkedUser, setLinkedUser] = useState<User | null>(null);
  const [mobile, setMobile] = useState("");
  const [upi, setUpi] = useState("");
  const [isShared, setIsShared] = useState<boolean | null>(null); // null = not chosen yet
  const [subDrafts, setSubDrafts] = useState<SubDraft[]>([
    { name: "", split_amount: "", mobile_number: "", upi_id: "" },
    { name: "", split_amount: "", mobile_number: "", upi_id: "" },
  ]);
  const [error, setError] = useState("");

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  // Pre-fill equal split when sharing is selected
  useEffect(() => {
    if (isShared) {
      const half = (installmentAmount / 2).toString();
      setSubDrafts((prev) => prev.map((d) => d.split_amount ? d : { ...d, split_amount: half }));
    }
  }, [isShared, installmentAmount]);

  const isUserAlreadyInGroup = (userId: number): boolean =>
    slots.some((s: any) => {
      if (s.linked_user_id === userId) return true;
      return (s.sub_members ?? []).some((sm: any) => sm.linked_user_id === userId);
    });

  const splitTotal = subDrafts.reduce((sum, d) => sum + (parseFloat(d.split_amount) || 0), 0);
  const splitValid = Math.abs(splitTotal - installmentAmount) < 0.01;

  const mutation = useMutation({
    mutationFn: async () => {
      const isOffline = !linkedUser;

      // Validate + normalize single-contributor mobile
      let normalizedMobile: string | undefined;
      if (isOffline && isShared === false) {
        if (!mobile.trim()) throw new Error("Mobile number is required.");
        const norm = normalizeMobile(mobile);
        if (!norm) throw new Error(`"${mobile}" is not a valid 10-digit mobile number.`);
        normalizedMobile = norm;
      }

      // Validate + normalize sub-member mobiles
      let normalizedDrafts = subDrafts;
      if (isShared) {
        const result: SubDraft[] = [];
        for (const d of subDrafts.filter((d) => d.name.trim())) {
          if (!d.linked_user_id) {
            if (!d.mobile_number.trim()) throw new Error(`Mobile number is required for "${d.name}".`);
            const norm = normalizeMobile(d.mobile_number);
            if (!norm) throw new Error(`"${d.mobile_number}" is not a valid 10-digit mobile number for "${d.name}".`);
            result.push({ ...d, mobile_number: norm });
          } else {
            result.push(d);
          }
        }
        normalizedDrafts = result;
      }

      const slotName = linkedUser ? (linkedUser.display_name ?? name.trim()) : name.trim();
      const slot = await addSlot(
        groupId,
        slotName,
        linkedUser?.id,
        normalizedMobile,
        isOffline && !isShared ? upi.trim() || undefined : undefined,
      );
      if (isShared && slot?.id) {
        const validDrafts = normalizedDrafts.filter((d) => d.name.trim());
        if (validDrafts.length >= 2) {
          await setSubMembers(
            groupId,
            slot.id,
            validDrafts.map((d) => ({
              name: d.name.trim(),
              split_amount: parseFloat(d.split_amount),
              linked_user_id: d.linked_user_id,
              mobile_number: d.mobile_number.trim() || undefined,
              upi_id: d.upi_id.trim() || undefined,
            })),
          );
        }
      }
      return slot;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["slots", groupId] });
      qc.invalidateQueries({ queryKey: ["group", groupId] });
      onSuccess();
    },
    onError: (err: any) => setError(err.response?.data?.detail || err.message || "Failed to add contributor."),
  });

  const handleAdd = () => {
    setError("");
    if (isShared && !splitValid) {
      setError(`Sub-member amounts must total ₹${installmentAmount.toLocaleString()}.`);
      return;
    }
    if (
      linkedUser &&
      isUserAlreadyInGroup(linkedUser.id) &&
      !window.confirm(
        `${linkedUser.display_name ?? "This user"} is already a contributor. Add them to another slot?`
      )
    ) {
      return;
    }
    mutation.mutate();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  };

  const canAdd =
    !!(name.trim() || linkedUser) &&
    isShared !== null &&
    (isShared === false || (subDrafts.filter((d) => d.name.trim()).length >= 2 && splitValid));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        style={{ maxWidth: 560, maxHeight: "90vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>Add Contributor</h3>
          <button className="modal-close" onClick={onClose} disabled={mutation.isPending}>×</button>
        </div>
        <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* Name / registered user */}
          {linkedUser ? (
            <div className="suggestion-selected">
              <span className="badge badge-registered">Registered</span>
              <span>{linkedUser.display_name}</span>
              <span className="text-muted">{linkedUser.email}</span>
              <button className="btn btn-sm btn-ghost" onClick={() => { setLinkedUser(null); setIsShared(null); }}>✕ Clear</button>
            </div>
          ) : (
            <div style={{ position: "relative" }}>
              <input
                ref={inputRef}
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); setLinkedUser(null); setIsShared(null); setError(""); }}
                onKeyDown={handleKeyDown}
                placeholder="Contributor name or mobile number"
                className="input-sm"
                style={{ width: "100%" }}
              />
              <UserSuggestion query={name} onSelect={(u) => { if (u) { setLinkedUser(u); setName(""); setIsShared(null); } }} />
            </div>
          )}

          {/* Solo / Shared toggle */}
          {(name.trim() || linkedUser) && (
            <div>
              <p className="text-muted" style={{ fontSize: "0.82rem", marginBottom: "6px" }}>
                Paying alone or sharing with others?
              </p>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  className={`btn btn-sm ${isShared === false ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setIsShared(false)}
                >
                  Just them
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${isShared === true ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setIsShared(true)}
                >
                  Sharing with others
                </button>
              </div>
            </div>
          )}

          {/* Solo: mobile + UPI */}
          {isShared === false && !linkedUser && (
            <>
              <input
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Mobile number (required)"
                className="input-sm"
              />
              <input
                type="text"
                value={upi}
                onChange={(e) => setUpi(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="UPI ID (optional — e.g. name@bank or 9876543210@upi)"
                className="input-sm"
              />
            </>
          )}

          {/* Shared: inline sub-member form */}
          {isShared === true && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <p className="text-muted" style={{ fontSize: "0.82rem", margin: 0 }}>
                  Add each person sharing this slot — total must be ₹{installmentAmount.toLocaleString()}:
                </p>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={() => setSubDrafts([...subDrafts, { name: "", split_amount: "", mobile_number: "", upi_id: "" }])}
                >
                  + Person
                </button>
              </div>

              {subDrafts.map((draft, i) => (
                <div
                  key={i}
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    padding: "10px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                    background: "var(--bg)",
                  }}
                >
                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", minWidth: "20px" }}>#{i + 1}</span>
                    <div style={{ position: "relative", flex: 1 }}>
                      <input
                        className="input-sm"
                        style={{ width: "100%" }}
                        type="text"
                        placeholder="Name or mobile"
                        value={draft.name}
                        onChange={(e) => {
                          const updated = [...subDrafts];
                          updated[i] = { ...updated[i], name: e.target.value, linked_user_id: undefined, dismissed: false };
                          setSubDrafts(updated);
                        }}
                      />
                      <UserSuggestion
                        query={draft.name}
                        hide={draft.dismissed}
                        onSelect={(u) => {
                          if (!u) return;
                          const updated = [...subDrafts];
                          updated[i] = {
                            ...updated[i],
                            name: u.display_name ?? "",
                            linked_user_id: u.id,
                            mobile_number: updated[i].mobile_number || u.mobile_number || "",
                            upi_id: updated[i].upi_id || u.upi_id || "",
                            dismissed: true,
                          };
                          setSubDrafts(updated);
                        }}
                      />
                    </div>
                    <input
                      className="input-sm"
                      style={{ width: "90px" }}
                      type="number"
                      min="1"
                      placeholder="₹ Amount"
                      value={draft.split_amount}
                      onChange={(e) => {
                        const updated = [...subDrafts];
                        updated[i] = { ...updated[i], split_amount: e.target.value };
                        setSubDrafts(updated);
                      }}
                    />
                    {subDrafts.length > 2 && (
                      <button
                        className="btn btn-sm btn-ghost"
                        style={{ color: "var(--danger)", padding: "0 4px" }}
                        onClick={() => setSubDrafts(subDrafts.filter((_, j) => j !== i))}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  {draft.name.trim() && (
                    <div style={{ display: "flex", gap: "6px", paddingLeft: "26px" }}>
                      <input
                        className="input-sm"
                        style={{ flex: 1 }}
                        type="tel"
                        placeholder="Mobile (required)"
                        value={draft.mobile_number}
                        onChange={(e) => {
                          const updated = [...subDrafts];
                          updated[i] = { ...updated[i], mobile_number: e.target.value };
                          setSubDrafts(updated);
                        }}
                      />
                      <input
                        className="input-sm"
                        style={{ flex: 1 }}
                        type="text"
                        placeholder="UPI (optional)"
                        value={draft.upi_id}
                        onChange={(e) => {
                          const updated = [...subDrafts];
                          updated[i] = { ...updated[i], upi_id: e.target.value };
                          setSubDrafts(updated);
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}

              <div style={{ fontSize: "0.82rem", textAlign: "right" }}>
                <span style={{ color: splitValid ? "var(--success)" : "var(--danger)", fontWeight: 500 }}>
                  Total: ₹{splitTotal.toLocaleString()} / ₹{installmentAmount.toLocaleString()} {splitValid ? "✓" : "✗"}
                </span>
              </div>
            </div>
          )}

          {error && <p className="form-error">{error}</p>}
        </div>
        <div className="modal-footer" style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleAdd}
            disabled={!canAdd || mutation.isPending}
          >
            {mutation.isPending ? "Adding…" : "Add Contributor"}
          </button>
        </div>
      </div>
    </div>
  );
}
