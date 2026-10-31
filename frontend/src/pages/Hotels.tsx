import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  PhoneOutlined,
  UserOutlined,
  EnvironmentOutlined,
  DollarOutlined,
} from "@ant-design/icons";
import { api } from "../lib/api";

const { Title } = Typography;

type Hotel = {
  id: number;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  address: string | null;
  creditLimit: number;
  paymentTerms: string | null;
  active: boolean;
  notes: string | null;
};

type FormValues = {
  name: string;
  contactPerson?: string;
  phone?: string;
  address?: string;
  creditLimit?: number | null;
  paymentTerms?: string;
  notes?: string;
};

const emptyForm: FormValues = {
  name: "",
  contactPerson: "",
  phone: "",
  address: "",
  creditLimit: null,
  paymentTerms: "",
  notes: "",
};

export default function Hotels() {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [showHidden, setShowHidden] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm<FormValues>();
  const [messageApi, contextHolder] = message.useMessage();

  async function load() {
    const res = await api(`/api/hotels?includeInactive=${showHidden}`);
    console.log("Hotels API status:", res.status);
    console.log("Hotels API response:", await res.clone().text());

    if (res.ok) setHotels(await res.json());
  }

  useEffect(() => {
    load();
  }, [showHidden]);

  function openAdd() {
    setEditingId(null);
    form.setFieldsValue(emptyForm);
    setModalOpen(true);
  }

  function openEdit(h: Hotel) {
    setEditingId(h.id);
    form.setFieldsValue({
      name: h.name,
      contactPerson: h.contactPerson ?? "",
      phone: h.phone ?? "",
      address: h.address ?? "",
      creditLimit: h.creditLimit,
      paymentTerms: h.paymentTerms ?? "",
      notes: h.notes ?? "",
    });
    setModalOpen(true);
  }

  async function handleFinish(values: FormValues) {
    setSaving(true);
    try {
      const body = {
        ...values,
        creditLimit:
          values.creditLimit === null || values.creditLimit === undefined
            ? 0
            : Number(values.creditLimit),
      };
      const res = await api(
        editingId ? `/api/hotels/${editingId}` : "/api/hotels",
        {
          method: editingId ? "PUT" : "POST",
          body: JSON.stringify(body),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        messageApi.error(data?.message ?? "Could not save");
        return;
      }
      messageApi.success(editingId ? "Hotel updated" : "Hotel added");
      setModalOpen(false);
      form.resetFields();
      load();
    } catch {
      messageApi.error("Cannot reach the server");
    } finally {
      setSaving(false);
    }
  }

  async function hide(h: Hotel) {
    await api(`/api/hotels/${h.id}`, { method: "DELETE" });
    messageApi.success(`"${h.name}" hidden`);
    load();
  }

  async function restore(h: Hotel) {
    await api(`/api/hotels/${h.id}`, {
      method: "PUT",
      body: JSON.stringify({ ...h, active: true }),
    });
    messageApi.success(`"${h.name}" restored`);
    load();
  }

  const columns: ColumnsType<Hotel> = [
    {
      title: "Hotel",
      dataIndex: "name",
      key: "name",
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (name: string, record) => (
        <span style={{ opacity: record.active ? 1 : 0.5, fontWeight: 500 }}>
          {name}
        </span>
      ),
    },
    {
      title: "Contact",
      dataIndex: "contactPerson",
      key: "contactPerson",
      width: 160,
      render: (v: string | null) =>
        v || <span style={{ color: "#9ca3af" }}>—</span>,
    },
    {
      title: "Phone",
      dataIndex: "phone",
      key: "phone",
      width: 150,
      render: (v: string | null) =>
        v ? (
          <a href={`tel:${v}`}>{v}</a>
        ) : (
          <span style={{ color: "#9ca3af" }}>—</span>
        ),
    },
    {
      title: "Address",
      dataIndex: "address",
      key: "address",
      ellipsis: true,
      render: (v: string | null) =>
        v || <span style={{ color: "#9ca3af" }}>—</span>,
    },
    {
      title: "Credit limit",
      dataIndex: "creditLimit",
      key: "creditLimit",
      width: 150,
      align: "right",
      sorter: (a, b) => Number(a.creditLimit) - Number(b.creditLimit),
      render: (v: number, record) => {
        const num = Number(v);
        const overLimit = num === 0;
        return (
          <span style={{ opacity: record.active ? 1 : 0.5 }}>
            {overLimit ? (
              <Tag color="default">No limit</Tag>
            ) : (
              <>Rs {num.toLocaleString()}</>
            )}
          </span>
        );
      },
    },
    {
      title: "Terms",
      dataIndex: "paymentTerms",
      key: "paymentTerms",
      width: 130,
      render: (v: string | null) =>
        v ? (
          <Tag color="blue">{v}</Tag>
        ) : (
          <span style={{ color: "#9ca3af" }}>—</span>
        ),
    },
    {
      title: "Status",
      key: "status",
      width: 110,
      filters: [
        { text: "Active", value: true },
        { text: "Hidden", value: false },
      ],
      onFilter: (value, record) => record.active === value,
      render: (_, record) =>
        record.active ? <Tag color="green">Active</Tag> : <Tag>Hidden</Tag>,
    },
    {
      title: "Actions",
      key: "actions",
      width: 200,
      align: "right",
      render: (_, record) => (
        <Space size="small">
          <Button size="small" onClick={() => openEdit(record)}>
            Edit
          </Button>
          {record.active ? (
            <Popconfirm
              title="Hide this hotel?"
              description="Old orders will keep it."
              okText="Hide"
              cancelText="Cancel"
              okButtonProps={{ danger: true }}
              onConfirm={() => hide(record)}
            >
              <Button size="small" danger>
                Hide
              </Button>
            </Popconfirm>
          ) : (
            <Button size="small" type="primary" onClick={() => restore(record)}>
              Restore
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div >
      {contextHolder}

      <Link to="/" style={{ fontSize: 14 }}>
        ← Dashboard
      </Link>
      <Title level={3} style={{ marginTop: 8, marginBottom: 16 }}>
        Hotels
      </Title>

      <Table<Hotel>
        rowKey="id"
        columns={columns}
        dataSource={hotels}
        pagination={{ pageSize: 10, showSizeChanger: true }}
        rowClassName={(record) => (record.active ? "" : "row-inactive")}
        locale={{ emptyText: "No hotels yet" }}
        scroll={{ x: 1100 }}
        title={() => (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <Space>
              <Button type="primary" onClick={openAdd}>
                + Add hotel
              </Button>
              <Button
                onClick={() => setShowHidden((v) => !v)}
                type={showHidden ? "primary" : "default"}
                ghost={showHidden}
              >
                {showHidden ? "Hide hidden" : "Show hidden"}
              </Button>
            </Space>
            <span style={{ color: "#6b7280", fontSize: 13 }}>
              {hotels.length} hotel{hotels.length === 1 ? "" : "s"}
            </span>
          </div>
        )}
      />

      <Modal
        open={modalOpen}
        title={editingId ? "Edit hotel" : "Add hotel"}
        okText={editingId ? "Update" : "Add"}
        confirmLoading={saving}
        onCancel={() => {
          setModalOpen(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        destroyOnClose
        width={640}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={emptyForm}
          onFinish={handleFinish}
          preserve={false}
        >
          <Form.Item
            name="name"
            label="Hotel name"
            rules={[{ required: true, message: "Hotel name is required" }]}
          >
            <Input placeholder="e.g. Grand Palace Hotel" autoFocus />
          </Form.Item>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}
          >
            <Form.Item name="contactPerson" label="Contact person">
              <Input
                prefix={<UserOutlined style={{ color: "#9ca3af" }} />}
                placeholder="Full name"
              />
            </Form.Item>

            <Form.Item name="phone" label="Phone">
              <Input
                prefix={<PhoneOutlined style={{ color: "#9ca3af" }} />}
                placeholder="+94 ..."
              />
            </Form.Item>
          </div>

          <Form.Item name="address" label="Delivery address">
            <Input
              prefix={<EnvironmentOutlined style={{ color: "#9ca3af" }} />}
              placeholder="Street, city"
            />
          </Form.Item>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}
          >
            <Form.Item
              name="creditLimit"
              label="Credit limit (Rs)"
              tooltip="Leave empty or 0 for no limit"
            >
              <InputNumber<number>
                style={{ width: "100%" }}
                min={0}
                step={1000}
                placeholder="0"
                prefix={<DollarOutlined style={{ color: "#9ca3af" }} />}
                formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                parser={(v) => v!.replace(/,/g, "") as unknown as number}
              />
            </Form.Item>

            <Form.Item name="paymentTerms" label="Payment terms">
              <Input placeholder="e.g. 30 days" />
            </Form.Item>
          </div>

          <Form.Item name="notes" label="Notes (optional)">
            <Input.TextArea
              placeholder="Anything worth remembering"
              autoSize={{ minRows: 2, maxRows: 4 }}
            />
          </Form.Item>
        </Form>
      </Modal>

      <style>{`
        .row-inactive td { opacity: 0.5; }
        .row-inactive:hover td { opacity: 0.7; }
      `}</style>
    </div>
  );
}
