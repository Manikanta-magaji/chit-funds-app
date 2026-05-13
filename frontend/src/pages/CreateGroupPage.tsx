import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { createGroup } from "../api/endpoints";
import { useQueryClient } from "@tanstack/react-query";

export default function CreateGroupPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [cycles, setCycles] = useState("");
  const [excludeArrears, setExcludeArrears] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    const installment_amount = parseFloat(amount);
    const total_cycles = parseInt(cycles, 10);
    if (!name.trim()) { setError("Group name is required."); return; }
    if (!installment_amount || installment_amount <= 0) { setError("Installment amount must be positive."); return; }
    if (!total_cycles || total_cycles <= 0) { setError("Number of cycles must be at least 1."); return; }
    setLoading(true);
    try {
      const group = await createGroup({ name: name.trim(), installment_amount, total_cycles, exclude_arrears_from_draw: excludeArrears });
      await qc.invalidateQueries({ queryKey: ["groups"] });
      navigate(`/groups/${group.id}`);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to create group.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container page-narrow">
      <div className="page-header">
        <h2>Create Chit Fund</h2>
        <p className="text-muted">Set up your new chit fund group</p>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="name">Group Name</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Family Fund 2025"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="amount">Monthly Installment (₹)</label>
            <input
              id="amount"
              type="number"
              min="1"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 5000"
              required
            />
            <p className="field-hint">Amount each contributor slot pays per month</p>
          </div>
          <div className="form-group">
            <label htmlFor="cycles">Number of Cycles (Months)</label>
            <input
              id="cycles"
              type="number"
              min="2"
              value={cycles}
              onChange={(e) => setCycles(e.target.value)}
              placeholder="e.g. 12"
              required
            />
            <p className="field-hint">Equal to the number of contributor slots</p>
          </div>
          <div className="form-group form-check">
            <input
              id="excludeArrears"
              type="checkbox"
              checked={excludeArrears}
              onChange={(e) => setExcludeArrears(e.target.checked)}
            />
            <label htmlFor="excludeArrears">
              Exclude slots with unpaid installments from the prize draw
            </label>
          </div>
          {error && <p className="form-error">{error}</p>}
          <div className="btn-group">
            <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Creating…" : "Create Fund"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
