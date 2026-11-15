import ContactListBtn from "./ContactListBtn";

import { Outlet } from "react-router-dom";

export default function AppLayout() {
  return (
    <>
      <Outlet />
      <ContactListBtn />
    </>
  );
}