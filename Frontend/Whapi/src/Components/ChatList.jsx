import "../index.css";
import "../Styles.css";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "../Socket/socket";
import { useAuth } from "../../Context/authProvider.jsx";
import fetchWrapper from "../../Wrapper/fetchWrapper";
import ChatItem from "./ChatList-Item.jsx";
import chatSchema from "../../Schema/chat.js";

export default function ChatList() {
  const [chats, setChats] = useState([]);
  const navigate = useNavigate();
  const { updateSession, logout, token, user } = useAuth();

  async function getChats() {
    const response = await fetchWrapper({
      token,
      url: `http://localhost:3000/whapi/v1/chats`,
      options: {
        method: "GET",
      },
      onSessionExpired: logout,
      updateSession,
    });
    const data = await response.json();
    return data;
  }

  async function getChatById(chatId) {
    const response = await fetchWrapper({
      token,
      url: `http://localhost:3000/whapi/v1/chats/${chatId}`,
      options: { method: "GET" },
      onSessionExpired: logout,
      updateSession,
    });

    const data = await response.json();
    return data.data;
  }

  useEffect(() => {
    const fetchChats = async () => {
      try {
        const data = await getChats();
        const normalizedChats = data.data.map((c) => {
          try {
            const parsed = chatSchema.parse(c);
            return parsed;
          } catch (e) {
            return null;
          }
        });
        setChats(normalizedChats.filter((c) => c !== null));
      } catch (e) {
        return;
      }
    };
    fetchChats();

    const handleChatCreate = (ch) => {
      const normalizedChat = chatSchema.parse(ch);
      setChats((prevChats) => {
        const chatExists = prevChats.some(
          (chat) => chat.id === normalizedChat.id,
        );
        if (!chatExists) {
          return [...prevChats, normalizedChat];
        }
        return prevChats;
      });
    };
    const handleChatUpdate = (updatedChatData) => {
      const normalizedChat = chatSchema.parse(updatedChatData);

      setChats((prev) =>
        prev.map((chat) =>
          chat.id === normalizedChat.id
            ? {
                ...chat,
                ...normalizedChat,
              }
            : chat,
        ),
      );
    };

    const handleChatGroupAdded = async (data) => {
      const { chatId } = data;

      setChats((prev) => {
        const exists = prev.some((chat) => Number(chat.id) === Number(chatId));

        if (exists) {
          // User already had the chat: update it with
          // the new data
          getChatById(chatId)
            .then((chat) => {
              const normalized = chatSchema.parse(chat);

              setChats((current) =>
                current.map((c) =>
                  Number(c.id) === Number(chatId) ? normalized : c,
                ),
              );
            })
            .catch(console.error);

          return prev;
        }

        // User didn't have the chat: create it
        getChatById(chatId)
          .then((chat) => {
            console.log("[chat:group:added] chat:", chat);
            const normalized = chatSchema.parse(chat);

            setChats((current) =>
              current.some((c) => Number(c.id) === Number(chatId))
                ? current
                : [...current, normalized],
            );
          })
          .catch((e) => {
            console.error("[chat:group:added] fetch/parse error:", e);

            if (e?.issues) {
              console.error(
                "[chat:group:added] zod issues:",
                e.issues.map((issue) => ({
                  path: issue.path.join("."),
                  message: issue.message,
                  received: issue.received,
                })),
              );
            }
          });

        return prev;
      });
    };

    const handleGroupKick = (ch) => {
      setChats((prevChats) => {
        return prevChats.filter((chat) => chat.id !== ch.chatId);
      });
    };

    const handleMessageSync = (messages) => {
      if (!messages) return;
      setChats((prevChats) =>
        prevChats.map((chat) => {
          const msg = messages.find((message) => message.chatId === chat.id);

          if (!msg) return chat;

          return {
            ...chat,
            lastMessage: msg,
          };
        }),
      );
    };

    const handleNewMessage = (data) => {
      const { msg, unreadCounts } = data;

      if (!msg) return;

      const chatId = Number(msg.chatId);

      const currentUserUnreadCount =
        unreadCounts?.find((item) => Number(item.userId) === Number(user.id))
          ?.unreadCount ?? 0;

      setChats((prevChats) => {
        return prevChats.map((chat) => {
          if (Number(chat.id) !== chatId) return chat;
          return {
            ...chat,
            lastMessage: msg,
            participants: chat.participants.map((participant) => {
              return {
                ...participant,
                unreadCount:
                  Number(participant.userId) === Number(user.id)
                    ? currentUserUnreadCount
                    : participant.unreadCount,
              };
            }),
          };
        });
      });
    };

    const handleMessageDelete = (data) => {
      const { chatId, lastMessage, unreadCounts } = data;

      console.log("[message:deleted] chatId:", chatId);
      console.log("[message:deleted] unreadCounts:", unreadCounts);

      setChats((prevChats) =>
        prevChats.map((chat) => {
          if (Number(chat.id) !== Number(chatId)) return chat;

          console.log(
            "[message:deleted] participants before:",
            chat.participants.map((p) => ({
              userId: p.userId,
              unreadCount: p.unreadCount,
            })),
          );

          return {
            ...chat,
            lastMessage: lastMessage ?? null,
            lastMessageId: lastMessage?.id ?? null,
            participants: chat.participants.map((p) => {
              const updated = unreadCounts?.find(
                (item) => Number(item.userId) === Number(p.userId),
              );

              console.log("[message:deleted] match:", {
                participantUserId: p.userId,
                matched: updated,
                oldCount: p.unreadCount,
                newCount: updated?.unreadCount,
              });

              return {
                ...p,
                unreadCount: updated
                  ? Number(updated.unreadCount)
                  : p.unreadCount,
              };
            }),
          };
        }),
      );
    };

    socket.on("chat:created", handleChatCreate);
    socket.on("chat:group:added", handleChatGroupAdded);
    socket.on("chat:group:kicked", handleGroupKick);
    socket.on("chat:updated", handleChatUpdate);
    socket.on("message:sync", handleMessageSync);
    socket.on("message:new", handleNewMessage);
    socket.on("message:deleted", handleMessageDelete);

    return () => {
      socket.off("chat:created", handleChatCreate);
      socket.off("chat:updated", handleChatUpdate);
      socket.off("message:sync", handleMessageSync);
      socket.off("message:new", handleNewMessage);
      socket.off("message:deleted", handleMessageDelete);
      socket.off("chat:group:added", handleChatGroupAdded);
      socket.off("chat:group:kicked", handleGroupKick);
    };
  }, []);

  return (
    <div>
      <div className="chat-list-header">
        <h1>Whapi</h1>
        <button onClick={() => navigate("/chats/create")}>Create Chat</button>
        <button onClick={() => navigate("/profile")}>Me</button>
      </div>
      <ul className="chat-list">
        {chats.map((chat) => (
          <li key={chat.id} className="chat-list-item">
            <ChatItem chat={chat} />
          </li>
        ))}
      </ul>
    </div>
  );
}
