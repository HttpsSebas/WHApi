import { createContext, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import fetchWrapper from "../Whapi/Wrapper/fetchWrapper.js";
import { socket } from "../src/Socket/socket.js";
import { useAuth } from "./authProvider.jsx";

export const ContactsContext = createContext([]);

export default function ContactsProvider({ children }) {
  const navigate = useNavigate();
  const { updateSession, logout, token } = useAuth();
  const [contacts, setContacts] = useState([]);

  const handleContactCreated = (payload) => {
    setContacts((prevContacts) => {
      const exists = prevContacts.some((c) => c.contactId === payload.data.id);
      if (exists) {
        return prevContacts;
      }
      return [...prevContacts, payload.data];
    });
  };

  const updateContact = useCallback((id, callback) => {
    setContacts((prevContacts) =>
      prevContacts.map((contact) => {
        if (Number(contact.id) === Number(id)) {
          return contact;
        }
        return callback(contact);
      }),
    );
  }, []);

  const handleContactDelete = (payload) => {
    setContacts((prevContacts) =>
      prevContacts.filter((contact) => contact.id !== payload.data.id),
    );
  };

  const handleUserBlocked = (id) => {
    updateContact(id, (contact) => ({
      ...contact,
      contactUser: {
        ...contact.contactUser,
        blockedBy: contact.contactUser.blockedBy.filter(
          (block) => block.userId !== id,
        ),
      },
    }));
  };

  const handleUserUnblocked = (id) => {
    updateContact(id, (contact) => ({
      ...contact,
      contactUser: {
        ...contact.contactUser,
        blockedBy: [...contact.contactUser.blockedBy, { userId: id }],
      },
    }));
  };

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const res = await fetchWrapper({
          token,
          url: "http://localhost:3000/whapi/v1/contacts",
          options: {
            method: "GET",
          },
          onSessionExpired: logout,
          updateSession,
        });
        const data = await res.json();
        setContacts(data.data || []);
      } catch (e) {
        if (e.message === "SESSION_EXPIRED") {
          navigate("/login", { replace: true });
        }
      }
    };
    fetchContacts();

    socket.on("contact:created", handleContactCreated);
    socket.on("contact:deleted", handleContactDelete);

    socket.on("user:blocked", handleUserBlocked);
    socket.on("user:unblocked", handleUserUnblocked);

    return () => {
      socket.off("contact:created", handleContactCreated);
      socket.off("contact:deleted", handleContactDelete);

      socket.off("user:blocked", handleUserBlocked);
      socket.off("user:unblocked", handleUserUnblocked);
    };
  }, [token]);
  return (
    <ContactsContext.Provider
      value={{
        contacts,
        updateContact,
      }}
    >
      {children}
    </ContactsContext.Provider>
  );
}
