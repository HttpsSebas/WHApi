import { useNavigate } from "react-router-dom";
import "../Styles.css"

export default function CreateContactBtn() {
    const navigate = useNavigate();
    return (
        <button
            className="floating-Btn"
            onClick={() => {
                navigate("/contacts/create");
            }}
        >
            +
        </button>
    );
}