import "../Styles.css"

export default function UnreadMessagesCount({ count }) {
  return (
    <div className="unread-messages-divider">
      <span className="unread-messages-count">
        {count} {count === 1 ? "unread message" : "unread messages"}
      </span>
    </div>
  );
}