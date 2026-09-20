import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import AuthPage from "./pages/AuthPage";
import EditProfilePage from "./pages/EditProfilePage";
import OAuthCompletePage from "./pages/OAuthCompletePage";
import AppLayout from "./components/AppLayout";
import ChatPage from "./pages/Chat/ChatPage";
import VisualizerPage from "./pages/Visualizer/VisualizerPage";

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("authUser")) || null;
  } catch {
    return null;
  }
}

function ProtectedRoute({ children }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("authToken")) {
      setReady(true);
      return;
    }

    async function verify() {
      try {
        const api = (await import("./api/api")).default;
        await api.get("/auth/me");
      } catch {
        localStorage.removeItem("authToken");
        localStorage.removeItem("authUser");
      } finally {
        setReady(true);
      }
    }

    verify();
  }, []);

  if (!ready) return null;

  if (!localStorage.getItem("authToken")) {
    return <Navigate to="/auth" replace />;
  }

  return children;
}

function App() {
  const [user, setUser] = useState(getStoredUser);

  useEffect(() => {
    const token = localStorage.getItem("authToken");

    if (!token) {
      setUser(null);
      return;
    }

    async function loadUser() {
      try {
        const api = (await import("./api/api")).default;
        const response = await api.get("/auth/me");
        setUser(response.data.user);
        localStorage.setItem("authUser", JSON.stringify(response.data.user));
      } catch {
        localStorage.removeItem("authToken");
        localStorage.removeItem("authUser");
        setUser(null);
      }
    }

    loadUser();
  }, []);

  function handleLogout() {
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
    setUser(null);
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/edit-profile" element={<ProtectedRoute><EditProfilePage /></ProtectedRoute>} />
        <Route path="/oauth-complete" element={<OAuthCompletePage />} />
        <Route path="/chat" element={<ProtectedRoute><AppLayout user={user} onLogout={handleLogout}><ChatPage /></AppLayout></ProtectedRoute>} />
        <Route path="/visualizer" element={<ProtectedRoute><AppLayout user={user} onLogout={handleLogout}><VisualizerPage /></AppLayout></ProtectedRoute>} />
        <Route path="/" element={<Navigate to="/chat" replace />} />
        <Route path="*" element={<Navigate to="/chat" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
