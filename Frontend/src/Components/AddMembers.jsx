import { useState, useContext } from "react";
import { ContactsContext } from "../../Context/contactsProvider";
import "../Styles.css";

export function AddMembers({ participantIds, handleAddMembers, onClose }) {
  const [userIds, setUserIds] = useState([]);
  const { contacts } = useContext(ContactsContext);

  return (
    <div className="add-members">
      <ul>
        {contacts?.map((contact) => (
          <li key={contact.id}>
            <input
              type="checkbox"
              name="users"
              disabled={participantIds.includes(contact.contactUser.id)}
              value={contact.contactId}
              onChange={(e) => {
                const value = Number(e.target.value);
                if (e.target.checked) {
                  setUserIds((prev) =>
                    prev.includes(value) ? prev : [...prev, value],
                  );
                } else {
                  setUserIds((prev) => prev.filter((id) => id !== value));
                }
              }}
            />
            {contact.alias || contact.phone}
          </li>
        ))}
      </ul>
      <button onClick={() => handleAddMembers(userIds)}>Agregar</button>
      <button onClick={onClose}>Cerrar</button>
    </div>
  );
}
