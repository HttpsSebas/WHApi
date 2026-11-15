import { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import fetchWrapper, { setCurrentToken } from "../Wrapper/fetchWrapper";
import { socket, initSocket, reconnectSocket } from "../src/Socket/socket";

export const AuthContext = createContext({});

export function AuthContextProvider({ children }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [socketInialized, setSocketInitialized] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedToken = localStorage.getItem("token");

    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    if (storedToken) {
      setToken(storedToken);
      setCurrentToken(storedToken);
    }
  }, []);

  useEffect(() => {
    if (!token) return;

    if (!socketInialized) {
      initSocket(token);
      setSocketInitialized(true);
    } else {
      reconnectSocket(token);
    }
  }, [token]);

  const updateSession = ({ user, token }) => {
    setUser(user);
    setToken(token);
    setCurrentToken(token);
    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("token", token);
  };

  const logout = async () => {
    const res = await fetchWrapper({
      updateSession,
      onSessionExpired: () => {},
      token,
      url: "http://localhost:3000/whapi/v1/auth/logout",
      options: {
        method: "POST",
      },
    });
    if (!res.ok) {
      console.error("Error logging out:", res.error);
      return;
    }
    socket.disconnect();
    setUser(null);
    setToken(null);
    setCurrentToken(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <AuthContext.Provider value={{ user, token, logout, updateSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
