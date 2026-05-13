import { Routes, Route } from "react-router-dom";
import { RequireAuth, RequireAuthNoProfileCheck, RedirectIfAuthed } from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ProfileSetupPage from "./pages/ProfileSetupPage";
import ProfilePage from "./pages/ProfilePage";
import GroupsListPage from "./pages/GroupsListPage";
import CreateGroupPage from "./pages/CreateGroupPage";
import GroupDashboardPage from "./pages/GroupDashboardPage";
import { useAuth } from "./context/AuthContext";

function Layout() {
  const { user } = useAuth();
  return (
    <>
      {user && <Navbar />}
      <main className="main-content">
        <Routes>
          <Route element={<RedirectIfAuthed />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/" element={<LoginPage />} />
          </Route>
          <Route element={<RequireAuthNoProfileCheck />}>
            <Route path="/profile-setup" element={<ProfileSetupPage />} />
          </Route>
          <Route element={<RequireAuth />}>
            <Route path="/groups" element={<GroupsListPage />} />
            <Route path="/groups/new" element={<CreateGroupPage />} />
            <Route path="/groups/:id" element={<GroupDashboardPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
          <Route path="*" element={<LoginPage />} />
        </Routes>
      </main>
    </>
  );
}

function App() {
  return (
    <Layout />
  );
}

export default App;
