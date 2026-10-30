import { useNavigate } from "react-router-dom";
import { clearToken } from "../lib/api";

export default function Dashboard() {
  const navigate = useNavigate();

  function logout() {
    clearToken();
    navigate("/login");
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>Dashboard</h2>
      <p>You are logged in.</p>
      <button onClick={logout}>Log out</button>
    </div>
  );
}