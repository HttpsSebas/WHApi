import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../Context/authProvider.jsx";

export default function Register() {
  const { updateSession } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  return (
    <div>
      <h1>Register</h1>
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
      <input
        type="text"
        placeholder="Name"
        onChange={(e) => setName(e.target.value)}
      />
      <input
        type="text"
        placeholder="Description"
        onChange={(e) => setDescription(e.target.value)}
      />
      {error && <p>{error}</p>}
      <button onClick={() => register({ phone, password, name, description })}>
        Register
      </button>
    </div>
  );
  async function register({ phone, password, name, description }) {
    try {
      const response = await fetch(
        "http://localhost:3000/whapi/v1/auth/register",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ phone, password, name, description }),
          credentials: "include",
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Something went wrong");
      updateSession({
        user: data.payload.data.user,
        token: data.payload.data.token,
      })
      navigate("/");
      return data;
    } catch (e) {
      setError(e.message);
    }
  }
}
