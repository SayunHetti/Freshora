import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Typography,
} from "antd";
import { LockOutlined, UserOutlined } from "@ant-design/icons";
import { api, setToken } from "../lib/api";

const { Title, Text } = Typography;

type LoginValues = {
  username: string;
  password: string;
};

export default function Login() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleFinish(values: LoginValues) {
    setError("");
    setLoading(true);
    try {
      const res = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Login failed");
        return;
      }
      setToken(data.token);
      navigate("/");
    } catch {
      setError("Cannot reach the server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background:
          "linear-gradient(135deg, #f0f4ff 0%, #fafafa 50%, #f5f0ff 100%)",
      }}
    >
      <Card
        style={{
          width: "100%",
          maxWidth: 400,
          boxShadow: "0 10px 40px rgba(0, 0, 0, 0.08)",
          borderRadius: 12,
        }}
        styles={{ body: { padding: 32 } }}
      >
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <Title level={3} style={{ margin: 0 }}>
            Sign in
          </Title>
          <Text type="secondary" style={{ fontSize: 14 }}>
            Welcome back — please enter your credentials
          </Text>
        </div>

        {error && (
          <Alert
            type="error"
            message={error}
            showIcon
            style={{ marginBottom: 16 }}
            closable
            onClose={() => setError("")}
          />
        )}

        <Form<LoginValues>
          layout="vertical"
          onFinish={handleFinish}
          requiredMark={false}
          size="large"
          autoComplete="on"
        >
          <Form.Item
            name="username"
            label="Username"
            rules={[{ required: true, message: "Please enter your username" }]}
          >
            <Input
              prefix={<UserOutlined style={{ color: "#9ca3af" }} />}
              placeholder="Username"
              autoComplete="username"
              autoFocus
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: "Please enter your password" }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: "#9ca3af" }} />}
              placeholder="Password"
              autoComplete="current-password"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              size="large"
            >
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}