"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { OrderStatus, OrderWithItems, Product } from "@/lib/mock-data";

// ─── 定数 ─────────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "未確認",
  confirmed: "確認済み",
  shipped: "発送済み",
  delivered: "配達済み",
  cancelled: "キャンセル",
};

const STATUS_VARIANTS: Record<
  OrderStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  pending: "outline",
  confirmed: "default",
  shipped: "secondary",
  delivered: "secondary",
  cancelled: "destructive",
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: "text-yellow-600 border-yellow-400",
  confirmed: "bg-blue-500 text-white border-blue-500",
  shipped: "bg-purple-500 text-white border-purple-500",
  delivered: "bg-green-500 text-white border-green-500",
  cancelled: "",
};

const NEXT_STATUSES: Partial<Record<OrderStatus, OrderStatus[]>> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["cancelled"],
  shipped: ["delivered"],
};

const CARRIERS = ["ヤマト運輸", "佐川急便", "日本郵便", "その他"];

// ─── 型 ───────────────────────────────────────────────────────────────────────

type Props = {
  orders: OrderWithItems[];
  products: Product[];
};

type OrderLine = {
  id: string;
  product_id: string;
  quantity: string;
};

// ─── ユーティリティ ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge variant={STATUS_VARIANTS[status]} className={STATUS_COLORS[status]}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}

function fmt(amount: number) {
  return `¥${amount.toLocaleString()}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

// ─── 新規受注ダイアログ ────────────────────────────────────────────────────────

function NewOrderDialog({
  open,
  onClose,
  products,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  products: Product[];
  onCreated: () => void;
}) {
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [lines, setLines] = useState<OrderLine[]>([
    { id: "1", product_id: "", quantity: "1" },
  ]);
  const [submitting, setSubmitting] = useState(false);

  const addLine = () =>
    setLines((prev) => [
      ...prev,
      { id: String(Date.now()), product_id: "", quantity: "1" },
    ]);

  const removeLine = (id: string) =>
    setLines((prev) => prev.filter((l) => l.id !== id));

  const updateLine = (
    id: string,
    field: keyof Omit<OrderLine, "id">,
    val: string,
  ) =>
    setLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, [field]: val } : l)),
    );

  const subtotal = lines.reduce((sum, l) => {
    const p = products.find((p) => String(p.id) === l.product_id);
    const qty = Number(l.quantity);
    return sum + (p ? p.unit_price * (isNaN(qty) ? 0 : qty) : 0);
  }, 0);

  const isValid =
    customerName.trim() !== "" &&
    customerEmail.trim() !== "" &&
    lines.length > 0 &&
    lines.every(
      (l) =>
        l.product_id !== "" &&
        Number.isInteger(Number(l.quantity)) &&
        Number(l.quantity) > 0,
    );

  const handleClose = () => {
    setCustomerName("");
    setCustomerEmail("");
    setLines([{ id: "1", product_id: "", quantity: "1" }]);
    onClose();
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: customerName,
          customer_email: customerEmail,
          items: lines.map((l) => ({
            product_id: Number(l.product_id),
            quantity: Number(l.quantity),
          })),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "受注の作成に失敗しました");
      }
      toast.success("受注を作成しました");
      handleClose();
      onCreated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "受注の作成に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>新規受注</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>顧客名 *</Label>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="山田 太郎"
              />
            </div>
            <div className="space-y-1.5">
              <Label>メールアドレス *</Label>
              <Input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="example@email.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>商品</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addLine}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                商品を追加
              </Button>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>商品</TableHead>
                    <TableHead className="w-24">数量</TableHead>
                    <TableHead className="text-right w-28">単価</TableHead>
                    <TableHead className="text-right w-28">小計</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line) => {
                    const product = products.find(
                      (p) => String(p.id) === line.product_id,
                    );
                    const qty = Number(line.quantity);
                    const lineTotal = product
                      ? product.unit_price * (isNaN(qty) ? 0 : qty)
                      : 0;
                    return (
                      <TableRow key={line.id}>
                        <TableCell className="py-2">
                          <Select
                            value={line.product_id}
                            onValueChange={(v) =>
                              updateLine(line.id, "product_id", v)
                            }
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue placeholder="商品を選択" />
                            </SelectTrigger>
                            <SelectContent>
                              {products.map((p) => (
                                <SelectItem key={p.id} value={String(p.id)}>
                                  {p.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="py-2">
                          <Input
                            type="number"
                            min={1}
                            step={1}
                            value={line.quantity}
                            onChange={(e) =>
                              updateLine(line.id, "quantity", e.target.value)
                            }
                            className="h-8 w-20"
                          />
                        </TableCell>
                        <TableCell className="py-2 text-right text-sm">
                          {product ? fmt(product.unit_price) : "—"}
                        </TableCell>
                        <TableCell className="py-2 text-right text-sm font-medium">
                          {product && !isNaN(qty) && qty > 0
                            ? fmt(lineTotal)
                            : "—"}
                        </TableCell>
                        <TableCell className="py-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => removeLine(line.id)}
                            disabled={lines.length === 1}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end text-sm font-semibold pr-2">
              合計: {fmt(subtotal)}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={submitting}>
            キャンセル
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !isValid}>
            {submitting ? "作成中..." : "受注を作成"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── 発送処理ダイアログ ────────────────────────────────────────────────────────

function ShipDialog({
  order,
  onClose,
  onShipped,
}: {
  order: OrderWithItems | null;
  onClose: () => void;
  onShipped: () => void;
}) {
  const [carrier, setCarrier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleClose = () => {
    setCarrier("");
    setTrackingNumber("");
    onClose();
  };

  const handleSubmit = async () => {
    if (!order) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/ship`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          carrier,
          tracking_number: trackingNumber,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "発送処理に失敗しました");
      }
      toast.success("発送処理が完了しました");
      handleClose();
      onShipped();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "発送処理に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={!!order} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>発送処理 — {order?.order_number}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>配送業者</Label>
            <Select value={carrier} onValueChange={setCarrier}>
              <SelectTrigger>
                <SelectValue placeholder="配送業者を選択..." />
              </SelectTrigger>
              <SelectContent>
                {CARRIERS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>追跡番号</Label>
            <Input
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="1234-5678-9012"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={submitting}>
            キャンセル
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              submitting || carrier === "" || trackingNumber.trim() === ""
            }
          >
            {submitting ? "処理中..." : "発送確定"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── 受注詳細モーダル ──────────────────────────────────────────────────────────

function OrderDetailDialog({
  order,
  products,
  onClose,
  onStatusChanged,
  onShipClick,
}: {
  order: OrderWithItems | null;
  products: Product[];
  onClose: () => void;
  onStatusChanged: () => void;
  onShipClick: (order: OrderWithItems) => void;
}) {
  const [changingStatus, setChangingStatus] = useState(false);

  const handleStatusChange = async (newStatus: OrderStatus) => {
    if (!order) return;
    setChangingStatus(true);
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "ステータス変更に失敗しました");
      }
      toast.success(
        `ステータスを「${STATUS_LABELS[newStatus]}」に変更しました`,
      );
      onStatusChanged();
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "ステータス変更に失敗しました",
      );
    } finally {
      setChangingStatus(false);
    }
  };

  if (!order) return null;

  const nextStatuses = NEXT_STATUSES[order.status] ?? [];

  return (
    <Dialog open={!!order} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>受注詳細 — {order.order_number}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* 基本情報 */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">顧客名</p>
              <p className="font-medium">{order.customer_name}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">メール</p>
              <p className="font-medium">{order.customer_email}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">受注日</p>
              <p className="font-medium">{fmtDate(order.created_at)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">ステータス</p>
              <StatusBadge status={order.status} />
            </div>
          </div>

          {/* 受注明細 */}
          <div>
            <p className="text-sm font-semibold mb-2">受注明細</p>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>商品</TableHead>
                    <TableHead className="text-right w-20">単価</TableHead>
                    <TableHead className="text-right w-16">数量</TableHead>
                    <TableHead className="text-right w-28">小計</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item) => {
                    const product = products.find(
                      (p) => p.id === item.product_id,
                    );
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            {product?.name ?? `商品 #${item.product_id}`}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {product?.sku ?? ""}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {fmt(item.unit_price)}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.quantity}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {fmt(item.unit_price * item.quantity)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end gap-8 text-sm mt-2 pr-2">
              {order.discount_amount > 0 && (
                <>
                  <span className="text-muted-foreground">
                    小計: {fmt(order.subtotal)}
                  </span>
                  <span className="text-muted-foreground">
                    割引: -{fmt(order.discount_amount)}
                  </span>
                </>
              )}
              <span className="font-semibold">
                合計: {fmt(order.total_amount)}
              </span>
            </div>
          </div>

          {/* ステータス変更 */}
          {nextStatuses.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold">ステータス変更</p>
              <div className="flex flex-wrap gap-2">
                {nextStatuses.map((s) => (
                  <Button
                    key={s}
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusChange(s)}
                    disabled={changingStatus}
                  >
                    {STATUS_LABELS[s]} へ変更
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* 発送処理ボタン */}
          {order.status === "confirmed" && (
            <Button
              className="w-full"
              onClick={() => {
                onClose();
                onShipClick(order);
              }}
            >
              発送処理を行う
            </Button>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            閉じる
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── メインコンポーネント ──────────────────────────────────────────────────────

const STATUS_FILTER_TABS: Array<{ value: OrderStatus | "all"; label: string }> =
  [
    { value: "all", label: "すべて" },
    { value: "pending", label: "未確認" },
    { value: "confirmed", label: "確認済み" },
    { value: "shipped", label: "発送済み" },
    { value: "delivered", label: "配達済み" },
    { value: "cancelled", label: "キャンセル" },
  ];

export function OrdersClient({ orders, products }: Props) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [newOrderOpen, setNewOrderOpen] = useState(false);
  const [detailOrder, setDetailOrder] = useState<OrderWithItems | null>(null);
  const [shipOrder, setShipOrder] = useState<OrderWithItems | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return orders
      .filter((o) => statusFilter === "all" || o.status === statusFilter)
      .filter(
        (o) =>
          q === "" ||
          o.customer_name.toLowerCase().includes(q) ||
          o.order_number.toLowerCase().includes(q),
      )
      .slice()
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [orders, statusFilter, search]);

  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">受注管理</h1>
        <Button onClick={() => setNewOrderOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          新規受注
        </Button>
      </div>

      {/* フィルター */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <Input
          placeholder="顧客名・受注番号で検索..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:w-64"
        />
        <Tabs
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
        >
          <TabsList className="h-9">
            {STATUS_FILTER_TABS.map((t) => (
              <TabsTrigger
                key={t.value}
                value={t.value}
                className="text-xs px-2.5"
              >
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* 一覧テーブル */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>受注番号</TableHead>
              <TableHead>顧客名</TableHead>
              <TableHead className="hidden sm:table-cell">ステータス</TableHead>
              <TableHead className="hidden md:table-cell text-right">
                合計金額
              </TableHead>
              <TableHead className="hidden md:table-cell">受注日</TableHead>
              <TableHead className="hidden lg:table-cell">商品数</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-8 text-muted-foreground"
                >
                  該当する受注がありません
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-sm">
                    {order.order_number}
                  </TableCell>
                  <TableCell className="font-medium">
                    {order.customer_name}
                    <div className="text-xs text-muted-foreground sm:hidden">
                      <StatusBadge status={order.status} />
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <StatusBadge status={order.status} />
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-right">
                    {fmt(order.total_amount)}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {fmtDate(order.created_at)}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {order.items.length} 点
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDetailOrder(order)}
                      >
                        詳細
                      </Button>
                      {order.status === "confirmed" && (
                        <Button size="sm" onClick={() => setShipOrder(order)}>
                          発送
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <p className="mt-2 text-sm text-muted-foreground">
        {filtered.length} / {orders.length} 件
      </p>

      {/* ダイアログ群 */}
      <NewOrderDialog
        open={newOrderOpen}
        onClose={() => setNewOrderOpen(false)}
        products={products}
        onCreated={refresh}
      />

      <OrderDetailDialog
        order={detailOrder}
        products={products}
        onClose={() => setDetailOrder(null)}
        onStatusChanged={() => {
          setDetailOrder(null);
          refresh();
        }}
        onShipClick={(o) => setShipOrder(o)}
      />

      <ShipDialog
        order={shipOrder}
        onClose={() => setShipOrder(null)}
        onShipped={() => {
          setShipOrder(null);
          refresh();
        }}
      />
    </div>
  );
}
