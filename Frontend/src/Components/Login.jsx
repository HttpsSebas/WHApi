import { useState } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../Context/authProvider.jsx";

export default function Login() {
  const navigate = useNavigate();
  const { updateSession } = useAuth();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function login({ phone, password }) {
    try {
      const response = await fetch(
        "http://localhost:3000/whapi/v1/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ phone, password }),
          credentials: "include",
        },
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Something went wrong");
      }
      updateSession({
        user: data.payload.data.user,
        token: data.payload.data.token,
      });
      navigate("/");
      return data;
    } catch (e) {
      console.error(e);
      setError(e.message);
    }
  }

  return (
    <div>
      <h1>Login</h1>
      <input
        type="text"
        placeholder="Phone"
        onChange={(e) => setPhone(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        onChange={(e) => setPassword(e.target.value)}
      />
      {error && <p>{error}</p>}
      <button onClick={() => login({ phone, password })}>Login</button>
      <Link to="/register">Register</Link>
    </div>
  );
}
