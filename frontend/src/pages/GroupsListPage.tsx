import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { listGroups } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";

export default function GroupsListPage() {
  const { user } = useAuth();
  const { data: groups = [], isLoading } = useQuery({
    queryKey: ["groups"],
    queryFn: listGroups,
  });

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2>My Chit Funds</h2>
          <p className="text-muted">Welcome back, {user?.display_name}!</p>
        </div>
        <Link to="/groups/new" className="btn btn-primary">
          + Create Fund
        </Link>
      </div>

      {isLoading ? (
        <div className="skeleton-list">
          {[1,2,3].map(i => <div key={i} className="skeleton-card" />)}
        </div>
      ) : groups.length === 0 ? (
        <div className="empty-state">
          <p>You're not part of any chit fund yet.</p>
          <Link to="/groups/new" className="btn btn-primary">Create your first fund</Link>
        </div>
      ) : (
        <div className="card-grid">
          {groups.map((g) => (
            <Link key={g.id} to={`/groups/${g.id}`} className="group-card">
              <div className="group-card-header">
                <h3>{g.name}</h3>
                <span className={`badge ${g.is_admin ? "badge-admin" : "badge-member"}`}>
                  {g.is_admin ? "Admin" : "Member"}
                </span>
              </div>
              <div className="group-card-body">
                <div className="stat">
                  <span className="stat-label">Installment</span>
                  <span className="stat-value">₹{g.installment_amount.toLocaleString()}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Cycle</span>
                  <span className="stat-value">{g.current_cycle} / {g.total_cycles}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
