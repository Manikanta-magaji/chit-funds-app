import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { randomDraw, manualDraw, confirmDraw } from "../api/endpoints";
import type { Slot } from "../api/types";

interface Props {
  groupId: number;
  cycleNumber: number;
  slots: Slot[];
  onClose: () => void;
}

export default function DrawModal({ groupId, cycleNumber, slots, onClose }: Props) {
  const [tab, setTab] = useState<"random" | "manual">("random");
  const [candidate, setCandidate] = useState<{ slot_id: number; slot_name: string } | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<number | "">("");
  const [overrideWarning, setOverrideWarning] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const randomMutation = useMutation({
    mutationFn: () => randomDraw(groupId, cycleNumber),
    onSuccess: (data) => setCandidate({ slot_id: data.candidate_slot_id, slot_name: data.candidate_slot_name }),
  });

  const manualMutation = useMutation({
    mutationFn: ({ slotId, override }: { slotId: number; override: boolean }) =>
      manualDraw(groupId, cycleNumber, slotId, override),
    onSuccess: (data) => {
      if (data.warning) {
        setOverrideWarning(data.warning);
      } else {
        setCandidate({ slot_id: data.candidate_slot_id, slot_name: data.candidate_slot_name });
        setOverrideWarning(null);
      }
    },
  });

  const confirmMutation = useMutation({
    mutationFn: () => confirmDraw(groupId, cycleNumber, candidate!.slot_id),
    onSuccess: () => { setConfirmed(true); setTimeout(onClose, 1500); },
  });

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-header">
          <h3>Prize Draw — Cycle {cycleNumber}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {confirmed ? (
          <div className="modal-body text-center">
            <div className="winner-reveal">🎉</div>
            <h4>Winner confirmed: {candidate?.slot_name}</h4>
          </div>
        ) : candidate ? (
          <div className="modal-body text-center">
            <p className="draw-label">Selected winner</p>
            <div className="winner-card">{candidate.slot_name}</div>
            <p className="text-muted">Confirm to record this as the prize winner for cycle {cycleNumber}.</p>
            <div className="btn-group mt-2">
              <button className="btn btn-ghost" onClick={() => setCandidate(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => confirmMutation.mutate()}
                disabled={confirmMutation.isPending}>
                {confirmMutation.isPending ? "Confirming…" : "Confirm Winner"}
              </button>
            </div>
          </div>
        ) : (
          <div className="modal-body">
            <div className="tab-bar">
              <button className={`tab ${tab === "random" ? "active" : ""}`} onClick={() => setTab("random")}>
                🎲 Random Draw
              </button>
              <button className={`tab ${tab === "manual" ? "active" : ""}`} onClick={() => setTab("manual")}>
                ✏️ Manual Select
              </button>
            </div>

            {tab === "random" && (
              <div className="tab-content text-center">
                <p>Click below to randomly pick a winner from eligible contributors.</p>
                <button className="btn btn-primary btn-lg mt-2" onClick={() => randomMutation.mutate()}
                  disabled={randomMutation.isPending}>
                  {randomMutation.isPending ? "Drawing…" : "Draw!"}
                </button>
                {randomMutation.isError && (
                  <p className="form-error">{(randomMutation.error as any)?.response?.data?.detail}</p>
                )}
              </div>
            )}

            {tab === "manual" && (
              <div className="tab-content">
                <div className="form-group">
                  <label>Select contributor</label>
                  <select value={selectedSlotId} onChange={(e) => { setSelectedSlotId(Number(e.target.value)); setOverrideWarning(null); }}>
                    <option value="">— Choose a contributor —</option>
                    {slots.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                {overrideWarning && (
                  <div className="alert alert-warning">
                    <p>{overrideWarning}</p>
                    <button className="btn btn-sm btn-warning" onClick={() =>
                      manualMutation.mutate({ slotId: Number(selectedSlotId), override: true })
                    }>
                      Select Anyway
                    </button>
                  </div>
                )}
                <button className="btn btn-primary" onClick={() => manualMutation.mutate({ slotId: Number(selectedSlotId), override: false })}
                  disabled={!selectedSlotId || manualMutation.isPending}>
                  {manualMutation.isPending ? "Selecting…" : "Select Winner"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
