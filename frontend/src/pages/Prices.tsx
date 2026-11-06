import { useEffect, useState } from "react";
import {
  Button,
  Card,
  DatePicker,
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
  Empty,
  Divider,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  ShopOutlined,
  DollarOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { api } from "../lib/api";

const { Title, Text } = Typography;

type Hotel = { id: number; name: string; active: boolean };
type Item = { id: number; name: string; unit: string; active: boolean };
type Price = {
  id: number;
  hotelId: number;
  itemId: number;
  price: number;
  validFrom: string;
  validTo: string | null;
  notes: string | null;
};

type FormValues = {
  itemId: number | null;
  price: number | null;
  validFrom: Dayjs | null;
  validTo: Dayjs | null;
  notes?: string;
};

const emptyForm: FormValues = {
  itemId: null,
  price: null,
  validFrom: null,
  validTo: null,
  notes: "",
};

const DATE_FMT = "YYYY-MM-DD";

export default function Prices() {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [hotelId, setHotelId] = useState<number | null>(null);
  const [prices, setPrices] = useState<Price[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm<FormValues>();
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

  async function loadPrices(id: number | null) {
    if (id == null) {
      setPrices([]);
      return;
    }
    const res = await api(`/api/prices?hotelId=${id}`);
    if (res.ok) setPrices(await res.json());
  }

  useEffect(() => {
    loadPrices(hotelId);
  }, [hotelId]);

  const itemById = (id: number) => items.find((i) => i.id === id);

  function openAdd() {
    setEditingId(null);
    form.setFieldsValue({ ...emptyForm, validFrom: dayjs() });
    setModalOpen(true);
  }

  function openEdit(p: Price) {
    setEditingId(p.id);
    form.setFieldsValue({
      itemId: p.itemId,
      price: p.price,
      validFrom: p.validFrom ? dayjs(p.validFrom) : null,
      validTo: p.validTo ? dayjs(p.validTo) : null,
      notes: p.notes ?? "",
    });
    setModalOpen(true);
  }

  async function handleFinish(values: FormValues) {
    if (hotelId == null) return;
    setSaving(true);
    try {
      const body = {
        hotelId,
        itemId: values.itemId,
        price: values.price,
        validFrom: values.validFrom?.format(DATE_FMT) ?? null,
        validTo: values.validTo?.format(DATE_FMT) ?? null,
        notes: values.notes ?? "",
      };
      const res = await api(
        editingId ? `/api/prices/${editingId}` : "/api/prices",
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
      messageApi.success(editingId ? "Price updated" : "Price added");
      setModalOpen(false);
      form.resetFields();
      loadPrices(hotelId);
    } catch {
      messageApi.error("Cannot reach the server");
    } finally {
      setSaving(false);
    }
  }

  async function remove(p: Price) {
    await api(`/api/prices/${p.id}`, { method: "DELETE" });
    messageApi.success("Price deleted");
    loadPrices(hotelId);
  }

  const columns: ColumnsType<Price> = [
    {
      title: "Item",
      dataIndex: "itemId",
      key: "item",
      sorter: (a, b) =>
        (itemById(a.itemId)?.name ?? "").localeCompare(
          itemById(b.itemId)?.name ?? "",
        ),
      render: (id: number) => {
        const item = itemById(id);
        return (
          <Space>
            <span style={{ fontWeight: 500 }}>{item?.name ?? `#${id}`}</span>
            {item && <Tag color="default">{item.unit}</Tag>}
          </Space>
        );
      },
    },
    {
      title: "Price",
      dataIndex: "price",
      key: "price",
      width: 160,
      align: "right",
      sorter: (a, b) => Number(a.price) - Number(b.price),
      render: (v: number, record) => {
        const item = itemById(record.itemId);
        return (
          <span style={{ fontWeight: 600, color: "#16a34a" }}>
            Rs {Number(v).toLocaleString()}
            {item && (
              <span style={{ color: "#9ca3af", fontWeight: 400 }}>
                {" "}
                / {item.unit}
              </span>
            )}
          </span>
        );
      },
    },
    {
      title: "Valid from",
      dataIndex: "validFrom",
      key: "validFrom",
      width: 140,
      sorter: (a, b) => a.validFrom.localeCompare(b.validFrom),
      render: (v: string) => <Tag color="blue">{v}</Tag>,
    },
    {
      title: "Valid to",
      dataIndex: "validTo",
      key: "validTo",
      width: 140,
      render: (v: string | null) =>
        v ? (
          <Tag color="orange">{v}</Tag>
        ) : (
          <span style={{ color: "#9ca3af" }}>Until changed</span>
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
      title: "Actions",
      key: "actions",
      width: 170,
      align: "right",
      render: (_, record) => (
        <Space size="small">
          <Button size="small" onClick={() => openEdit(record)}>
            Edit
          </Button>
          <Popconfirm
            title="Delete this price?"
            description="This cannot be undone."
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
            onConfirm={() => remove(record)}
          >
            <Button size="small" danger>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const selectedHotel = hotels.find((h) => h.id === hotelId);

  return (
    <div>
      {contextHolder}

      <Title level={3} style={{ marginTop: 0, marginBottom: 4 }}>
        Hotel prices
      </Title>
      <Text type="secondary">
        Set per-item pricing for each hotel, with optional validity windows.
      </Text>

      <Card
        style={{
          marginTop: 16,
          marginBottom: 16,
          borderRadius: 12,
          border: "1px solid #eef0f3",
        }}
        styles={{ body: { padding: 20 } }}
      >
        <Space wrap size="middle">
          <div>
            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>
              Hotel
            </div>
            <Select
              showSearch
              allowClear
              placeholder="Select a hotel..."
              style={{ minWidth: 280 }}
              value={hotelId ?? undefined}
              onChange={(v) => setHotelId(v ?? null)}
              suffixIcon={<ShopOutlined />}
              optionFilterProp="label"
              options={hotels
                .filter((h) => h.active)
                .map((h) => ({ value: h.id, label: h.name }))}
            />
          </div>

          {hotelId != null && (
            <>
              <Divider type="vertical" style={{ height: 40 }} />
              <Button type="primary" onClick={openAdd}>
                + Add price
              </Button>
              <Text type="secondary" style={{ fontSize: 13 }}>
                {prices.length} price{prices.length === 1 ? "" : "s"} for{" "}
                <b>{selectedHotel?.name ?? "this hotel"}</b>
              </Text>
            </>
          )}
        </Space>
      </Card>

      {hotelId == null ? (
        <Card
          style={{ borderRadius: 12, border: "1px solid #eef0f3" }}
          styles={{ body: { padding: 48 } }}
        >
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Space direction="vertical" size={2}>
                <Text strong>Select a hotel to view its prices</Text>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Pick a hotel above to see the price list or add new prices.
                </Text>
              </Space>
            }
          />
        </Card>
      ) : (
        <Table<Price>
          rowKey="id"
          columns={columns}
          dataSource={prices}
          pagination={{ pageSize: 10, showSizeChanger: true }}
          scroll={{ x: 900 }}
          locale={{ emptyText: "No prices for this hotel yet" }}
          style={{
            background: "#fff",
            borderRadius: 12,
            overflow: "hidden",
          }}
        />
      )}

      <Modal
        open={modalOpen}
        title={editingId ? "Edit price" : "Add price"}
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
            name="itemId"
            label="Item"
            rules={[{ required: true, message: "Select an item" }]}
          >
            <Select
              showSearch
              placeholder="Select an item..."
              optionFilterProp="label"
              options={items
                .filter(
                  (i) =>
                    i.active ||
                    String(i.id) === String(form.getFieldValue("itemId")),
                )
                .map((i) => ({
                  value: i.id,
                  label: `${i.name} (${i.unit})`,
                }))}
            />
          </Form.Item>

          <Form.Item
            name="price"
            label="Price per unit (Rs)"
            rules={[{ required: true, message: "Enter a price" }]}
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

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}
          >
            <Form.Item
              name="validFrom"
              label="Valid from"
              rules={[{ required: true, message: "Pick a start date" }]}
            >
              <DatePicker
                style={{ width: "100%" }}
                format={DATE_FMT}
                suffixIcon={<CalendarOutlined />}
              />
            </Form.Item>

            <Form.Item
              name="validTo"
              label="Valid to"
              tooltip='Leave empty for "until changed"'
            >
              <DatePicker
                style={{ width: "100%" }}
                format={DATE_FMT}
                suffixIcon={<CalendarOutlined />}
                placeholder="Until changed"
              />
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
    </div>
  );
}
