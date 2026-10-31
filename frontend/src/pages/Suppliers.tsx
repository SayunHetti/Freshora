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
  EnvironmentOutlined,
  DollarOutlined,
} from "@ant-design/icons";
import { api } from "../lib/api";

const { Title } = Typography;

type Supplier = {
  id: number;
  name: string;
  phone: string | null;
  address: string | null;
  creditLimit: number;
  active: boolean;
  notes: string | null;
};

type FormValues = {
  name: string;
  phone?: string;
  address?: string;
  creditLimit?: number | null;
  notes?: string;
};

const emptyForm: FormValues = {
  name: "",
  phone: "",
  address: "",
  creditLimit: null,
  notes: "",
};

export default function Suppliers() {
  const [list, setList] = useState<Supplier[]>([]);
  const [showHidden, setShowHidden] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm<FormValues>();
  const [messageApi, contextHolder] = message.useMessage();

  async function load() {
    const res = await api(`/api/suppliers?includeInactive=${showHidden}`);
    if (res.ok) setList(await res.json());
  }

  useEffect(() => {
    load();
  }, [showHidden]);

  function openAdd() {
    setEditingId(null);
    form.setFieldsValue(emptyForm);
    setModalOpen(true);
  }

  function openEdit(s: Supplier) {
    setEditingId(s.id);
    form.setFieldsValue({
      name: s.name,
      phone: s.phone ?? "",
      address: s.address ?? "",
      creditLimit: s.creditLimit,
      notes: s.notes ?? "",
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
        editingId ? `/api/suppliers/${editingId}` : "/api/suppliers",
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
      messageApi.success(editingId ? "Supplier updated" : "Supplier added");
      setModalOpen(false);
      form.resetFields();
      load();
    } catch {
      messageApi.error("Cannot reach the server");
    } finally {
      setSaving(false);
    }
  }

  async function hide(s: Supplier) {
    await api(`/api/suppliers/${s.id}`, { method: "DELETE" });
    messageApi.success(`"${s.name}" hidden`);
    load();
  }

  async function restore(s: Supplier) {
    await api(`/api/suppliers/${s.id}`, {
      method: "PUT",
      body: JSON.stringify({ ...s, active: true }),
    });
    messageApi.success(`"${s.name}" restored`);
    load();
  }

  const columns: ColumnsType<Supplier> = [
    {
      title: "Name",
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
      title: "Phone",
      dataIndex: "phone",
      key: "phone",
      width: 150,
      render: (v: string | null, record) =>
        v ? (
          <a href={`tel:${v}`} style={{ opacity: record.active ? 1 : 0.5 }}>
            {v}
          </a>
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
      width: 160,
      align: "right",
      sorter: (a, b) => Number(a.creditLimit) - Number(b.creditLimit),
      render: (v: number, record) => {
        const num = Number(v);
        return (
          <span style={{ opacity: record.active ? 1 : 0.5 }}>
            {num === 0 ? (
              <Tag color="default">No limit</Tag>
            ) : (
              <>Rs {num.toLocaleString()}</>
            )}
          </span>
        );
      },
    },
    {
      title: "Notes",
      dataIndex: "notes",
      key: "notes",
      ellipsis: true,
      render: (v: string | null) =>
        v || <span style={{ color: "#9ca3af" }}>—</span>,
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
              title="Hide this supplier?"
              description="Old records keep it."
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
    <div>
      {contextHolder}

      <Link to="/" style={{ fontSize: 14 }}>
        ← Dashboard
      </Link>
      <Title level={3} style={{ marginTop: 8, marginBottom: 16 }}>
        Suppliers
      </Title>

      <Table<Supplier>
        rowKey="id"
        columns={columns}
        dataSource={list}
        pagination={{ pageSize: 10, showSizeChanger: true }}
        rowClassName={(record) => (record.active ? "" : "row-inactive")}
        locale={{ emptyText: "No suppliers yet" }}
        scroll={{ x: 950 }}
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
                + Add supplier
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
              {list.length} supplier{list.length === 1 ? "" : "s"}
            </span>
          </div>
        )}
      />

      <Modal
        open={modalOpen}
        title={editingId ? "Edit supplier" : "Add supplier"}
        okText={editingId ? "Update" : "Add"}
        confirmLoading={saving}
        onCancel={() => {
          setModalOpen(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        destroyOnClose
        width={560}
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
            label="Supplier name"
            rules={[{ required: true, message: "Supplier name is required" }]}
          >
            <Input placeholder="e.g. Fresh Farms Co." autoFocus />
          </Form.Item>

          <Form.Item name="phone" label="Phone">
            <Input
              prefix={<PhoneOutlined style={{ color: "#9ca3af" }} />}
              placeholder="+94 ..."
            />
          </Form.Item>

          <Form.Item name="address" label="Address">
            <Input
              prefix={<EnvironmentOutlined style={{ color: "#9ca3af" }} />}
              placeholder="Street, city"
            />
          </Form.Item>

          <Form.Item
            name="creditLimit"
            label="Credit limit (Rs)"
            tooltip="Leave empty or 0 for no limit"
          >
            <InputNumber<number>
              style={{ width: "100%" }}
              min={0}
              step={1000}
              placeholder="No cap"
              prefix={<DollarOutlined style={{ color: "#9ca3af" }} />}
              formatter={(v) =>
                v != null ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : ""
              }
              parser={(v) => Number(v?.replace(/,/g, "") ?? 0)}
            />
          </Form.Item>

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
