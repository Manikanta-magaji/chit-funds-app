import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { updateProfile } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";

export default function ProfileSetupPage() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState(user?.display_name || "");
  const [mobile, setMobile] = useState(user?.mobile || "");
  const [upiId, setUpiId] = useState(user?.upi_id || "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Auto-infer UPI when mobile changes (if not manually edited)
  const inferredUpi = mobile ? `${mobile}@upi` : "";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!displayName.trim()) { setError("Name is required."); return; }
    if (!mobile.trim()) { setError("Mobile number is required."); return; }
    setLoading(true);
    try {
      const updated = await updateProfile({
        display_name: displayName.trim(),
        mobile: mobile.trim(),
        upi_id: upiId.trim() || undefined,
      });
      setUser(updated);
      navigate("/groups");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to save profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">Complete Your Profile</h1>
        <p className="auth-subtitle">We need a few details to get you started</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              id="name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="mobile">Mobile Number</label>
            <input
              id="mobile"
              type="tel"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="10-digit mobile number"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="upi">
              UPI ID <span className="hint">(optional — inferred from mobile if blank)</span>
            </label>
            <input
              id="upi"
              type="text"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder={inferredUpi || "yourname@upi"}
            />
            {!upiId && inferredUpi && (
              <p className="field-hint">Will be set to: <strong>{inferredUpi}</strong></p>
            )}
          </div>
          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? "Saving…" : "Save & Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
