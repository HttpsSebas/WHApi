import "../Styles.css";
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../../Context/authProvider.jsx";
import { AddMembers } from "./AddMembers.jsx";
import { socket } from "../Socket/socket.js";

export default function GroupChatInfo({ chatData, setChatData }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { chatId } = useParams();
  const [descriptionModal, setDescriptionModal] = useState(false);
  const [titleModal, setTitleModal] = useState(false);
  const [optionsModal, setOptionsModal] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [currentParticipant, setCurrentParticipant] = useState(null);
  const [description, setDescription] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [error, setError] = useState("");

  const handleChangeDescription = (e) => {
    setDescription(e.target.value);
  };

  const handleChangeTitle = (e) => {
    setNewTitle(e.target.value);
  };

  const handleSaveDescription = async () => {
    socket.emit(
      "chat:group:edit",
      {
        chatId: Number(chatId),
        chat: { description },
      },
      (res) => {
        if (!res.ok) {
          setError(res.error);
          console.error("Error saving description:", res.error);
          return;
        }
        setError("");
        setDescriptionModal(false);
        setChatData((prev) => ({
          ...prev,
          description,
        }));
      },
    );
  };

  const handleSaveTitle = async () => {
    socket.emit(
      "chat:group:edit",
      {
        chatId: Number(chatId),
        chat: { name: newTitle },
      },
      (res) => {
        if (!res.ok) {
          setError(res.error);
          console.error("Error saving title:", res.error);
          return;
        }
        setError("");
        setTitleModal(false);
        setChatData((prev) => ({
          ...prev,
          name: newTitle,
        }));
      },
    );
  };

  const handleAddMembers = (userIds) => {
    if (userIds.length === 0) return;
    socket.emit(
      "chat:group:add",
      { userIds, chatId: Number(chatId) },
      (response) => {
        if (!response.ok) {
          setError(response.error);
          return;
        }
        setError("");
        setShowAddMembers(false);
      },
    );
  };

  const handleRemoveUser = async (userId) => {
    socket.emit(
      "chat:group:kick",
      { chatId: Number(chatId), userId },
      (res) => {
        if (!res.ok) {
          setError(res.error);
          return;
        }
        setChatData((prev) => ({
          ...prev,
          participants: prev.participants.filter((p) => p.user.id !== userId),
        }));
        setError("");
        setCurrentParticipant(null);
        setOptionsModal(false);
      },
    );
  };

  const promoteMember = async (participant) => {
    socket.emit(
      "chat:group:admin",
      { chatId: Number(chatId), userId: participant.user.id },
      (res) => {
        if (!res.ok) {
          setError(res.error);
          console.error("Error promoting member:", res.error);
          return;
        }

        setChatData((prev) => ({
          ...prev,
          participants: prev.participants.map((p) =>
            p.user.id === participant.user.id ? { ...p, role: "ADMIN" } : p,
          ),
        }));
        setError("");
        setCurrentParticipant(null);
      },
    );
  };

  const demoteMember = async (participant) => {
    socket.emit(
      "chat:group:demote",
      { chatId: Number(chatId), userId: participant.user.id },
      (res) => {
        if (!res.ok) {
          setError(res.error);
          console.error("Error demoting member:", res.error);
          return;
        }
        setChatData((prev) => ({
          ...prev,
          participants: prev.participants.map((p) =>
            p.user.id === participant.user.id ? { ...p, role: "MEMBER" } : p,
          ),
        }));
        setError("");

        setCurrentParticipant(null);
      },
    );
  };

  const leaveGroup = async () => {
    socket.emit("chat:group:leave", { chatId: Number(chatId) }, (res) => {
      if (!res.ok) {
        setError(res.error);
        console.error("Error leaving group:", res.error);
        return;
      }

      setChatData((prev) => ({
        ...prev,
        participants: prev.participants.filter((p) => p.user.id !== user.id),
      }));
      setError("");
      navigate("/");
    });
  };

  return (
    <div>
      <h1 style={{ cursor: "pointer" }} onClick={setTitleModal}>
        {chatData?.name}
      </h1>
      {titleModal && (
        <div className="description-modal">
          <input
            type="text"
            value={newTitle}
            placeholder="Title"
            onChange={handleChangeTitle}
          />
          <button onClick={handleSaveTitle}>Save</button>
        </div>
      )}
      <div
        className="chat-info-description"
        onClick={() => setDescriptionModal(true)}
      >
        <p style={{ cursor: "pointer" }}>
          {chatData?.description || "No description"}
        </p>
        {descriptionModal && (
          <div className="description-modal">
            <input
              type="text"
              value={description}
              placeholder="Description"
              onChange={handleChangeDescription}
            />
            <button onClick={handleSaveDescription}>Save</button>
          </div>
        )}
      </div>

      <ul>
        {chatData?.participants &&
          chatData?.participants?.map((participant) => (
            <li
              key={participant.user.id}
              onClick={() => {
                participant.user.id !== user.id && setOptionsModal(true);
                setCurrentParticipant(participant);
              }}
              style={{ cursor: "pointer" }}
            >
              {participant.user.id === user.id
                ? "You"
                : participant.user.displayName.split(" ")[0]}
              {chatData?.type === "GROUP" &&
                participant.role === "ADMIN" &&
                " (Admin)"}
              {" - " + participant.user.phone}
            </li>
          ))}
      </ul>
      {optionsModal && (
        <div className="options-modal">
          <button
            className="options-modal-btn"
            onClick={() => {
              currentParticipant && currentParticipant.role === "MEMBER"
                ? promoteMember(currentParticipant)
                : demoteMember(currentParticipant);
              setOptionsModal(false);
            }}
          >
            {currentParticipant && currentParticipant.role === "MEMBER"
              ? "Promote"
              : "Demote"}
          </button>
          <button
            className="options-modal-btn"
            onClick={() => {
              handleRemoveUser(currentParticipant.user.id);
            }}
          >
            Remove
          </button>
          <button
            className="options-modal-btn"
            onClick={() => setOptionsModal(false)}
          >
            Close
          </button>
        </div>
      )}
      {error && <p style={{ color: "red" }}>{error}</p>}

      <div className="add-member">
        <button
          onClick={() => {
            setError("");
            setShowAddMembers(true);
          }}
        >
          Add Member
        </button>
      </div>
      <div className="leave-group">
        <button onClick={leaveGroup}>Leave</button>
      </div>
      {showAddMembers && (
        <AddMembers
          participantIds={chatData?.participants?.map((p) => p.user.id)}
          chatId={Number(chatId)}
          handleAddMembers={handleAddMembers}
          onClose={() => setShowAddMembers(false)}
        />
      )}
    </div>
  );
}
