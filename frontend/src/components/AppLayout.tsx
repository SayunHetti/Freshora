import { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  AppstoreOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ShopOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  Avatar,
  Button,
  Dropdown,
  Layout,
  Menu,
  Space,
  Typography,
} from "antd";
import { clearToken } from "../lib/api";

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const NAV_ITEMS = [
  { key: "/", label: "Dashboard", icon: <AppstoreOutlined /> },
  { key: "/items", label: "Items", icon: <AppstoreOutlined /> },
  { key: "/hotels", label: "Hotels", icon: <ShopOutlined /> },
  { key: "/suppliers", label: "Suppliers", icon: <TeamOutlined /> },
  { key: "/buyers", label: "Buyers", icon: <UserOutlined /> },
];

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  function logout() {
    clearToken();
    navigate("/login");
  }

  // Pick the best matching nav key for the current path
  const selectedKey =
    [...NAV_ITEMS]
      .sort((a, b) => b.key.length - a.key.length)
      .find(
        (item) =>
          location.pathname === item.key ||
          (item.key !== "/" && location.pathname.startsWith(item.key))
      )?.key ?? "/";

  const userMenu = {
    items: [
      {
        key: "logout",
        icon: <LogoutOutlined />,
        label: "Log out",
        danger: true,
        onClick: logout,
      },
    ],
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        breakpoint="lg"
        collapsedWidth="80"
        theme="dark"
        trigger={null}
        style={{ position: "sticky", top: 0, height: "100vh" }}
      >
        <Link
          to="/"
          style={{
            height: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "flex-start",
            padding: collapsed ? 0 : "0 20px",
            color: "#fff",
            fontWeight: 700,
            fontSize: 16,
            letterSpacing: 0.3,
            borderBottom: "1px solid rgba(255,255,255,0.1)",
            textDecoration: "none",
          }}
        >
          {collapsed ? "🌿" : "🌿 FreshStock"}
        </Link>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={NAV_ITEMS.map((item) => ({
            key: item.key,
            icon: item.icon,
            label: <Link to={item.key}>{item.label}</Link>,
          }))}
          style={{ borderInlineEnd: "none" }}
        />
      </Sider>

      <Layout>
        <Header
          style={{
            background: "#fff",
            padding: "0 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
            position: "sticky",
            top: 0,
            zIndex: 10,
            borderBottom: "1px solid #e5e7eb",
          }}
        >
          <Space>
            <Button
              type="text"
              onClick={() => setCollapsed((c) => !c)}
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            />
            <Text type="secondary" style={{ fontSize: 14 }}>
              {NAV_ITEMS.find((i) => i.key === selectedKey)?.label ?? "Dashboard"}
            </Text>
          </Space>

          <Dropdown menu={userMenu} placement="bottomRight" trigger={["click"]}>
            <Space style={{ cursor: "pointer" }}>
              <Avatar
                style={{ backgroundColor: "#2563eb" }}
                icon={<UserOutlined />}
              />
              <span style={{ fontSize: 14, color: "#111827" }}>Account</span>
            </Space>
          </Dropdown>
        </Header>

        <Content style={{ padding: 24, background: "#f5f6f8" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <Outlet />
          </div>
        </Content>
      </Layout>

      <style>{`
        .row-inactive td { opacity: 0.5; }
        .row-inactive:hover td { opacity: 0.7; }
      `}</style>
    </Layout>
  );
}