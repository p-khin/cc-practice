"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { Product } from "@/lib/mock-data";

type SortKey = keyof Pick<Product, "name" | "sku" | "unit_price" | "cost_price" | "reorder_point">;
type SortDir = "asc" | "desc";

type ProductFormData = {
  sku: string;
  name: string;
  description: string;
  unit_price: string;
  cost_price: string;
  reorder_point: string;
};

const emptyForm: ProductFormData = {
  sku: "",
  name: "",
  description: "",
  unit_price: "",
  cost_price: "",
  reorder_point: "0",
};

function productToForm(p: Product): ProductFormData {
  return {
    sku: p.sku,
    name: p.name,
    description: p.description ?? "",
    unit_price: String(p.unit_price),
    cost_price: String(p.cost_price),
    reorder_point: String(p.reorder_point),
  };
}

type Props = {
  products: Product[];
};

export function ProductsClient({ products }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductFormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.description ?? "").toLowerCase().includes(q)
      )
      .sort((a, b) => {
        const av = a[sortKey];
        const bv = b[sortKey];
        const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
        return sortDir === "asc" ? cmp : -cmp;
      });
  }, [products, search, sortKey, sortDir]);

  const toggleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(key);
        setSortDir("asc");
      }
    },
    [sortKey]
  );

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) return null;
    return sortDir === "asc" ? " ▲" : " ▼";
  };

  const openAdd = () => {
    setForm(emptyForm);
    setAddOpen(true);
  };

  const openEdit = (product: Product) => {
    setForm(productToForm(product));
    setEditTarget(product);
  };

  const handleFormChange = (field: keyof ProductFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAdd = useCallback(async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: form.sku,
          name: form.name,
          description: form.description || null,
          unit_price: Number(form.unit_price),
          cost_price: Number(form.cost_price),
          reorder_point: Number(form.reorder_point),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "追加に失敗しました");
      }
      toast.success("商品を追加しました");
      setAddOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "追加に失敗しました");
    } finally {
      setSubmitting(false);
    }
  }, [form, router]);

  const handleEdit = useCallback(async () => {
    if (!editTarget) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/products/${editTarget.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: form.sku,
          name: form.name,
          description: form.description || null,
          unit_price: Number(form.unit_price),
          cost_price: Number(form.cost_price),
          reorder_point: Number(form.reorder_point),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "更新に失敗しました");
      }
      toast.success("商品を更新しました");
      setEditTarget(null);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "更新に失敗しました");
    } finally {
      setSubmitting(false);
    }
  }, [editTarget, form, router]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/products/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) {
        const err = await res.json();
        throw new Error(err.error ?? "削除に失敗しました");
      }
      toast.success(`"${deleteTarget.name}" を削除しました`);
      setDeleteTarget(null);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "削除に失敗しました");
    } finally {
      setSubmitting(false);
    }
  }, [deleteTarget, router]);

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">商品管理</h1>
        <Button onClick={openAdd}>+ 商品を追加</Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <Input
          placeholder="商品名・SKU・説明で検索..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:w-64"
        />
        <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="ソート項目" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">商品名</SelectItem>
            <SelectItem value="sku">SKU</SelectItem>
            <SelectItem value="unit_price">販売価格</SelectItem>
            <SelectItem value="cost_price">原価</SelectItem>
            <SelectItem value="reorder_point">発注点</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
        >
          {sortDir === "asc" ? "昇順 ▲" : "降順 ▼"}
        </Button>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => toggleSort("sku")}
              >
                SKU{sortIndicator("sku")}
              </TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => toggleSort("name")}
              >
                商品名{sortIndicator("name")}
              </TableHead>
              <TableHead className="hidden md:table-cell">説明</TableHead>
              <TableHead
                className="cursor-pointer select-none text-right"
                onClick={() => toggleSort("unit_price")}
              >
                販売価格{sortIndicator("unit_price")}
              </TableHead>
              <TableHead
                className="cursor-pointer select-none text-right hidden sm:table-cell"
                onClick={() => toggleSort("cost_price")}
              >
                原価{sortIndicator("cost_price")}
              </TableHead>
              <TableHead
                className="cursor-pointer select-none text-right hidden sm:table-cell"
                onClick={() => toggleSort("reorder_point")}
              >
                発注点{sortIndicator("reorder_point")}
              </TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  該当する商品がありません
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-xs truncate">
                    {product.description ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    ¥{product.unit_price.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right hidden sm:table-cell">
                    ¥{product.cost_price.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right hidden sm:table-cell">
                    {product.reorder_point}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEdit(product)}
                      >
                        編集
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteTarget(product)}
                      >
                        削除
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <p className="mt-2 text-sm text-muted-foreground">
        {filtered.length} / {products.length} 件
      </p>

      {/* 追加ダイアログ */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>商品を追加</DialogTitle>
          </DialogHeader>
          <ProductForm form={form} onChange={handleFormChange} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={submitting}>
              キャンセル
            </Button>
            <Button onClick={handleAdd} disabled={submitting}>
              {submitting ? "追加中..." : "追加"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 編集ダイアログ */}
      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>商品を編集</DialogTitle>
          </DialogHeader>
          <ProductForm form={form} onChange={handleFormChange} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)} disabled={submitting}>
              キャンセル
            </Button>
            <Button onClick={handleEdit} disabled={submitting}>
              {submitting ? "更新中..." : "更新"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>商品を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              「{deleteTarget?.name}」を削除します。この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={submitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {submitting ? "削除中..." : "削除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

type FormProps = {
  form: ProductFormData;
  onChange: (field: keyof ProductFormData, value: string) => void;
};

function ProductForm({ form, onChange }: FormProps) {
  return (
    <div className="grid gap-4 py-2">
      <div className="grid grid-cols-4 items-center gap-2">
        <Label htmlFor="sku" className="text-right">SKU</Label>
        <Input
          id="sku"
          value={form.sku}
          onChange={(e) => onChange("sku", e.target.value)}
          className="col-span-3"
          placeholder="PROD-001"
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-2">
        <Label htmlFor="name" className="text-right">商品名</Label>
        <Input
          id="name"
          value={form.name}
          onChange={(e) => onChange("name", e.target.value)}
          className="col-span-3"
          placeholder="商品名を入力"
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-2">
        <Label htmlFor="description" className="text-right">説明</Label>
        <Input
          id="description"
          value={form.description}
          onChange={(e) => onChange("description", e.target.value)}
          className="col-span-3"
          placeholder="（任意）"
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-2">
        <Label htmlFor="unit_price" className="text-right">販売価格</Label>
        <Input
          id="unit_price"
          type="number"
          min={0}
          value={form.unit_price}
          onChange={(e) => onChange("unit_price", e.target.value)}
          className="col-span-3"
          placeholder="0"
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-2">
        <Label htmlFor="cost_price" className="text-right">原価</Label>
        <Input
          id="cost_price"
          type="number"
          min={0}
          value={form.cost_price}
          onChange={(e) => onChange("cost_price", e.target.value)}
          className="col-span-3"
          placeholder="0"
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-2">
        <Label htmlFor="reorder_point" className="text-right">発注点</Label>
        <Input
          id="reorder_point"
          type="number"
          min={0}
          value={form.reorder_point}
          onChange={(e) => onChange("reorder_point", e.target.value)}
          className="col-span-3"
          placeholder="0"
        />
      </div>
    </div>
  );
}
