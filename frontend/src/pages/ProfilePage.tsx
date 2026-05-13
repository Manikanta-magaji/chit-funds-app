import { useState } from "react";
import type { FormEvent } from "react";
import { updateProfile } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const [displayName, setDisplayName] = useState(user?.display_name || "");
  const [mobile, setMobile] = useState(user?.mobile || "");
  const [upiId, setUpiId] = useState(user?.upi_id || "");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const inferredUpi = mobile ? `${mobile}@upi` : "";
  const isInferred = user?.upi_id === inferredUpi;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");
    setLoading(true);
    try {
      const updated = await updateProfile({
        display_name: displayName.trim(),
        mobile: mobile.trim(),
        upi_id: upiId.trim() || undefined,
      });
      setUser(updated);
      setSuccess("Profile updated successfully.");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Profile Settings</h2>
        <p className="text-muted">{user?.email}</p>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              id="name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
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
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="upi">UPI ID</label>
            <input
              id="upi"
              type="text"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder={inferredUpi}
            />
            {isInferred && (
              <p className="field-hint">
                This was inferred from your mobile number. <strong>Edit</strong> to change it.
              </p>
            )}
          </div>
          {error && <p className="form-error">{error}</p>}
          {success && <p className="form-success">{success}</p>}
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Saving…" : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
}
