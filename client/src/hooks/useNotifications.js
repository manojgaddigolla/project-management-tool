import { useContext } from "react";
import { NotificationContext } from "../context/notificationContext";

const useNotifications = () => {
  return useContext(NotificationContext);
};

export default useNotifications;
