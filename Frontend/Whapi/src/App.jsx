import ChatList from "./Components/ChatList";
import ContactList from "./Components/ContactList";
import CreateChat from "./Components/CreateChat";
import Chat from "./Components/Chat";
import ChatInfo from "./Components/ChatInfo.jsx";
import Login from "./Components/Login";
import Register from "./Components/Register";
import AppLayout from "./Components/AppLayout";
import CreateContact from "./Components/CreateContact.jsx";
import ContactsProvider from "../Context/contactsProvider.jsx";
import UserInfo from "./Components/UserInfo.jsx";
import { Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { socket } from "./Socket/socket.js";
import { useAuth } from "../Context/authProvider.jsx";

function App() {
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    const sync = () => {
      socket.emit("message:sync");
    };

    function onConnectError(err) {
      console.error("[socket] connect_error:", err);
    }

    socket.on("connect", sync);
    socket.on("connect_error", onConnectError);

    if (socket.connected) {
      sync();
    }

    if (!socket) {
      console.warn("[App] socket not initialized yet");
      setLoading(false);
    }

    setLoading(false);

    return () => {
      socket.off("connect", sync);
      socket.off("connect_error", onConnectError);
    };
  }, [token, user]);

  if (loading) return <div>Loading...</div>;

  return (
    <ContactsProvider>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
        <Route
          path="/profile"
          element={user ? <UserInfo /> : <Navigate to="/login" />}
        />
        <Route
          path="/register"
          element={user ? <Navigate to="/" /> : <Register />}
        />
        <Route
          path="/chats/create"
          element={user ? <CreateChat /> : <Navigate to="/login" />}
        />
        <Route
          path="/chats/:chatId"
          element={user ? <Chat /> : <Navigate to="/login" />}
        />
        <Route
          path="/chats/:chatId/info"
          element={user ? <ChatInfo /> : <Navigate to="/login" />}
        />
        <Route
          path="/contacts"
          element={user ? <ContactList /> : <Navigate to="/login" />}
        />
        <Route
          path="/users/:userId"
          element={user ? <UserInfo /> : <Navigate to="/login" />}
        />
        <Route
          path="/contacts/create"
          element={user ? <CreateContact /> : <Navigate to="/login" />}
        />

        <Route element={user ? <AppLayout /> : <Navigate to="/login" />}>
          <Route
            path="/"
            element={user ? <ChatList /> : <Navigate to="/login" />}
          />
        </Route>
      </Routes>
    </ContactsProvider>
  );
}

export default App;
