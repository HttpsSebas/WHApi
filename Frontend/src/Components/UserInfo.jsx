import { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { socket } from "../Socket/socket";
import { ContactsContext } from "../../Context/contactsProvider";
import { useAuth } from "../../Context/authProvider";
import fetchWrapper from "../../Wrapper/fetchWrapper";

export default function UserInfo() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const { user, token, updateSession, logout } = useAuth();
  const { contacts, updateContact } = useContext(ContactsContext);
  const [target, setTarget] = useState(null);
  const [edit, setEdit] = useState(false);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const isMyProfile = !userId || Number(userId) === Number(user.id);

  const contact = contacts.find((c) => Number(c.contactId) === Number(userId));

  const isContact = Boolean(contact) && !isMyProfile;

  useEffect(() => {
    const loadUser = async () => {
      setLoading(true);
      setError("");

      try {
        if (isMyProfile) {
          const response = await fetchWrapper({
            token,
            url: `http://localhost:3000/whapi/v1/users/me`,
            options: {
              method: "GET",
            },
            onSessionExpired: logout,
            updateSession,
          });
          if (!response.ok) {
            setError(response.error);
            setLoading(false);
            return;
          }
          const data = await response.json();
          setTarget(data);
          setLoading(false);
          return;
        }
        if (contact) {
          console.log("[user:info] contact:", contact);
          setTarget(contact);
          setLoading(false);
          return;
        }
        const response = await fetchWrapper({
          token,
          url: `http://localhost:3000/whapi/v1/users/${Number(userId)}`,
          options: {
            method: "GET",
          },
          onSessionExpired: logout,
          updateSession,
        });
        if (!response.ok) {
          setError(response.error);
          setLoading(false);
          return;
        }
        const data = await response.json();
        setTarget(data);
        setLoading(false);
      } catch (e) {
        setError(e.message);
        setLoading(false);
      }
    };

    loadUser();
  }, [userId, contact, token, isMyProfile]);

  const isBlocked =
    !isMyProfile &&
    (target?.contactUser?.blockedBy?.some(
      (block) => Number(block.userId) === Number(user.id),
    ) ??
      target?.blockedBy?.some(
        (block) => Number(block.userId) === Number(user.id),
      ) ??
      false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleDeleteContact = () => {
    const contactId = Number(contact.contactId);
    socket.emit("contact:delete", { contactId: contactId }, (response) => {
      if (!response.ok) {
        setError(response.error);
        return;
      }
      setError("");
      navigate("/contacts");
    });
  };

  const handleSave = async () => {
    if (isContact) {
      socket.emit(
        "contact:update",
        {
          id: Number(userId),
          contact: {
            alias: formData.alias,
          },
        },
        (response) => {
          if (!response.ok) {
            setError(response.error);
            return;
          }
          updateContact(userId, () => response.data);
          setTarget(response.data);
          setError("");
          setEdit(false);
        },
      );
      return;
    }

    if (isMyProfile) {
      try {
        const response = await fetchWrapper({
          token,
          url: `http://localhost:3000/whapi/v1/users/`,
          options: {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(formData),
          },
          onSessionExpired: logout,
          updateSession,
        });
        if (!response.ok) {
          setError(response.error);
          return;
        }
        const data = await response.json();
        const updatedUser = data.data;
        setTarget(updatedUser);
        setError("");
        setEdit(false);
      } catch (e) {
        console.error(e);
        setError(e.message);
      }
    }
  };

  const handleBlockUser = () => {
    socket.emit("user:block", { userId: Number(userId) }, (response) => {
      if (!response.ok) {
        setError(response.error);
        return;
      }
      if (isContact) {
        updateContact(userId, (c) => ({
          ...c,
          contactUser: {
            ...c.contactUser,
            blockedBy: [
              ...(c.contactUser?.blockedBy ?? []),
              { userId: user.id },
            ],
          },
        }));
      } else {
        setTarget((prev) => ({
          ...prev,
          blockedBy: [...(prev?.blockedBy ?? []), { userId: user.id }],
        }));
      }
      setError("");
    });
  };

  const handleUnblockUser = () => {
    socket.emit("user:unblock", { userId: Number(userId) }, (response) => {
      if (!response.ok) {
        setError(response.error);
        return;
      }
      if (isContact) {
        updateContact(userId, (c) => ({
          ...c,
          contactUser: {
            ...c.contactUser,
            blockedBy: c.contactUser?.blockedBy?.filter(
              (block) => Number(block.userId) !== Number(user.id),
            ),
          },
        }));
      } else {
        setTarget((prev) => ({
          ...prev,
          blockedBy:
            prev?.blockedBy.filter(
              (block) => Number(block.userId) !== Number(user.id),
            ) ?? [],
        }));
      }
      setError("");
    });
  };

  const handleUserBlock = () => {
    if (isBlocked) {
      handleUnblockUser();
    } else {
      handleBlockUser();
    }
  };

  const handleStartEdit = () => {
    if (isContact) {
      setFormData({ alias: target?.alias || contact?.alias || "" });
    } else if (isMyProfile) {
      setFormData({
        name: target?.name || "",
        phone: target?.phone || "",
        description: target?.description || "",
      });
    }
    setEdit(true);
    setError("");
  };

  const handleCancelEdit = () => {
    setFormData({});
    setEdit(false);
    setError("");
  };

  const handleLogout = () => logout();

  if (loading) {
    return <p>Loading...</p>;
  }

  if (!target) {
    return <p>User not found</p>;
  }

  return (
    <div>
      <div className="user-details">
        {edit ? (
          <div className="edit-form">
            {isContact ? (
              // Contact edit (Alias only)
              <input
                type="text"
                name="alias"
                placeholder="Alias"
                value={formData?.alias ?? ""}
                onChange={handleInputChange}
              />
            ) : (
              // Profile edit
              <>
                <label>Name:</label>
                <input
                  type="text"
                  name="name"
                  placeholder="Your name"
                  value={formData?.name ?? ""}
                  onChange={handleInputChange}
                />

                <label>Phone:</label>
                <input
                  type="text"
                  name="phone"
                  placeholder="Your phone"
                  value={formData?.phone ?? ""}
                  onChange={handleInputChange}
                />

                <label>Description / Info:</label>
                <textarea
                  name="description"
                  placeholder="Your description"
                  value={formData?.description ?? ""}
                  onChange={handleInputChange}
                />
              </>
            )}

            <div className="edit-buttons">
              <button onClick={handleSave}>Save</button>
              <button onClick={handleCancelEdit}>Cancel</button>
            </div>
          </div>
        ) : (
          // View
          <div className="view-info">
            <p className="user-name">
              {isContact ? target.alias : target.name}
            </p>
            <p className="user-phone">{target.phone}</p>
            <p className="user-description">{target.description || target.contactUser?.description}</p>
          </div>
        )}

        {error && <p className="error-msg">{error}</p>}
      </div>

      <div className="actions">
        {!edit && (
          <>
            {/* If it's my profile or a contact, show the edit button */}
            {(isContact || isMyProfile) && (
              <>
                <button className="actions-edit" onClick={handleStartEdit}>
                  Edit
                </button>
              </>
            )}

            {/* If it's my profile, show the logout button */}
            {isMyProfile && (
              <>
                <button className="actions-logout" onClick={handleLogout}>
                  Logout
                </button>
              </>
            )}

            {/* Exclusive actions for other users */}
            {!isMyProfile && (
              <>
                <button className="actions-del" onClick={handleDeleteContact}>
                  Delete
                </button>
                <button className="actions-block" onClick={handleUserBlock}>
                  {isBlocked ? "Unblock" : "Block"}
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
