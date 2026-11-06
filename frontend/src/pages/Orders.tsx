import { useEffect, useState } from "react";
import {
  Button,
  Card,
  DatePicker,
  Divider,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  CalendarOutlined,
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  MinusCircleOutlined,
  PlusOutlined,
  ShopOutlined,
  ShoppingOutlined,
} from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { api } from "../lib/api";

const { Title, Text } = Typography;

type Hotel = { id: number; name: string; active: boolean };
type Item = { id: number; name: string; unit: string; active: boolean };
type Line = {
  id?: number;
  itemId: number;
  quantity: number;
  deliveredQuantity: number | null;
  notes: string | null;
};
type Order = {
  id: number;
  hotelId: number;
  orderDate: string;
  deliveryDate: string;
  status: string;
  notes: string | null;
  items: Line[];
};
type ShoppingLine = {
  itemId: number;
  name: string;
  category: string;
  unit: string;
  total: number;
};
type FormLine = {
  itemId: number | null;
  quantity: number | null;
  deliveredQuantity: number | null;
};
type FormValues = {
  hotelId: number | null;
  deliveryDate: Dayjs | null;
  status: string;
  notes?: string;
  lines: FormLine[];
};

const STATUSES = ["RECEIVED", "PURCHASED", "PACKED", "DELIVERED", "CANCELLED"];
const STATUS_COLORS: Record<string, string> = {
  RECEIVED: "blue",
  PURCHASED: "purple",
  PACKED: "orange",
  DELIVERED: "green",
  CANCELLED: "red",
};
const DATE_FMT = "YYYY-MM-DD";
const today = () => dayjs().format(DATE_FMT);

const emptyLine: FormLine = {
  itemId: null,
  quantity: null,
  deliveredQuantity: null,
};
const emptyForm = (): FormValues => ({
  hotelId: null,
  deliveryDate: dayjs(),
  status: "RECEIVED",
  notes: "",
  lines: [{ ...emptyLine }],
});

export default function Orders() {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [shopping, setShopping] = useState<ShoppingLine[]>([]);
  const [filterDate, setFilterDate] = useState<Dayjs | null>(dayjs());
  const [filterStatus, setFilterStatus] = useState<string>("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm<FormValues>();

  const [copyOpen, setCopyOpen] = useState(false);
  const [copyTarget, setCopyTarget] = useState<Order | null>(null);
  const [copyDate, setCopyDate] = useState<Dayjs | null>(dayjs());
  const [copying, setCopying] = useState(false);

  const [messageApi, contextHolder] = message.useMessage();

  useEffect(() => {
    (async () => {
      const [h, i] = await Promise.all([
        api("/api/hotels?includeInactive=true"),
        api("/api/items?includeInactive=true"),
      ]);
      if (h.ok) setHotels(await h.json());
      if (i.ok) setItems(await i.json());
    })();
  }, []);

  async function load() {
    const params = new URLSearchParams();
    const dateStr = filterDate ? filterDate.format(DATE_FMT) : "";
    if (dateStr) params.set("deliveryDate", dateStr);
    if (filterStatus) params.set("status", filterStatus);
    const res = await api(`/api/orders?${params}`);
    if (res.ok) setOrders(await res.json());

    if (dateStr) {
      const s = await api(`/api/orders/shopping-list?date=${dateStr}`);
      if (s.ok) setShopping(await s.json());
    } else {
      setShopping([]);
    }
  }

  useEffect(() => {
    load();
  }, [filterDate, filterStatus]);

  const hotelName = (id: number) =>
    hotels.find((h) => h.id === id)?.name ?? `#${id}`;
  const item = (id: number) => items.find((i) => i.id === id);

  function openAdd() {
    setEditingId(null);
    form.setFieldsValue(emptyForm());
    setModalOpen(true);
  }

  function openEdit(o: Order) {
    setEditingId(o.id);
    form.setFieldsValue({
      hotelId: o.hotelId,
      deliveryDate: o.deliveryDate ? dayjs(o.deliveryDate) : null,
      status: o.status,
      notes: o.notes ?? "",
      lines: o.items.map((l) => ({
        itemId: l.itemId,
        quantity: l.quantity,
        deliveredQuantity: l.deliveredQuantity,
      })),
    });
    setModalOpen(true);
  }

  async function handleFinish(values: FormValues) {
    if (values.hotelId == null) return;
    setSaving(true);
    try {
      const body = {
        hotelId: values.hotelId,
        deliveryDate: values.deliveryDate?.format(DATE_FMT),
        status: values.status,
        notes: values.notes ?? "",
        items: values.lines.map((l) => ({
          itemId: l.itemId,
          quantity: l.quantity,
          deliveredQuantity: l.deliveredQuantity,
          notes: null,
        })),
      };
      const res = await api(
        editingId ? `/api/orders/${editingId}` : "/api/orders",
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
      messageApi.success(editingId ? "Order updated" : "Order created");
      setModalOpen(false);
      form.resetFields();
      load();
    } catch {
      messageApi.error("Cannot reach the server");
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(o: Order, status: string) {
    await api(`/api/orders/${o.id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    messageApi.success(`Status → ${status}`);
    load();
  }

  function openCopy(o: Order) {
    setCopyTarget(o);
    setCopyDate(dayjs());
    setCopyOpen(true);
  }

  async function submitCopy() {
    if (!copyTarget || !copyDate) return;
    setCopying(true);
    try {
      const res = await api(
        `/api/orders/${copyTarget.id}/copy?deliveryDate=${copyDate.format(DATE_FMT)}`,
        { method: "POST" },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        messageApi.error(data?.message ?? "Could not copy");
        return;
      }
      messageApi.success("Order copied");
      setCopyOpen(false);
      load();
    } finally {
      setCopying(false);
    }
  }

  async function remove(o: Order) {
    await api(`/api/orders/${o.id}`, { method: "DELETE" });
    messageApi.success("Order deleted");
    load();
  }

  const activeHotels = hotels.filter((h) => h.active);

  const columns: ColumnsType<Order> = [
    {
      title: "#",
      dataIndex: "id",
      key: "id",
      width: 70,
      sorter: (a, b) => a.id - b.id,
      render: (id: number) => (
        <Text type="secondary" style={{ fontSize: 13 }}>
          #{id}
        </Text>
      ),
    },
    {
      title: "Hotel",
      dataIndex: "hotelId",
      key: "hotel",
      sorter: (a, b) =>
        hotelName(a.hotelId).localeCompare(hotelName(b.hotelId)),
      render: (id: number) => (
        <span style={{ fontWeight: 500 }}>{hotelName(id)}</span>
      ),
    },
    {
      title: "Delivery",
      dataIndex: "deliveryDate",
      key: "deliveryDate",
      width: 130,
      sorter: (a, b) => a.deliveryDate.localeCompare(b.deliveryDate),
      render: (d: string) => <Tag color="blue">{d}</Tag>,
    },
    {
      title: "Items",
      key: "items",
      render: (_, o) => {
        const preview = o.items.slice(0, 3);
        const rest = o.items.length - preview.length;
        return (
          <Space size={4} wrap>
            {preview.map((l, i) => (
              <Tag key={i} style={{ margin: 0 }}>
                {item(l.itemId)?.name ?? `#${l.itemId}`} × {l.quantity}
              </Tag>
            ))}
            {rest > 0 && (
              <Tooltip
                title={o.items
                  .slice(3)
                  .map(
                    (l) =>
                      `${item(l.itemId)?.name ?? "#" + l.itemId} × ${l.quantity}`,
                  )
                  .join(", ")}
              >
                <Tag color="default">+{rest} more</Tag>
              </Tooltip>
            )}
          </Space>
        );
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 170,
      filters: STATUSES.map((s) => ({ text: s, value: s })),
      onFilter: (value, record) => record.status === value,
      render: (status: string, record) => (
        <Select
          size="small"
          value={status}
          style={{ width: 140 }}
          onChange={(v) => changeStatus(record, v)}
          options={STATUSES.map((s) => ({
            value: s,
            label: <Tag color={STATUS_COLORS[s]}>{s}</Tag>,
          }))}
        />
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 220,
      align: "right",
      render: (_, record) => (
        <Space size="small">
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEdit(record)}
          >
            Edit
          </Button>
          <Button
            size="small"
            icon={<CopyOutlined />}
            onClick={() => openCopy(record)}
          >
            Copy
          </Button>
          <Popconfirm
            title="Delete this order?"
            description="This cannot be undone."
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
            onConfirm={() => remove(record)}
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const shoppingColumns: ColumnsType<ShoppingLine> = [
    {
      title: "Item",
      dataIndex: "name",
      key: "name",
      render: (v: string) => <span style={{ fontWeight: 500 }}>{v}</span>,
    },
    {
      title: "Type",
      dataIndex: "category",
      key: "category",
      width: 130,
      filters: [
        { text: "Vegetable", value: "VEGETABLE" },
        { text: "Fruit", value: "FRUIT" },
      ],
      onFilter: (value, record) => record.category === value,
      render: (c: string) => (
        <Tag color={c === "FRUIT" ? "orange" : "green"}>
          {c === "FRUIT" ? "Fruit" : "Vegetable"}
        </Tag>
      ),
    },
    {
      title: "Total",
      dataIndex: "total",
      key: "total",
      align: "right",
      width: 160,
      sorter: (a, b) => a.total - b.total,
      render: (v: number, r) => (
        <span style={{ fontWeight: 600, color: "#16a34a" }}>
          {Number(v).toLocaleString()}{" "}
          <span style={{ color: "#9ca3af", fontWeight: 400 }}>{r.unit}</span>
        </span>
      ),
    },
  ];

  return (
    <div>
      {contextHolder}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Orders
          </Title>
          <Text type="secondary">
            Create, track and copy hotel delivery orders.
          </Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
          New order
        </Button>
      </div>

      <Card
        style={{
          marginBottom: 16,
          borderRadius: 12,
          border: "1px solid #eef0f3",
        }}
        styles={{ body: { padding: 16 } }}
      >
        <Space wrap size="middle">
          <div>
            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>
              Delivery date
            </div>
            <DatePicker
              value={filterDate}
              onChange={(v) => setFilterDate(v)}
              format={DATE_FMT}
              allowClear
              placeholder="All dates"
              style={{ width: 180 }}
              suffixIcon={<CalendarOutlined />}
            />
          </div>

          <div>
            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>
              Status
            </div>
            <Select
              value={filterStatus || undefined}
              onChange={(v) => setFilterStatus(v ?? "")}
              allowClear
              placeholder="All statuses"
              style={{ width: 180 }}
              options={STATUSES.map((s) => ({
                value: s,
                label: s,
              }))}
            />
          </div>

          <Button
            onClick={() => {
              setFilterDate(dayjs());
              setFilterStatus("");
            }}
          >
            Reset to today
          </Button>
        </Space>
      </Card>

      {filterDate && (
        <Card
          title={
            <Space>
              <ShoppingOutlined />
              <span>Shopping list · {filterDate.format(DATE_FMT)}</span>
            </Space>
          }
          extra={
            <Tag color={shopping.length ? "green" : "default"}>
              {shopping.length} item{shopping.length === 1 ? "" : "s"}
            </Tag>
          }
          style={{
            marginBottom: 16,
            borderRadius: 12,
            border: "1px solid #eef0f3",
          }}
          styles={{ body: { padding: shopping.length ? 0 : 32 } }}
        >
          {shopping.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="Nothing to buy for this date."
            />
          ) : (
            <Table<ShoppingLine>
              rowKey="itemId"
              columns={shoppingColumns}
              dataSource={shopping}
              pagination={false}
              size="small"
            />
          )}
        </Card>
      )}

      <Table<Order>
        rowKey="id"
        columns={columns}
        dataSource={orders}
        pagination={{ pageSize: 10, showSizeChanger: true }}
        scroll={{ x: 1000 }}
        locale={{ emptyText: "No orders found" }}
        style={{
          background: "#fff",
          borderRadius: 12,
          overflow: "hidden",
        }}
        rowClassName={(r) =>
          r.status === "CANCELLED" ? "order-cancelled" : ""
        }
      />

      <Modal
        open={modalOpen}
        title={editingId ? `Edit order #${editingId}` : "New order"}
        okText={editingId ? "Update" : "Create order"}
        confirmLoading={saving}
        onCancel={() => {
          setModalOpen(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        width={780}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={emptyForm()}
          onFinish={handleFinish}
          preserve={false}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: editingId ? "1fr 1fr 1fr" : "1fr 1fr",
              gap: 12,
            }}
          >
            <Form.Item
              name="hotelId"
              label="Hotel"
              rules={[{ required: true, message: "Select a hotel" }]}
            >
              <Select
                showSearch
                placeholder="Select a hotel..."
                optionFilterProp="label"
                suffixIcon={<ShopOutlined />}
                options={hotels
                  .filter(
                    (h) =>
                      h.active ||
                      String(h.id) === String(form.getFieldValue("hotelId")),
                  )
                  .map((h) => ({ value: h.id, label: h.name }))}
              />
            </Form.Item>

            <Form.Item
              name="deliveryDate"
              label="Delivery date"
              rules={[{ required: true, message: "Pick a date" }]}
            >
              <DatePicker
                style={{ width: "100%" }}
                format={DATE_FMT}
                suffixIcon={<CalendarOutlined />}
              />
            </Form.Item>

            {editingId && (
              <Form.Item name="status" label="Status">
                <Select
                  options={STATUSES.map((s) => ({ value: s, label: s }))}
                />
              </Form.Item>
            )}
          </div>

          <Divider style={{ margin: "8px 0 16px" }}>
            <span style={{ fontSize: 13, color: "#6b7280" }}>Items</span>
          </Divider>

          <Form.List name="lines">
            {(fields, { add, remove }) => (
              <>
                {fields.map((field) => (
                  <div
                    key={field.key}
                    style={{
                      display: "grid",
                      gridTemplateColumns: editingId
                        ? "1fr 140px 140px 40px"
                        : "1fr 140px 40px",
                      gap: 8,
                      alignItems: "start",
                      marginBottom: 8,
                    }}
                  >
                    <Form.Item
                      name={[field.name, "itemId"]}
                      rules={[{ required: true, message: "Select an item" }]}
                      style={{ marginBottom: 0 }}
                    >
                      <Select
                        showSearch
                        placeholder="Select an item..."
                        optionFilterProp="label"
                        options={items
                          .filter(
                            (it) =>
                              it.active ||
                              String(it.id) ===
                                String(
                                  form.getFieldValue([
                                    "lines",
                                    field.name,
                                    "itemId",
                                  ]),
                                ),
                          )
                          .map((it) => ({
                            value: it.id,
                            label: `${it.name} (${it.unit})`,
                          }))}
                      />
                    </Form.Item>

                    <Form.Item
                      name={[field.name, "quantity"]}
                      rules={[{ required: true, message: "Qty" }]}
                      style={{ marginBottom: 0 }}
                    >
                      <InputNumber
                        placeholder="Quantity"
                        min={0}
                        step={0.001}
                        style={{ width: "100%" }}
                      />
                    </Form.Item>

                    {editingId && (
                      <Form.Item
                        name={[field.name, "deliveredQuantity"]}
                        style={{ marginBottom: 0 }}
                      >
                        <InputNumber
                          placeholder="Delivered"
                          min={0}
                          step={0.001}
                          style={{ width: "100%" }}
                        />
                      </Form.Item>
                    )}

                    <Button
                      type="text"
                      danger
                      icon={<MinusCircleOutlined />}
                      onClick={() => remove(field.name)}
                      disabled={fields.length === 1}
                    />
                  </div>
                ))}
                <Button
                  type="dashed"
                  block
                  icon={<PlusOutlined />}
                  onClick={() => add(emptyLine)}
                  style={{ marginTop: 8 }}
                >
                  Add item
                </Button>
              </>
            )}
          </Form.List>

          <Form.Item
            name="notes"
            label="Notes (optional)"
            style={{ marginTop: 16 }}
          >
            <Input.TextArea
              placeholder="Anything worth remembering"
              autoSize={{ minRows: 2, maxRows: 4 }}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={copyOpen}
        title={`Copy order #${copyTarget?.id ?? ""}`}
        okText="Copy"
        confirmLoading={copying}
        onCancel={() => setCopyOpen(false)}
        onOk={submitCopy}
        width={400}
        destroyOnClose
      >
        <Text type="secondary">
          A new order will be created with the same items and notes, for the
          date below.
        </Text>
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>
            New delivery date
          </div>
          <DatePicker
            value={copyDate}
            onChange={(v) => setCopyDate(v)}
            format={DATE_FMT}
            style={{ width: "100%" }}
            suffixIcon={<CalendarOutlined />}
          />
        </div>
      </Modal>

      <style>{`
        .order-cancelled td { opacity: 0.55; }
        .order-cancelled:hover td { opacity: 0.75; }
      `}</style>
    </div>
  );
}
