import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Button,
  Form,
  Input,
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
import { api } from "../lib/api";

const { Title } = Typography;

type Item = {
  id: number;
  name: string;
  category: string;
  unit: string;
  active: boolean;
  notes: string | null;
};

type FormValues = {
  name: string;
  category: string;
  unit: string;
  notes?: string;
};

const emptyForm: FormValues = {
  name: "",
  category: "VEGETABLE",
  unit: "kg",
  notes: "",
};

export default function Items() {
  const [items, setItems] = useState<Item[]>([]);
  const [showHidden, setShowHidden] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm<FormValues>();
  const [messageApi, contextHolder] = message.useMessage();

  async function load() {
    const res = await api(`/api/items?includeInactive=${showHidden}`);
    if (res.ok) setItems(await res.json());
  }

  useEffect(() => {
    load();
  }, [showHidden]);

  function openAdd() {
    setEditingId(null);
    form.setFieldsValue(emptyForm);
    setModalOpen(true);
  }

  function openEdit(item: Item) {
    setEditingId(item.id);
    form.setFieldsValue({
      name: item.name,
      category: item.category,
      unit: item.unit,
      notes: item.notes ?? "",
    });
    setModalOpen(true);
  }

  async function handleFinish(values: FormValues) {
    setSaving(true);
    try {
      const res = await api(
        editingId ? `/api/items/${editingId}` : "/api/items",
        {
          method: editingId ? "PUT" : "POST",
          body: JSON.stringify(values),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        messageApi.error(data?.message ?? "Could not save");
        return;
      }
      messageApi.success(editingId ? "Item updated" : "Item added");
      setModalOpen(false);
      form.resetFields();
      load();
    } catch {
      messageApi.error("Cannot reach the server");
    } finally {
      setSaving(false);
    }
  }

  async function hide(item: Item) {
    await api(`/api/items/${item.id}`, { method: "DELETE" });
    messageApi.success(`"${item.name}" hidden`);
    load();
  }

  async function restore(item: Item) {
    await api(`/api/items/${item.id}`, {
      method: "PUT",
      body: JSON.stringify({ ...item, active: true }),
    });
    messageApi.success(`"${item.name}" restored`);
    load();
  }

  const columns: ColumnsType<Item> = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (name: string, record) => (
        <span style={{ opacity: record.active ? 1 : 0.5 }}>{name}</span>
      ),
    },
    {
      title: "Category",
      dataIndex: "category",
      key: "category",
      width: 140,
      filters: [
        { text: "Vegetable", value: "VEGETABLE" },
        { text: "Fruit", value: "FRUIT" },
      ],
      onFilter: (value, record) => record.category === value,
      render: (category: string, record) => (
        <Tag color={category === "FRUIT" ? "orange" : "green"}>
          {category === "FRUIT" ? "Fruit" : "Vegetable"}
        </Tag>
      ),
    },
    {
      title: "Unit",
      dataIndex: "unit",
      key: "unit",
      width: 120,
    },
    {
      title: "Notes",
      dataIndex: "notes",
      key: "notes",
      ellipsis: true,
      render: (notes: string | null) => notes || <span style={{ color: "#9ca3af" }}>—</span>,
    },
    {
      title: "Status",
      key: "status",
      width: 110,
      render: (_, record) =>
        record.active ? (
          <Tag color="blue">Active</Tag>
        ) : (
          <Tag>Hidden</Tag>
        ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 220,
      align: "right",
      render: (_, record) => (
        <Space size="small">
          <Button size="small" onClick={() => openEdit(record)}>
            Edit
          </Button>
          {record.active ? (
            <Popconfirm
              title="Hide this item?"
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
    <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      {contextHolder}

      <Link to="/" style={{ fontSize: 14 }}>
        ← Dashboard
      </Link>
      <Title level={3} style={{ marginTop: 8, marginBottom: 16 }}>
        Items
      </Title>

      <Table<Item>
        rowKey="id"
        columns={columns}
        dataSource={items}
        pagination={{ pageSize: 10, showSizeChanger: true }}
        rowClassName={(record) => (record.active ? "" : "row-inactive")}
        locale={{ emptyText: "No items yet" }}
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
                + Add item
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
              {items.length} item{items.length === 1 ? "" : "s"}
            </span>
          </div>
        )}
      />

      <Modal
        open={modalOpen}
        title={editingId ? "Edit item" : "Add item"}
        okText={editingId ? "Update" : "Add"}
        confirmLoading={saving}
        onCancel={() => {
          setModalOpen(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        destroyOnClose
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
            label="Name"
            rules={[{ required: true, message: "Name is required" }]}
          >
            <Input placeholder="e.g. Tomatoes" autoFocus />
          </Form.Item>

          <Form.Item name="category" label="Category">
            <Select
              options={[
                { value: "VEGETABLE", label: "Vegetable" },
                { value: "FRUIT", label: "Fruit" },
              ]}
            />
          </Form.Item>

          <Form.Item
            name="unit"
            label="Unit"
            rules={[{ required: true, message: "Unit is required" }]}
          >
            <Input placeholder="kg, bunch, box..." />
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