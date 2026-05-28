import { AlertTriangle, Boxes, DollarSign, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getDashboardSummary,
  getLowStockAlerts,
  getRecentMovements,
  getSalesChartData,
} from "@/lib/dashboard";
import SalesChart from "./_components/SalesChart";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DashboardPage() {
  const summary = getDashboardSummary();
  const movements = getRecentMovements(10);
  const alerts = getLowStockAlerts();
  const chartData = getSalesChartData();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">ダッシュボード</h1>

      {/* サマリーカード */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              総商品数
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{summary.totalProducts}</p>
            <p className="text-xs text-muted-foreground mt-1">商品</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              総在庫数
            </CardTitle>
            <Boxes className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {summary.totalStock.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">点</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              在庫金額
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              ¥{summary.totalValue.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">原価ベース</p>
          </CardContent>
        </Card>
      </div>

      {/* 最近の入出庫 + 在庫アラート */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">最近の入出庫</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>日時</TableHead>
                  <TableHead>商品名</TableHead>
                  <TableHead>タイプ</TableHead>
                  <TableHead className="text-right">数量</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="text-sm whitespace-nowrap">
                      {formatDate(m.date)}
                    </TableCell>
                    <TableCell className="text-sm">{m.productName}</TableCell>
                    <TableCell>
                      <Badge
                        variant={m.type === "in" ? "default" : "secondary"}
                      >
                        {m.type === "in" ? "入庫" : "出庫"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {m.quantity}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <CardTitle className="text-base">在庫アラート</CardTitle>
            {alerts.length > 0 && (
              <Badge variant="destructive" className="ml-auto">
                {alerts.length}件
              </Badge>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {alerts.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-muted-foreground">
                アラートはありません
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>商品名</TableHead>
                    <TableHead className="text-right">現在庫</TableHead>
                    <TableHead className="text-right">最低在庫</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alerts.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>
                        <p className="text-sm font-medium">{a.name}</p>
                        <p className="text-xs text-muted-foreground">{a.sku}</p>
                      </TableCell>
                      <TableCell className="text-right font-bold text-destructive">
                        {a.quantity}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {a.reorderPoint}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 売上グラフ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">売上グラフ（直近7日間）</CardTitle>
        </CardHeader>
        <CardContent>
          <SalesChart data={chartData} />
        </CardContent>
      </Card>
    </div>
  );
}
