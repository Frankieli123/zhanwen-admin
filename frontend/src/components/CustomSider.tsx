import React from "react";
import { ThemedSiderV2 } from "@refinedev/antd";
import { LogoutOutlined } from "@ant-design/icons";

export const CustomSider: React.FC<any> = (props) => {
  return (
    <ThemedSiderV2
      {...props}
      render={({ items, logout, collapsed }) => (
        <>
          {items}
          {logout && React.cloneElement(logout, {
            icon: <LogoutOutlined />,
            children: collapsed ? null : "退出登录"
          })}
        </>
      )}
    />
  );
};
