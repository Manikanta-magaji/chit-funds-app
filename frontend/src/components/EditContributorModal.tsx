import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateSlot, updateSubMember } from "../api/endpoints";
import { normalizeMobile } from "../utils/normalizeMobile";

/** Derives the default UPI ID from a mobile number (normalized if valid). */
function inferUpi(mob: string): string {
  const norm = normalizeMobile(mob);
  return norm ? `${norm}@upi` : "";
}

interface SlotTarget {
  kind: "slot";
  slotId: number;
  name: string;
  mobile_number: string | null;
  upi_id: string | null;
}

interface SubMemberTarget {
  kind: "sub-member";
  slotId: number;
  subMemberId: number;
  name: string;
  mobile_number: string | null;
  upi_id: string | null;
  split_amount: number;
}

type Target = SlotTarget | SubMemberTarget;

interface Props {
  groupId: number;
  target: Target;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditContributorModal({ groupId, target, onClose, onSuccess }: Props) {
  const qc = useQueryClient();
  const [name, setName] = useState(target.name);
  const [mobile, setMobile] = useState(target.mobile_number ?? "");
  const [upi, setUpi] = useState(target.upi_id ?? "");
  const [amount, setAmount] = useState(
    target.kind === "sub-member" ? String(target.split_amount) : ""
  );
  const [error, setError] = useState("");

  // Reset fields if target changes (shouldn't normally happen while open, but safe)
  useEffect(() => {
    setName(target.name);
    setMobile(target.mobile_number ?? "");
    setUpi(target.upi_id ?? "");
    if (target.kind === "sub-member") setAmount(String(target.split_amount));
  }, [target]);

  const mutation = useMutation({
    mutationFn: () => {
      if (!name.trim()) throw new Error("Name cannot be empty.");
      // Normalize and validate mobile if provided
      let normalizedMobile: string | undefined;
      if (mobile.trim()) {
        const norm = normalizeMobile(mobile);
        if (!norm) throw new Error(`"${mobile}" is not a valid 10-digit mobile number.`);
        normalizedMobile = norm;
      }
      if (target.kind === "slot") {
        return updateSlot(groupId, target.slotId, {
          name: name.trim(),
          mobile_number: normalizedMobile,
          upi_id: upi.trim() || undefined,
        });
      } else {
        const amt = parseFloat(amount);
        if (isNaN(amt) || amt <= 0) throw new Error("Amount must be a positive number.");
        return updateSubMember(groupId, target.slotId, target.subMemberId, {
          name: name.trim(),
          mobile_number: normalizedMobile,
          upi_id: upi.trim() || undefined,
          split_amount: amt,
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["slots", groupId] });
      qc.invalidateQueries({ queryKey: ["draw-history", groupId] });
      onSuccess();
    },
    onError: (err: any) => setError(err.response?.data?.detail || err.message || "Failed to save."),
  });

  const handleSave = () => {
    setError("");
    mutation.mutate();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") onClose();
  };

  const title = target.kind === "slot" ? "Edit Contributor" : "Edit Sub-member";

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose} disabled={mutation.isPending}>×</button>
        </div>
        <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div>
            <label className="form-label">Name</label>
            <input
              type="text"
              className="input-sm"
              style={{ width: "100%" }}
              value={name}
              onChange={(e) => { setName(e.target.value); setError(""); }}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          </div>
          <div>
            <label className="form-label">Mobile number</label>
            <input
              type="tel"
              className="input-sm"
              style={{ width: "100%" }}
              value={mobile}
              onChange={(e) => {
                const newMobile = e.target.value;
                const prevInferred = inferUpi(mobile);
                setMobile(newMobile);
                if (!upi.trim() || upi.trim() === prevInferred) {
                  setUpi(inferUpi(newMobile));
                }
              }}
              onKeyDown={handleKeyDown}
              placeholder="e.g. 9876543210"
            />
          </div>
          <div>
            <label className="form-label">UPI ID <span className="text-muted">(optional)</span></label>
            <input
              type="text"
              className="input-sm"
              style={{ width: "100%" }}
              value={upi}
              onChange={(e) => setUpi(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Leave blank to use ${mobile.trim() || "mobile"}@upi`}
            />
          </div>
          {target.kind === "sub-member" && (
            <div>
              <label className="form-label">Split amount (₹)</label>
              <input
                type="number"
                min="1"
                className="input-sm"
                style={{ width: "100%" }}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onKeyDown={handleKeyDown}
              />
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
            onClick={handleSave}
            disabled={!name.trim() || mutation.isPending}
          >
            {mutation.isPending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
