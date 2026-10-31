import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { DollarOutlined } from "@ant-design/icons";
import { api } from "../lib/api";

const { Title } = Typography;

type Buyer = {
  id: number;
  name: string;
  type: string;
  dailyCashLimit: number | null;
  active: boolean;
  notes: string | null;
};

type FormValues = {
  name: string;
  type: string;
  dailyCashLimit?: number | null;
  notes?: string;
};

const emptyForm: FormValues = {
  name: "",
  type: "VEGETABLE",
  dailyCashLimit: null,
  notes: "",
};

export default function Buyers() {
  const [list, setList] = useState<Buyer[]>([]);
  const [showHidden, setShowHidden] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm<FormValues>();
  const [messageApi, contextHolder] = message.useMessage();

async function load() {
  const res = await api(`/api/buyers?includeInactive=${showHidden}`);

  console.log("Buyers API status:", res.status);
  console.log("Buyers API response:", await res.clone().text());

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

  function openEdit(b: Buyer) {
    setEditingId(b.id);
    form.setFieldsValue({
      name: b.name,
      type: b.type,
      dailyCashLimit: b.dailyCashLimit,
      notes: b.notes ?? "",
    });
    setModalOpen(true);
  }

  async function handleFinish(values: FormValues) {
    setSaving(true);
    try {
      const body = {
        ...values,
        dailyCashLimit:
          values.dailyCashLimit === null || values.dailyCashLimit === undefined
            ? null
            : Number(values.dailyCashLimit),
      };
      const res = await api(
        editingId ? `/api/buyers/${editingId}` : "/api/buyers",
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
      messageApi.success(editingId ? "Buyer updated" : "Buyer added");
      setModalOpen(false);
      form.resetFields();
      load();
    } catch {
      messageApi.error("Cannot reach the server");
    } finally {
      setSaving(false);
    }
  }

  async function hide(b: Buyer) {
    await api(`/api/buyers/${b.id}`, { method: "DELETE" });
    messageApi.success(`"${b.name}" hidden`);
    load();
  }

  async function restore(b: Buyer) {
    await api(`/api/buyers/${b.id}`, {
      method: "PUT",
      body: JSON.stringify({ ...b, active: true }),
    });
    messageApi.success(`"${b.name}" restored`);
    load();
  }

  const columns: ColumnsType<Buyer> = [
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
      title: "Type",
      dataIndex: "type",
      key: "type",
      width: 160,
      filters: [
        { text: "Vegetable", value: "VEGETABLE" },
        { text: "Fruit", value: "FRUIT" },
      ],
      onFilter: (value, record) => record.type === value,
      render: (type: string, record) => (
        <span style={{ opacity: record.active ? 1 : 0.5 }}>
          <Tag color={type === "FRUIT" ? "orange" : "green"}>
            {type === "FRUIT" ? "Fruit" : "Vegetable"}
          </Tag>
        </span>
      ),
    },
    {
      title: "Daily cash limit",
      dataIndex: "dailyCashLimit",
      key: "dailyCashLimit",
      width: 180,
      align: "right",
      sorter: (a, b) => {
        const av =
          a.dailyCashLimit == null ? Infinity : Number(a.dailyCashLimit);
        const bv =
          b.dailyCashLimit == null ? Infinity : Number(b.dailyCashLimit);
        return av - bv;
      },
      render: (v: number | null, record) => (
        <span style={{ opacity: record.active ? 1 : 0.5 }}>
          {v == null ? (
            <Tag color="default">No cap</Tag>
          ) : (
            <>Rs {Number(v).toLocaleString()}</>
          )}
        </span>
      ),
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
              title="Hide this buyer?"
              description="Old records keep them."
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
        Buyers
      </Title>

      <Table<Buyer>
        rowKey="id"
        columns={columns}
        dataSource={list}
        pagination={{ pageSize: 10, showSizeChanger: true }}
        rowClassName={(record) => (record.active ? "" : "row-inactive")}
        locale={{ emptyText: "No buyers yet" }}
        scroll={{ x: 900 }}
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
                + Add buyer
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
              {list.length} buyer{list.length === 1 ? "" : "s"}
            </span>
          </div>
        )}
      />

      <Modal
        open={modalOpen}
        title={editingId ? "Edit buyer" : "Add buyer"}
        okText={editingId ? "Update" : "Add"}
        confirmLoading={saving}
        onCancel={() => {
          setModalOpen(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        destroyOnClose
        width={520}
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
            label="Buyer name"
            rules={[{ required: true, message: "Buyer name is required" }]}
          >
            <Input placeholder="e.g. Sharma Vegetables" autoFocus />
          </Form.Item>

          <Form.Item name="type" label="Type">
            <Select
              options={[
                { value: "VEGETABLE", label: "Vegetable buyer" },
                { value: "FRUIT", label: "Fruit buyer" },
              ]}
            />
          </Form.Item>

          <Form.Item
            name="dailyCashLimit"
            label="Daily cash limit (Rs)"
            tooltip="Leave empty for no cap"
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
