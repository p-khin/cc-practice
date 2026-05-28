import { test, expect } from "@playwright/test";

test.describe("商品追加フロー", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/products");
    await expect(page.getByRole("heading", { name: "商品管理" })).toBeVisible();
  });

  test("初期データの商品一覧が表示される", async ({ page }) => {
    await expect(page.getByText("Pro Laptop 15")).toBeVisible();
    await expect(page.getByText("Wireless Mouse")).toBeVisible();
    await expect(page.getByText("Mechanical Keyboard")).toBeVisible();
    await expect(page.getByText("4K Monitor 27inch")).toBeVisible();
    await expect(page.getByText("HDMI Cable 2m")).toBeVisible();
  });

  test("新規商品を追加できる", async ({ page }) => {
    // ダイアログを開く
    await page.getByRole("button", { name: "+ 商品を追加" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("商品を追加")).toBeVisible();

    // フォームに入力
    await dialog.getByLabel("SKU").fill("E2E-PROD-001");
    await dialog.getByLabel("商品名").fill("E2E テスト商品");
    await dialog.getByLabel("説明").fill("Playwright テスト用");
    await dialog.getByLabel("販売価格").fill("9800");
    await dialog.getByLabel("原価").fill("5000");
    await dialog.getByLabel("発注点").fill("3");

    // 追加ボタンをクリック
    await dialog.getByRole("button", { name: "追加" }).click();

    // 成功トーストを確認
    await expect(page.getByText("商品を追加しました")).toBeVisible();

    // ダイアログが閉じる
    await expect(dialog).not.toBeVisible();

    // 追加した商品が一覧に表示される
    await expect(page.getByText("E2E テスト商品")).toBeVisible();
    await expect(page.getByText("E2E-PROD-001")).toBeVisible();
  });

  test("追加した商品を編集できる", async ({ page }) => {
    // E2E テスト商品の行を探す（前テストで追加済み前提のため、なければスキップ）
    const row = page.getByRole("row").filter({ hasText: "E2E テスト商品" });
    const rowCount = await row.count();
    test.skip(
      rowCount === 0,
      "E2E テスト商品が存在しない（テストの実行順に依存）",
    );

    await row.getByRole("button", { name: "編集" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // 商品名を更新
    await dialog.getByLabel("商品名").fill("E2E テスト商品（更新済み）");
    await dialog.getByRole("button", { name: "更新" }).click();

    await expect(page.getByText("商品を更新しました")).toBeVisible();
    await expect(page.getByText("E2E テスト商品（更新済み）")).toBeVisible();
  });

  test("検索フィルターが機能する", async ({ page }) => {
    await page.getByPlaceholder("商品名・SKU・説明で検索...").fill("Laptop");
    await expect(page.getByText("Pro Laptop 15")).toBeVisible();
    await expect(page.getByText("Wireless Mouse")).not.toBeVisible();
    await expect(page.getByText("Mechanical Keyboard")).not.toBeVisible();
  });
});
