import { Link } from "react-router-dom";
import {
  AppstoreOutlined,
  ShopOutlined,
  TeamOutlined,
  UserOutlined,
  ShoppingCartOutlined,
  InboxOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";
import { Card, Col, Row, Typography } from "antd";

const { Title, Text } = Typography;

const sections = [
  {
    key: "items",
    title: "Items",
    description: "Manage vegetables and fruits in your catalog",
    icon: <AppstoreOutlined />,
    color: "#16a34a",
    bg: "#dcfce7",
    to: "/items",
  },
  {
    key: "hotels",
    title: "Hotels",
    description: "Manage hotel customers and their credit terms",
    icon: <ShopOutlined />,
    color: "#ea580c",
    bg: "#ffedd5",
    to: "/hotels",
  },
  {
    key: "suppliers",
    title: "Suppliers",
    description: "Track suppliers, phone numbers and credit limits",
    icon: <TeamOutlined />,
    color: "#2563eb",
    bg: "#dbeafe",
    to: "/suppliers",
  },
  {
    key: "buyers",
    title: "Buyers",
    description: "Individual buyers with daily cash limits",
    icon: <UserOutlined />,
    color: "#9333ea",
    bg: "#f3e8ff",
    to: "/buyers",
  },
  {
    key: "prices",
    title: "Prices",
    description: "Manage product prices and discounts",
    icon: <ShoppingCartOutlined />,
    color: "#9333ea",
    bg: "#f3e8ff",
    to: "/prices",
  },
  {
    key: "orders",
    title: "Orders",
    description: "Place and review orders (coming soon)",
    icon: <ShoppingCartOutlined />,
    color: "#9333ea",
    bg: "#f3e8ff",
    to: "/orders",
  },
  {
    key: "orders",
    title: "Orders",
    description: "Place and review orders (coming soon)",
    icon: <ShoppingCartOutlined />,
    color: "#64748b",
    bg: "#f1f5f9",
    to: null,
  },
  {
    key: "inventory",
    title: "Inventory",
    description: "Stock levels and adjustments (coming soon)",
    icon: <InboxOutlined />,
    color: "#64748b",
    bg: "#f1f5f9",
    to: null,
  },
];

export default function Dashboard() {
  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>
          Welcome back 👋
        </Title>
        <Text type="secondary">
          You're signed in. Pick a section below to get started.
        </Text>
      </div>

      <Row gutter={[16, 16]}>
        {sections.map((s) => {
          const card = (
            <Card
              hoverable={!!s.to}
              style={{
                height: "100%",
                borderRadius: 12,
                border: "1px solid #eef0f3",
                cursor: s.to ? "pointer" : "not-allowed",
                opacity: s.to ? 1 : 0.7,
              }}
              styles={{ body: { padding: 20 } }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 20,
                    color: s.color,
                    background: s.bg,
                    flexShrink: 0,
                  }}
                >
                  {s.icon}
                </div>
                <div>
                  <div
                    style={{ fontSize: 16, fontWeight: 600, color: "#111827" }}
                  >
                    {s.title}
                  </div>
                  {!s.to && (
                    <span style={{ fontSize: 12, color: "#9ca3af" }}>
                      Coming soon
                    </span>
                  )}
                </div>
              </div>
              <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.5 }}>
                {s.description}
              </div>
              {s.to && (
                <div
                  style={{
                    marginTop: 16,
                    color: "#2563eb",
                    fontSize: 13,
                    fontWeight: 500,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  Open <ArrowRightOutlined style={{ fontSize: 11 }} />
                </div>
              )}
            </Card>
          );

          return (
            <Col key={s.key} xs={24} sm={12} lg={8}>
              {s.to ? (
                <Link to={s.to} style={{ display: "block" }}>
                  {card}
                </Link>
              ) : (
                card
              )}
            </Col>
          );
        })}
      </Row>
      <p>
        <Link to="/purchases">Purchases</Link>
      </p>
      <p>
        <Link to="/supplier-payments">Supplier payments</Link>
      </p>
      <p>
        <Link to="/cash">Buyer cash</Link>
      </p>
    </>
  );
}
