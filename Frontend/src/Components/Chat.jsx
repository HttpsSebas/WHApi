import { useEffect, useState, useRef, useLayoutEffect } from "react";
import { useParams } from "react-router-dom";
import Message from "./Message.jsx";
import UnreadMessagesCount from "./UnreadMessagesCount.jsx";
import ChatTitle from "./ChatTitle.jsx";
import { Link } from "react-router-dom";
import { socket } from "../Socket/socket.js";
import fetchWrapper from "../../Whapi/Wrapper/fetchWrapper.js";
import { useAuth } from "../../Context/authProvider.jsx";

export default function Chat() {
  const { chatId } = useParams();
  const [chatData, setChatData] = useState({});
  const [presences, setPresences] = useState({});
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const { updateSession, logout, token, user } = useAuth();
  const lastMessageRef = useRef(null);
  const [isMember, setIsMember] = useState(true);
  const [block, setBlock] = useState(false);

  const handleMessageSend = () => {
    socket.emit("message:new", { message, chat: chatData }, (response) => {
      if (!response.ok) {
        return;
      }
      setMessages((prev) => [...prev, response.data.msg]);
    });
    setMessage("");
  };

  useEffect(() => {
    async function messageLoader({ params }) {
      const res = await fetchWrapper({
        token,
        url: `http://localhost:3000/whapi/v1/messages/${params.id}`,
        options: {
          method: "GET",
        },
        onSessionExpired: logout,
        updateSession,
      });
      const data = await res.json();
      return data;
    }

    async function chatDataLoader({ params }) {
      const res = await fetchWrapper({
        token,
        url: `http://localhost:3000/whapi/v1/chats/${params.id}`,
        options: {
          method: "GET",
        },
        onSessionExpired: logout,
        updateSession,
      });

      const data = await res.json();
      return data;
    }

    const handleUserOffline = ({ userId, lastSeenAt }) => {
      setPresences((prev) => ({
        ...prev,
        [userId]: {
          isOnline: false,
          lastSeenAt,
        },
      }));
    };

    const handleUserOnline = ({ userId }) => {
      setPresences((prev) => {
        const newPresences = {
          ...prev,
          [userId]: {
            isOnline: true,
            lastSeenAt: null,
          },
        };
        return newPresences;
      });
    };

    const handleNewMessage = (data) => {
      console.log("[handleNewMessage]");
      if (Number(data.msg.chatId) === Number(chatId)) {
        if (data.msg.senderId === user.id) {
          return;
        }
        setMessages((prevMessages) => {
          if (prevMessages.some((m) => m.id === data.msg.id))
            return prevMessages;
          return [...prevMessages, data.msg];
        });
      }
    };

    const handleMessageRead = (data) => {
      if (Number(data.chatId) !== Number(chatId)) return;
      console.log(data);
      const fromMessageId = Number(data.previousReadMessageId ?? 0);
      const untilMessageId = Number(data.messageId);
      const currentUserId = Number(user?.id);
      setMessages((prev) =>
        prev.map((msg) => {
          const msgId = Number(msg.id);
          const senderId = Number(msg.senderId);

          const isTarget = msgId === untilMessageId;
          const isInRange = msgId > fromMessageId && msgId <= untilMessageId;
          if (senderId === currentUserId && (isTarget || isInRange)) {
            console.log("[handleMessageRead] updating message:", {
              id: msgId,
              from: msg.globalStatus,
              to: data.globalStatus,
            });
            return { ...msg, globalStatus: data.globalStatus };
          }
          return msg;
        }),
      );
    };

    const handleMessageDelete = (data) => {
      setMessages((prev) => {
        if (Number(data.chatId) !== Number(chatId)) return prev;
        return prev.filter((msg) => msg.id !== data.messageId);
      });
    };

    const handleMessageSync = (msgs) => {
      console.log("[handleMessageSync]");
      if (!msgs?.length) return;
      setMessages((prev) => {
        // Save all messages
        const updated = [...prev];

        // List by ID every message
        const indexById = new Map(updated.map((m, i) => [m.id, i]));

        for (const msg of msgs) {
          if (Number(msg.chatId) !== Number(chatId)) continue;

          // Get msg ID
          const index = indexById.get(msg.id);

          // If exists, update message
          if (index !== undefined) {
            updated[index] = {
              ...updated[index],
              ...msg,
            };
          } else {
            // Or add new message
            updated.push(msg);
            indexById.set(msg.id, updated.length - 1);
          }
        }
        return updated;
      });
    };

    const handleUserBlocked = () => {
      setBlock(true);
    };

    const handleUserUnblocked = () => {
      setBlock(false);
    };

    const handleGroupKicked = (data) => {
      if (Number(data.chatId) === Number(chatId) && data.userId === user.id) {
        setIsMember(false);
      }
    };

    const handleUserLeftGroup = (data) => {
      if (Number(data.chatId) === Number(chatId)) {
        setChatData((prev) => {
          return {
            ...prev,
            participants: [
              ...prev.participants.filter((p) => p.user.id !== data.userId),
            ],
          };
        });
      }
    };

    socket.on("message:new", handleNewMessage);
    socket.on("message:read", handleMessageRead);
    socket.on("message:deleted", handleMessageDelete);
    socket.on("message:sync", handleMessageSync);
    socket.on("user:blocked", handleUserBlocked);
    socket.on("user:unblocked", handleUserUnblocked);
    socket.on("chat:group:kicked", handleGroupKicked);
    socket.on("chat:group:leaved", handleUserLeftGroup);

    socket.on("user:offline", handleUserOffline);
    socket.on("user:online", handleUserOnline);

    const fetchChat = async () => {
      const messageData = await messageLoader({ params: { id: chatId } });
      const chatDataFetched = await chatDataLoader({
        params: { id: chatId },
      });

      const blocked = chatDataFetched?.data?.blocked ?? false;

      setBlock(blocked);
      setChatData(chatDataFetched?.data || {});
      setMessages(messageData?.data || []);
      setPresences(chatDataFetched?.data?.presences || {});
      const participants = chatDataFetched?.data?.participants ?? [];

      setIsMember(
        participants.some(
          (participant) => Number(participant.userId) === Number(user?.id),
        ),
      );
      const messagesArray = messageData?.data || [];
      if (messagesArray.length > 0) {
        const lastMessage = messagesArray[messagesArray.length - 1];

        socket.emit("message:readUntil", {
          chatId,
          messageId: lastMessage.id,
          senderId: lastMessage.senderId, // Usar la propiedad directamente del mensaje
          readerId: user?.id,
        });
      }
    };

    fetchChat();

    return () => {
      socket.off("message:new", handleNewMessage);
      socket.off("message:read", handleMessageRead);
      socket.off("message:deleted", handleMessageDelete);
      socket.off("message:sync", handleMessageSync);
      socket.off("chat:group:kicked", handleGroupKicked);
      socket.off("chat:group:leaved", handleUserLeftGroup);
      socket.off("user:blocked", handleUserBlocked);
      socket.off("user:unblocked", handleUserUnblocked);
      socket.off("user:offline", handleUserOffline);
      socket.off("user:online", handleUserOnline);
    };
  }, [chatId]);

  useLayoutEffect(() => {
    if (lastMessageRef.current) {
      lastMessageRef.current.scrollIntoView({ behavior: "instant" });
    }
  }, [messages.length]);

  const isBlocked = chatData?.type === "PRIVATE" && block === true;

  return (
    <div className="chat">
      <div className="chat-title-container">
        <Link to={`/chats/${chatData.id}/info`}>
          <ChatTitle chatData={chatData} presenceData={presences} />
        </Link>
      </div>
      <ul className="messages">
        {messages.length > 0 &&
          messages.map((message, index) => {
            const participant = chatData?.participants?.find(
              (p) => p.userId === user.id,
            );

            const lastReadMessageId = participant?.lastReadMessageId ?? null;

            const unreadCount = participant?.unreadCount ?? 0;

            const isLastReadMessage = message.id === lastReadMessageId;

            const isCurrentUser = message.senderId === user.id;

            const shouldShowUnreadDivider =
              lastReadMessageId !== null && isLastReadMessage && !isCurrentUser;

            return (
              <li
                key={message.id}
                ref={index === messages.length - 1 ? lastMessageRef : null}
              >
                <Message message={message} chatId={chatId} />
                {shouldShowUnreadDivider && (
                  <UnreadMessagesCount count={unreadCount} />
                )}
              </li>
            );
          })}
      </ul>

      {isBlocked ? (
        <div className="message-input">
          <p>Blocked</p>
        </div>
      ) : !isMember ? (
        <div className="message-input">
          <p>You were eliminated from this group</p>
        </div>
      ) : (
        <div className="message-input">
          <input
            type="text"
            placeholder="Message"
            onChange={(e) => setMessage(e.target.value)}
            value={message}
          />
          <button onClick={handleMessageSend} disabled={!message}>
            Send
          </button>
        </div>
      )}
    </div>
  );
}
