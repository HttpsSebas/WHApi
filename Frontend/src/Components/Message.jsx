import { useAuth } from "../../Context/authProvider";
import "../Styles.css";
import { socket } from "../Socket/socket";
import { useContext, useEffect } from "react";
import { ContactsContext } from "../../Context/contactsProvider";

export default function Message({ message, chatId }) {
  const { user } = useAuth();
  const { contacts } = useContext(ContactsContext);
  const contact =
    contacts.find((c) => Number(c.contactId) === Number(message.senderId))

  const alias = contact?.alias ?? message.sender?.name ?? ""

  const messageDate = new Date(message.createdAt)
    .toLocaleString()
    .split(",")[1];

  const deleteMessage = async () => {
    socket.emit("message:delete", {
      chatId: Number(chatId),
      messageId: message.id,
    });
  };

  return (
    <div
      className={
        message.senderId === user.id
          ? "message message-right"
          : "message message-left"
      }
    >
      <div className="message-header">
        <p className="message-sender">
          {message.senderId === user.id ? "You" : alias.split(/\s+/)[0]}
        </p>
      </div>
      <p className="message-content">{message.content}</p>
      <div className="message-meta">
        <span>{messageDate}</span>
        {message.senderId === user.id && (
          <span className="message-status">{message.globalStatus}</span>
        )}
      </div>
      {message.senderId === user.id && (
        <button className="message-delete" onClick={deleteMessage}>
          🗑️
        </button>
      )}
    </div>
  );
}
