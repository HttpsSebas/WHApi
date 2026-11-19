import fetchWrapper from "../../Wrapper/fetchWrapper.js";
import "../Styles.css";
import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../../Context/authProvider.jsx";
import PrivateChatInfo from "./PrivateChatInfo.jsx";
import GroupChatInfo from "./GroupChatInfo.jsx";

export default function ChatInfo() {
  const { updateSession, logout, token } = useAuth();
  const { chatId } = useParams();
  const [chatData, setChatData] = useState({});



  useEffect(() => {
    const fetchChatData = async () => {
      const res = await fetchWrapper({
        token,
        url: `http://localhost:3000/whapi/v1/chats/${chatId}`,
        options: {
          method: "GET",
        },
        onSessionExpired: logout,
        updateSession,
      });
      const data = await res.json();
      setChatData(data.data);
    };
    fetchChatData();
  }, [chatId, logout]);

  return (
    <div>
      {
        chatData.type === "PRIVATE" ? 
        <PrivateChatInfo chatData={chatData} /> :
        <GroupChatInfo chatData={chatData} setChatData={setChatData} />
      }
    </div>
  );
}
