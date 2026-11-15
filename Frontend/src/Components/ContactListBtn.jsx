import { useNavigate } from "react-router-dom";

export default function ContactListBtn() {
    const navigate = useNavigate();
    return (
        <button
            className="floating-Btn"
            onClick={() => {
                navigate("/contacts");
            }}
        >
            👤
        </button>
    );
}