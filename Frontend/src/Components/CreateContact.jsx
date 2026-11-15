import fetchWrapper from "../../Whapi/Wrapper/fetchWrapper";
import { useEffect, useState } from "react";
import { socket } from "../Socket/socket";

export default function CreateContact() {
  const [phone, setPhone] = useState("");
  const [alias, setAlias] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    socket.on("contact:error", (data) => {
      setError(data.message);
      if (data.message === "SESSION_EXPIRED") {
        navigate("/login", { replace: true });
      }
    });
  });

  return (
    <div>
      <h1>Create Contact</h1>
      <input
        type="text"
        placeholder="Phone"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />
      <input
        type="text"
        placeholder="Alias"
        value={alias}
        onChange={(e) => setAlias(e.target.value)}
      />
      <button
        onClick={async () => {
          setError("");
          socket.emit("contact:create", { contact: { phone, alias } });
        }}
      >
        Create
      </button>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}
