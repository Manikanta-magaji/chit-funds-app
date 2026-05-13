import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <nav className="navbar">
      <Link to="/groups" className="navbar-brand">
        🪙 ChitFund
      </Link>
      {user && (
        <div className="navbar-menu">
          <Link to="/groups" className="navbar-link">My Funds</Link>
          <Link to="/profile" className="navbar-link">{user.display_name}</Link>
          <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Sign Out</button>
        </div>
      )}
    </nav>
  );
}
