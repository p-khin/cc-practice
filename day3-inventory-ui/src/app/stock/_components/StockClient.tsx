"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Check,
  ChevronsUpDown,
  PackageCheck,
  PackageMinus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  Product,
  StockWithProduct,
  Warehouse,
  StockMovementWithDetails,
} from "@/lib/mock-data";

type Props = {
  products: Product[];
  stocks: StockWithProduct[];
  warehouses: Warehouse[];
};

type MovementForm = {
  productId: string;
  warehouseId: string;
  quantity: string;
  memo: string;
};

const emptyForm: MovementForm = {
  productId: "",
  warehouseId: "",
  quantity: "",
  memo: "",
};

type HistoryFilters = {
  from: string;
  to: string;
  productId: string;
  warehouseId: string;
  type: "all" | "in" | "out";
};

const defaultFilters: HistoryFilters = {
  from: "",
  to: "",
  productId: "all",
  warehouseId: "all",
  type: "all",
};

const PER_PAGE = 10;

function ProductCombobox({
  value,
  onChange,
  products,
}: {
  value: string;
  onChange: (val: string) => void;
  products: Product[];
}) {
  const [open, setOpen] = useState(false);
  const selected = products.find((p) => String(p.id) === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {selected ? `${selected.name} (${selected.sku})` : "商品を選択..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="商品名・SKUで検索..." />
          <CommandList>
            <CommandEmpty>商品が見つかりません</CommandEmpty>
            <CommandGroup>
              {products.map((product) => (
                <CommandItem
                  key={product.id}
                  value={`${product.name} ${product.sku}`}
                  onSelect={() => {
                    onChange(String(product.id));
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === String(product.id)
                        ? "opacity-100"
                        : "opacity-0",
                    )}
                  />
                  <span className="font-medium">{product.name}</span>
                  <span className="ml-2 text-sm text-muted-foreground">
                    {product.sku}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function MovementForm({
  type,
  form,
  setForm,
  products,
  warehouses,
  stocks,
  submitting,
  onSubmit,
}: {
  type: "in" | "out";
  form: MovementForm;
  setForm: React.Dispatch<React.SetStateAction<MovementForm>>;
  products: Product[];
  warehouses: Warehouse[];
  stocks: StockWithProduct[];
  submitting: boolean;
  onSubmit: () => void;
}) {
  const currentStock = stocks.find(
    (s) => s.product_id === Number(form.productId),
  )?.quantity;
  const qty = Number(form.quantity);
  const outOfStock =
    type === "out" &&
    form.quantity !== "" &&
    currentStock !== undefined &&
    qty > currentStock;

  const handleChange = (field: keyof MovementForm) => (val: string) =>
    setForm((prev) => ({ ...prev, [field]: val }));

  const isValid =
    form.productId !== "" &&
    form.warehouseId !== "" &&
    form.quantity !== "" &&
    Number.isInteger(qty) &&
    qty > 0 &&
    !outOfStock;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>商品</Label>
        <ProductCombobox
          value={form.productId}
          onChange={handleChange("productId")}
          products={products}
        />
      </div>

      {type === "out" && form.productId && (
        <p className="text-sm text-muted-foreground">
          現在在庫:{" "}
          <span
            className={cn(
              "font-semibold",
              outOfStock ? "text-destructive" : "",
            )}
          >
            {currentStock ?? 0}
          </span>{" "}
          個
        </p>
      )}

      <div className="space-y-2">
        <Label>倉庫</Label>
        <Select
          value={form.warehouseId}
          onValueChange={handleChange("warehouseId")}
        >
          <SelectTrigger>
            <SelectValue placeholder="倉庫を選択..." />
          </SelectTrigger>
          <SelectContent>
            {warehouses.map((w) => (
              <SelectItem key={w.id} value={String(w.id)}>
                {w.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>数量</Label>
        <Input
          type="number"
          min={1}
          step={1}
          value={form.quantity}
          onChange={(e) => handleChange("quantity")(e.target.value)}
          placeholder="1"
        />
        {outOfStock && (
          <p className="text-sm text-destructive">
            在庫数（{currentStock}）を超えています
          </p>
        )}
        {form.quantity !== "" && (!Number.isInteger(qty) || qty <= 0) && (
          <p className="text-sm text-destructive">正の整数を入力してください</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>メモ（任意）</Label>
        <Input
          value={form.memo}
          onChange={(e) => handleChange("memo")(e.target.value)}
          placeholder="備考など"
        />
      </div>

      <Button
        className="w-full"
        onClick={onSubmit}
        disabled={submitting || !isValid}
      >
        {submitting ? "登録中..." : type === "in" ? "入庫登録" : "出庫登録"}
      </Button>
    </div>
  );
}

export function StockClient({ products, stocks, warehouses }: Props) {
  const router = useRouter();
  const [inForm, setInForm] = useState<MovementForm>(emptyForm);
  const [outForm, setOutForm] = useState<MovementForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const [movements, setMovements] = useState<StockMovementWithDetails[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<HistoryFilters>(defaultFilters);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchHistory = useCallback(async (f: HistoryFilters, p: number) => {
    setHistoryLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(p),
        per_page: String(PER_PAGE),
      });
      if (f.from) params.set("from", f.from);
      if (f.to) params.set("to", f.to);
      if (f.productId !== "all") params.set("product_id", f.productId);
      if (f.warehouseId !== "all") params.set("warehouse_id", f.warehouseId);
      if (f.type !== "all") params.set("type", f.type);

      const res = await fetch(`/api/stock-movements?${params}`);
      const json = await res.json();
      setMovements(json.data ?? []);
      setTotal(json.total ?? 0);
    } catch {
      toast.error("履歴の取得に失敗しました");
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory(filters, page);
  }, [filters, page, fetchHistory]);

  const handleSubmit = useCallback(
    async (type: "in" | "out") => {
      const form = type === "in" ? inForm : outForm;
      setSubmitting(true);
      try {
        const res = await fetch("/api/stock-movements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            product_id: Number(form.productId),
            warehouse_id: Number(form.warehouseId),
            type,
            quantity: Number(form.quantity),
            memo: form.memo || undefined,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error ?? "登録に失敗しました");
        }
        toast.success(
          type === "in" ? "入庫を登録しました" : "出庫を登録しました",
        );
        if (type === "in") setInForm(emptyForm);
        else setOutForm(emptyForm);
        router.refresh();
        setPage(1);
        fetchHistory(filters, 1);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "登録に失敗しました");
      } finally {
        setSubmitting(false);
      }
    },
    [inForm, outForm, router, fetchHistory, filters],
  );

  const setFilter =
    <K extends keyof HistoryFilters>(key: K) =>
    (val: HistoryFilters[K]) => {
      setFilters((f) => ({ ...f, [key]: val }));
      setPage(1);
    };

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const rangeStart = total === 0 ? 0 : (page - 1) * PER_PAGE + 1;
  const rangeEnd = Math.min(page * PER_PAGE, total);

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold mb-6">在庫操作</h1>

      <Tabs defaultValue="in">
        <TabsList className="mb-6">
          <TabsTrigger value="in" className="gap-1.5">
            <PackageCheck className="h-4 w-4" />
            入庫
          </TabsTrigger>
          <TabsTrigger value="out" className="gap-1.5">
            <PackageMinus className="h-4 w-4" />
            出庫
          </TabsTrigger>
          <TabsTrigger value="history">履歴</TabsTrigger>
        </TabsList>

        <TabsContent value="in">
          <div className="max-w-md">
            <h2 className="text-lg font-semibold mb-4">入庫登録</h2>
            <MovementForm
              type="in"
              form={inForm}
              setForm={setInForm}
              products={products}
              warehouses={warehouses}
              stocks={stocks}
              submitting={submitting}
              onSubmit={() => handleSubmit("in")}
            />
          </div>
        </TabsContent>

        <TabsContent value="out">
          <div className="max-w-md">
            <h2 className="text-lg font-semibold mb-4">出庫登録</h2>
            <MovementForm
              type="out"
              form={outForm}
              setForm={setOutForm}
              products={products}
              warehouses={warehouses}
              stocks={stocks}
              submitting={submitting}
              onSubmit={() => handleSubmit("out")}
            />
          </div>
        </TabsContent>

        <TabsContent value="history">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">入出庫履歴</h2>

            {/* フィルター */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5">
                <Label className="text-xs shrink-0">期間 From</Label>
                <Input
                  type="date"
                  value={filters.from}
                  onChange={(e) => setFilter("from")(e.target.value)}
                  className="h-8 w-36 text-sm"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <Label className="text-xs shrink-0">To</Label>
                <Input
                  type="date"
                  value={filters.to}
                  onChange={(e) => setFilter("to")(e.target.value)}
                  className="h-8 w-36 text-sm"
                />
              </div>
              <Select
                value={filters.productId}
                onValueChange={setFilter("productId")}
              >
                <SelectTrigger className="h-8 w-44 text-sm">
                  <SelectValue placeholder="商品" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべての商品</SelectItem>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filters.warehouseId}
                onValueChange={setFilter("warehouseId")}
              >
                <SelectTrigger className="h-8 w-36 text-sm">
                  <SelectValue placeholder="倉庫" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべての倉庫</SelectItem>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={String(w.id)}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filters.type}
                onValueChange={(v) =>
                  setFilter("type")(v as HistoryFilters["type"])
                }
              >
                <SelectTrigger className="h-8 w-28 text-sm">
                  <SelectValue placeholder="種別" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="in">入庫</SelectItem>
                  <SelectItem value="out">出庫</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-sm"
                onClick={() => {
                  setFilters(defaultFilters);
                  setPage(1);
                }}
              >
                リセット
              </Button>
            </div>

            {/* テーブル */}
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>日時</TableHead>
                    <TableHead>種別</TableHead>
                    <TableHead>商品</TableHead>
                    <TableHead>倉庫</TableHead>
                    <TableHead className="text-right">数量</TableHead>
                    <TableHead className="hidden md:table-cell">メモ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyLoading ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center py-8 text-muted-foreground"
                      >
                        読み込み中...
                      </TableCell>
                    </TableRow>
                  ) : movements.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center py-8 text-muted-foreground"
                      >
                        該当する履歴がありません
                      </TableCell>
                    </TableRow>
                  ) : (
                    movements.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="text-sm whitespace-nowrap">
                          {new Date(m.created_at).toLocaleString("ja-JP", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={m.type === "in" ? "default" : "secondary"}
                          >
                            {m.type === "in" ? "入庫" : "出庫"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{m.product_name}</div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {m.product_sku}
                          </div>
                        </TableCell>
                        <TableCell>{m.warehouse_name}</TableCell>
                        <TableCell className="text-right font-medium">
                          {m.quantity.toLocaleString()}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-xs truncate">
                          {m.memo ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* ページネーション */}
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {total} 件中 {rangeStart}〜{rangeEnd} 件
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page <= 1}
                >
                  前へ
                </Button>
                <span className="px-1">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= totalPages}
                >
                  次へ
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
