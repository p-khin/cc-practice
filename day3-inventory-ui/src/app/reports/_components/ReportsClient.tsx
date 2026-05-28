"use client";

import { useState, useMemo } from "react";
import { Download } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getDailySales,
  getInventoryValuation,
  getProductSales,
  toCSV,
  downloadCSV,
} from "@/lib/reports";
import type {
  OrderWithItems,
  Product,
  StockWithProduct,
} from "@/lib/mock-data";

// ─── 日付ユーティリティ ────────────────────────────────────────────────────────

function today() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function firstDayOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function fmt(v: number) {
  return `¥${v.toLocaleString()}`;
}

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  orders: OrderWithItems[];
  products: Product[];
  stocks: StockWithProduct[];
};

// ─── DateRangePicker ──────────────────────────────────────────────────────────

const QUICK_RANGES = [
  { label: "直近7日", from: () => daysAgo(6), to: today },
  { label: "直近30日", from: () => daysAgo(29), to: today },
  { label: "直近90日", from: () => daysAgo(89), to: today },
  { label: "今月", from: firstDayOfMonth, to: today },
] as const;

function DateRangePicker({
  from,
  to,
  onFromChange,
  onToChange,
}: {
  from: string;
  to: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-1.5">
        <Label className="text-xs shrink-0">From</Label>
        <Input
          type="date"
          value={from}
          max={to}
          onChange={(e) => onFromChange(e.target.value)}
          className="h-8 w-36 text-sm"
        />
      </div>
      <div className="flex items-center gap-1.5">
        <Label className="text-xs shrink-0">To</Label>
        <Input
          type="date"
          value={to}
          min={from}
          max={today()}
          onChange={(e) => onToChange(e.target.value)}
          className="h-8 w-36 text-sm"
        />
      </div>
      <div className="flex gap-1">
        {QUICK_RANGES.map((r) => (
          <Button
            key={r.label}
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => {
              onFromChange(r.from());
              onToChange(r.to());
            }}
          >
            {r.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

// ─── ReportsClient ────────────────────────────────────────────────────────────

export function ReportsClient({ orders, products, stocks }: Props) {
  const [from, setFrom] = useState(() => daysAgo(29));
  const [to, setTo] = useState(today);

  // 売上集計
  const dailySales = useMemo(
    () => getDailySales(orders, from, to),
    [orders, from, to],
  );
  const productSales = useMemo(
    () => getProductSales(orders, products, from, to),
    [orders, products, from, to],
  );
  const totalSales = useMemo(
    () => dailySales.reduce((s, d) => s + d.sales, 0),
    [dailySales],
  );
  const totalOrders = useMemo(
    () => dailySales.reduce((s, d) => s + d.orders, 0),
    [dailySales],
  );
  const avgOrderValue =
    totalOrders > 0 ? Math.round(totalSales / totalOrders) : 0;

  // 在庫評価
  const inventoryItems = useMemo(() => getInventoryValuation(stocks), [stocks]);
  const totalInventoryValue = useMemo(
    () => inventoryItems.reduce((s, i) => s + i.total_value, 0),
    [inventoryItems],
  );

  // CSV エクスポート
  const handleSalesCSV = () => {
    const rows = orders
      .filter((o) => o.created_at >= from && o.created_at <= `${to}T23:59:59Z`)
      .flatMap((o) =>
        o.items.map((item) => {
          const product = products.find((p) => p.id === item.product_id);
          return [
            o.order_number,
            o.customer_name,
            o.customer_email,
            o.status,
            product?.name ?? `商品 #${item.product_id}`,
            product?.sku ?? "",
            item.quantity,
            item.unit_price,
            item.unit_price * item.quantity,
            o.created_at.slice(0, 10),
          ] as (string | number)[];
        }),
      );
    const csv = toCSV(
      [
        "受注番号",
        "顧客名",
        "メール",
        "ステータス",
        "商品名",
        "SKU",
        "数量",
        "単価",
        "小計",
        "受注日",
      ],
      rows,
    );
    downloadCSV(`sales_${from}_${to}.csv`, csv);
  };

  const handleInventoryCSV = () => {
    const rows = inventoryItems.map(
      (i) =>
        [
          i.product_name,
          i.product_sku,
          i.quantity,
          i.avg_cost,
          i.total_value,
        ] as (string | number)[],
    );
    const csv = toCSV(
      ["商品名", "SKU", "在庫数", "平均原価", "在庫金額"],
      rows,
    );
    downloadCSV(`inventory_${today()}.csv`, csv);
  };

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold mb-6">レポート</h1>

      <Tabs defaultValue="sales">
        <TabsList className="mb-6">
          <TabsTrigger value="sales">売上レポート</TabsTrigger>
          <TabsTrigger value="inventory">在庫評価</TabsTrigger>
          <TabsTrigger value="export">エクスポート</TabsTrigger>
        </TabsList>

        {/* ── 売上レポート ─────────────────────────────────────────── */}
        <TabsContent value="sales" className="space-y-6">
          <DateRangePicker
            from={from}
            to={to}
            onFromChange={setFrom}
            onToChange={setTo}
          />

          {/* サマリーカード */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  期間売上合計
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{fmt(totalSales)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  受注件数
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {totalOrders.toLocaleString()} 件
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  平均受注金額
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{fmt(avgOrderValue)}</p>
              </CardContent>
            </Card>
          </div>

          {/* 日別売上グラフ */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">日別売上</CardTitle>
            </CardHeader>
            <CardContent>
              {dailySales.every((d) => d.sales === 0) ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  この期間の売上データがありません
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={dailySales}
                    margin={{ top: 4, right: 8, left: 8, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tickFormatter={(v: number) =>
                        v === 0 ? "¥0" : `¥${(v / 1000).toFixed(0)}k`
                      }
                      tick={{ fontSize: 11 }}
                      width={56}
                    />
                    <Tooltip
                      formatter={(value, _name, props) => {
                        const d = props.payload as { orders: number };
                        return [
                          `¥${Number(value).toLocaleString()}（${d.orders} 件）`,
                          "売上",
                        ];
                      }}
                      labelFormatter={(label) => `${label}`}
                    />
                    <Bar
                      dataKey="sales"
                      fill="#3b82f6"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={48}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* 商品別売上テーブル */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">商品別売上</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>商品名</TableHead>
                    <TableHead className="hidden sm:table-cell">SKU</TableHead>
                    <TableHead className="text-right">販売数量</TableHead>
                    <TableHead className="text-right">売上金額</TableHead>
                    <TableHead className="text-right hidden md:table-cell">
                      構成比
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productSales.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center py-8 text-muted-foreground"
                      >
                        この期間の売上データがありません
                      </TableCell>
                    </TableRow>
                  ) : (
                    productSales.map((p) => (
                      <TableRow key={p.product_id}>
                        <TableCell className="font-medium">
                          {p.product_name}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell font-mono text-sm text-muted-foreground">
                          {p.product_sku}
                        </TableCell>
                        <TableCell className="text-right">
                          {p.quantity.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {fmt(p.revenue)}
                        </TableCell>
                        <TableCell className="text-right hidden md:table-cell text-muted-foreground text-sm">
                          {totalSales > 0
                            ? `${((p.revenue / totalSales) * 100).toFixed(1)}%`
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── 在庫評価 ─────────────────────────────────────────────── */}
        <TabsContent value="inventory" className="space-y-6">
          {/* サマリーカード */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  総在庫金額（原価ベース）
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{fmt(totalInventoryValue)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  管理商品数
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {inventoryItems.length} 品目
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  総在庫数
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {inventoryItems
                    .reduce((s, i) => s + i.quantity, 0)
                    .toLocaleString()}{" "}
                  点
                </p>
              </CardContent>
            </Card>
          </div>

          {/* 商品別在庫金額テーブル */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">商品別在庫金額</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>商品名</TableHead>
                    <TableHead className="hidden sm:table-cell">SKU</TableHead>
                    <TableHead className="text-right">在庫数</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">
                      平均原価
                    </TableHead>
                    <TableHead className="text-right">在庫金額</TableHead>
                    <TableHead className="text-right hidden md:table-cell">
                      構成比
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventoryItems.map((item) => (
                    <TableRow key={item.product_id}>
                      <TableCell className="font-medium">
                        {item.product_name}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell font-mono text-sm text-muted-foreground">
                        {item.product_sku}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.quantity.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right hidden sm:table-cell text-muted-foreground">
                        {fmt(item.avg_cost)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {fmt(item.total_value)}
                      </TableCell>
                      <TableCell className="text-right hidden md:table-cell text-muted-foreground text-sm">
                        {totalInventoryValue > 0
                          ? `${((item.total_value / totalInventoryValue) * 100).toFixed(1)}%`
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── エクスポート ──────────────────────────────────────────── */}
        <TabsContent value="export" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            売上データは売上レポートタブで選択した期間（{from} 〜 {to}
            ）が対象です。
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">売上データ CSV</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  受注番号・顧客名・商品名・数量・金額・受注日を含む明細データ
                </p>
                <p className="text-xs text-muted-foreground">
                  対象期間: {from} 〜 {to}
                </p>
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={handleSalesCSV}
                >
                  <Download className="h-4 w-4 mr-2" />
                  売上データをダウンロード
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">在庫データ CSV</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  商品名・SKU・在庫数・平均原価・在庫金額を含む現時点のスナップショット
                </p>
                <p className="text-xs text-muted-foreground">
                  出力日: {today()}
                </p>
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={handleInventoryCSV}
                >
                  <Download className="h-4 w-4 mr-2" />
                  在庫データをダウンロード
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
