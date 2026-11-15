import { formatDateToString } from "../../Services/formatDate";
import { AuthContext } from "../../Context/authProvider";
import { useContext } from "react";
import "../Styles.css";

export default function ChatTitle({ chatData, presenceData }) {
  const { user } = useContext(AuthContext);

  const otherUser = chatData?.participants?.find(
    (p) => p.user.id !== user.id,
  )?.user;

  const lastSeen = formatDateToString(presenceData?.[otherUser?.id]?.lastSeenAt);

  const isOnline = presenceData?.[otherUser?.id]?.isOnline;

  return (
    <div className="chat-title">
      <h1 className="chat-name">{chatData?.name || otherUser?.displayName}</h1>

      {chatData?.type === "PRIVATE" ? (
        <>
          <p className="user-phone">{otherUser?.phone || ""}</p>

          <p
            className={`user-state ${
              isOnline ? "user-state-online" : "user-state-offline"
            }`}
          >
            {isOnline ? "Online" : `${lastSeen}`}
          </p>
        </>
      ) : (
        <p className="chat-participants">
          {chatData?.participants
            ?.map((p) => {
              if (p.user.id === user.id) {
                return "You";
              }
              return p.user.displayName;
            })
            .join(", ")}
        </p>
      )}
    </div>
  );
}
