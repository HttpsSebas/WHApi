import { useNavigate } from "react-router-dom";
import { useContext } from "react";
import { ContactsContext } from "../../Context/contactsProvider.jsx";
import CreateContact from "./CreateContactBtn.jsx";

export default function ContactList() {
  const { contacts } = useContext(ContactsContext);
  const navigate = useNavigate();
  
  return (
    <div>
      {contacts.map((contact) => {
        return (
          <div
            key={contact.id}
            onClick={() => {
              navigate(`/users/${contact.contactId}`);
            }}
          >
            <p>{contact.alias}</p>
            <p>{contact.phone}</p>
            <p>{contact.description}</p>
            <hr />
          </div>
        );
      })}
      <CreateContact />
    </div>
  );
}
