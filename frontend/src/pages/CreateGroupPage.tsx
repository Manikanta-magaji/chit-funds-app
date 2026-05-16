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

  // Optional start month/year (default: current month/year)
  const today = new Date();
  const [startMonth, setStartMonth] = useState(String(today.getMonth() + 1));   // "1"–"12"
  const [startYear, setStartYear] = useState(String(today.getFullYear()));       // "2024" etc.

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    const installment_amount = parseFloat(amount);
    const total_cycles = parseInt(cycles, 10);
    if (!name.trim()) { setError("Group name is required."); return; }
    if (!installment_amount || installment_amount <= 0) { setError("Installment amount must be positive."); return; }
    if (!total_cycles || total_cycles <= 0) { setError("Number of cycles must be at least 1."); return; }

    let start_date: string | undefined;
    if (startMonth && startYear) {
      const m = parseInt(startMonth, 10);
      const y = parseInt(startYear, 10);
      if (isNaN(m) || m < 1 || m > 12 || isNaN(y) || y < 2000 || y > 2100) {
        setError("Please enter a valid start month and year."); return;
      }
      start_date = `${y}-${String(m).padStart(2, "0")}-01`;
    } else if (startMonth || startYear) {
      setError("Please fill in both start month and year, or leave both empty."); return;
    }

    setLoading(true);
    try {
      const group = await createGroup({ name: name.trim(), installment_amount, total_cycles, exclude_arrears_from_draw: excludeArrears, start_date });
      await qc.invalidateQueries({ queryKey: ["groups"] });
      navigate(`/groups/${group.id}`, { state: { tab: "contributors" } });
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to create group.");
    } finally {
      setLoading(false);
    }
  };

  // Build year options: 5 years back to 5 years forward
  const yearOptions: number[] = [];
  for (let y = today.getFullYear() - 5; y <= today.getFullYear() + 5; y++) {
    yearOptions.push(y);
  }

  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];

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
          <div className="form-group">
            <label>Start Month & Year <span className="text-muted">(optional)</span></label>
            <div style={{ display: "flex", gap: "8px" }}>
              <select
                value={startMonth}
                onChange={(e) => setStartMonth(e.target.value)}
                style={{ flex: 1 }}
              >
                <option value="">Month</option>
                {monthNames.map((m, i) => (
                  <option key={i + 1} value={String(i + 1)}>{m}</option>
                ))}
              </select>
              <select
                value={startYear}
                onChange={(e) => setStartYear(e.target.value)}
                style={{ flex: 1 }}
              >
                <option value="">Year</option>
                {yearOptions.map((y) => (
                  <option key={y} value={String(y)}>{y}</option>
                ))}
              </select>
            </div>
            <p className="field-hint">When the fund started or will start — used for reference only</p>
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
