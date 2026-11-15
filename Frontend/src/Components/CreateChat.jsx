import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { ContactsContext } from "../../Context/contactsProvider.jsx";
import { socket } from "../Socket/socket.js";

export default function CreateChat() {
  const { contacts } = useContext(ContactsContext);
  const [userIds, setUserIds] = useState([]);
  const [chatType, setChatType] = useState("private");
  const [chatName, setChatName] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const navigate = useNavigate();

  const handleCreateChat = async () => {
    try {
      setError("");
      setMessage("");
      const chatData = {
        type: chatType.toUpperCase(),
        name: chatName,
        participantIds: Array.from(userIds),
      };
      socket.emit("chat:create", chatData, (response) => {
        if (!response.ok) {
          setError(response.error);
          return;
        }
        setMessage(response.message);
        navigate(`/chats/${response.data.id}`);
      });
      setUserIds([]);
      setChatType("private");
      setChatName("");
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <div>
      <div>
        <div className="modal-content">
          <h2>Create Chat</h2>
          <input
            type="radio"
            name="type"
            value="group"
            checked={chatType === "group"}
            onChange={(e) => {
              setChatType(e.target.value);
            }}
          />{" "}
          Group
          <input
            type="radio"
            name="type"
            value="private"
            checked={chatType === "private"}
            onChange={(e) => {
              setChatType(e.target.value);
            }}
          />{" "}
          Private
          <input
            type="text"
            placeholder="Chat Name"
            disabled={chatType === "private"}
            onChange={(e) => setChatName(e.target.value)}
          />
          <button
            onClick={() => {
              handleCreateChat();
              setChatName("");
              setChatType("private");
              setUserIds([]);
            }}
          >
            Create
          </button>
          {error && <p style={{ color: "red" }}>{error}</p>}
          {message && <p style={{ color: "green" }}>{message}</p>}
          <div id="users-modal">
            <div className="modal-content">
              <ul>
                {contacts?.map((contact) => (
                  <li key={contact.id}>
                    <input
                      type={chatType === "group" ? "checkbox" : "radio"}
                      name="users"
                      value={contact.contactId}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        if (chatType === "private") {
                          setUserIds([value]);
                          return;
                        }
                        // GROUP
                        if (e.target.checked) {
                          setUserIds((prev) =>
                            prev.includes(value) ? prev : [...prev, value],
                          );
                        } else {
                          setUserIds((prev) =>
                            prev.filter((id) => id !== value),
                          );
                        }
                      }}
                    />
                    {contact.alias || contact.phone}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
