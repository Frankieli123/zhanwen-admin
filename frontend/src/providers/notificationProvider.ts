import { NotificationProvider } from "@refinedev/core";
import { notification } from "antd";

export const notificationProvider: NotificationProvider = {
  open: ({ message, type, description, key }) => {
    notification[type]({
      message,
      description,
      key,
      placement: "topRight",
      duration: 4.5,
    });
  },
  close: (key) => {
    notification.destroy(key);
  },
};
