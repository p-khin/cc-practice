import { test, expect } from "@playwright/test";

test.describe("ダッシュボード表示", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("ページタイトルと主要指標カードが表示される", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "ダッシュボード" }),
    ).toBeVisible();

    await expect(page.getByText("総商品数")).toBeVisible();
    await expect(page.getByText("総在庫数")).toBeVisible();
    await expect(page.getByText("在庫金額")).toBeVisible();

    // カード内の数値が表示されている
    const productCount = page.getByText("総商品数").locator("..").locator("..");
    await expect(productCount.getByText("5")).toBeVisible();
  });

  test("最近の入出庫テーブルが表示される", async ({ page }) => {
    await expect(page.getByText("最近の入出庫")).toBeVisible();

    const movementsTable = page
      .getByText("最近の入出庫")
      .locator("../..")
      .locator("table");
    await expect(movementsTable).toBeVisible();

    // 入庫・出庫のバッジが存在する
    await expect(page.getByText("入庫").first()).toBeVisible();
    await expect(page.getByText("出庫").first()).toBeVisible();
  });

  test("在庫アラートセクションが表示される", async ({ page }) => {
    await expect(page.getByText("在庫アラート")).toBeVisible();
  });

  test("売上グラフが表示される", async ({ page }) => {
    await expect(page.getByText("売上グラフ（直近7日間）")).toBeVisible();
    // recharts は SVG を描画する
    await expect(page.locator("svg").first()).toBeVisible();
  });
});
