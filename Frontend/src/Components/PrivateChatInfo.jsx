import "../Styles.css";
import { useAuth } from "../../Context/authProvider.jsx";

export default function PrivateChatInfo({ chatData }) {
  const { user } = useAuth();
  return (
    <div>
      <h1 style={{ cursor: "pointer" }}>
        {
          chatData.participants?.find((p) => p.user.id !== user.id)?.user
            ?.displayName
        }
      </h1>
      <p>
        {chatData.participants?.find((p) => p.user.id !== user.id)?.user?.phone}
      </p>
      <p style={{ cursor: "pointer" }}>
        {chatData.participants?.find((p) => p.user.id !== user.id)?.user
          ?.description || "No description"}
      </p>
    </div>
  );
}
