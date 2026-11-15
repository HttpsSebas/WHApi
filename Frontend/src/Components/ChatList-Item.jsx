import { Link } from "react-router-dom";
import { useAuth } from "../../Context/authProvider";
import { useEffect } from "react";

export default function ChatItem({ chat }) {
  const { user } = useAuth();
  const participant = chat?.participants.find((p) => p.userId !== user?.id);
  const participantUser = participant?.user;

  const currentParticipant = chat?.participants.find(
    (p) => p.userId === user?.id,
  );
  const currentParticipantUnreadCount = currentParticipant?.unreadCount;

  useEffect(() => {
    console.log(
      "[ChatItem] chat:",
      chat.id,
      "unread:",
      currentParticipantUnreadCount,
    );
  }, [chat]);

  return (
    <>
      <div className="chat-info">
        <Link to={`/chats/${chat?.id}`}>
          {chat?.name || participantUser?.displayName}
        </Link>
        <p>{chat?.lastMessage?.content ?? "No messages yet"}</p>
      </div>
      <div className="unreadMessagesCount">
        {currentParticipantUnreadCount ?? 0}
      </div>
    </>
  );
}
