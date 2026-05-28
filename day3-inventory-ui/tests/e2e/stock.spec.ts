import { test, expect, type Page } from "@playwright/test";

// ─── ヘルパー ─────────────────────────────────────────────────────────────────

/** 商品コンボボックスから商品を選択する */
async function selectProduct(page: Page, productName: string) {
  // "商品を選択..." テキストを持つ combobox ボタンをクリック
  await page.getByRole("button", { name: /商品を選択/ }).click();
  // コマンドパレットの検索入力に絞り込みキーワードを入力
  await page
    .getByPlaceholder("商品名・SKUで検索...")
    .fill(productName.slice(0, 6));
  // 該当アイテムをクリック（role=option は cmdk が付与）
  await page.getByRole("option", { name: new RegExp(productName) }).click();
}

/** Radix Select から選択肢を選ぶ */
async function selectFromDropdown(
  page: Page,
  triggerText: string | RegExp,
  optionName: string,
) {
  await page.getByText(triggerText).click();
  await page.getByRole("option", { name: optionName }).click();
}

// ─── テスト ───────────────────────────────────────────────────────────────────

test.describe("入庫 → 出庫フロー", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/stock");
    await expect(page.getByRole("heading", { name: "在庫操作" })).toBeVisible();
  });

  test("入庫タブが初期表示される", async ({ page }) => {
    await expect(page.getByRole("tab", { name: /入庫/ })).toHaveAttribute(
      "data-state",
      "active",
    );
    await expect(page.getByText("入庫登録")).toBeVisible();
  });

  test("入庫を登録できる（Mechanical Keyboard +10）", async ({ page }) => {
    // 入庫タブを確認
    await expect(page.getByText("入庫登録")).toBeVisible();

    // 商品選択（コンボボックス）
    await selectProduct(page, "Mechanical Keyboard");
    await expect(
      page.getByRole("button", { name: /Mechanical Keyboard/ }),
    ).toBeVisible();

    // 倉庫選択
    await selectFromDropdown(page, "倉庫を選択...", "東京倉庫");

    // 数量入力
    await page.getByPlaceholder("1").fill("10");

    // メモ入力
    await page.getByPlaceholder("備考など").fill("E2E テスト入庫");

    // 送信
    await page.getByRole("button", { name: "入庫登録" }).click();

    // 成功トーストを確認
    await expect(page.getByText("入庫を登録しました")).toBeVisible();

    // フォームがリセットされる
    await expect(
      page.getByRole("button", { name: /商品を選択/ }),
    ).toBeVisible();
  });

  test("出庫を登録できる（Mechanical Keyboard -5）", async ({ page }) => {
    // 出庫タブに切り替え
    await page.getByRole("tab", { name: /出庫/ }).click();
    await expect(page.getByText("出庫登録")).toBeVisible();

    // 商品選択
    await selectProduct(page, "Mechanical Keyboard");

    // 現在在庫数が表示される
    await expect(page.getByText(/現在在庫/)).toBeVisible();

    // 倉庫選択
    await selectFromDropdown(page, "倉庫を選択...", "大阪倉庫");

    // 数量入力
    await page.getByPlaceholder("1").fill("5");

    // 送信
    await page.getByRole("button", { name: "出庫登録" }).click();

    // 成功トーストを確認
    await expect(page.getByText("出庫を登録しました")).toBeVisible();
  });

  test("在庫数を超える出庫はエラー表示される", async ({ page }) => {
    // 出庫タブに切り替え
    await page.getByRole("tab", { name: /出庫/ }).click();

    // HDMI Cable（初期在庫 82）を選択
    await selectProduct(page, "HDMI Cable");
    await selectFromDropdown(page, "倉庫を選択...", "東京倉庫");

    // 在庫を超える数量を入力
    await page.getByPlaceholder("1").fill("9999");

    // エラーメッセージが表示される
    await expect(page.getByText(/在庫数.*を超えています/)).toBeVisible();

    // 登録ボタンが無効化される
    await expect(page.getByRole("button", { name: "出庫登録" })).toBeDisabled();
  });

  test("小数や 0 の数量はエラー表示される", async ({ page }) => {
    await selectProduct(page, "Wireless Mouse");
    await selectFromDropdown(page, "倉庫を選択...", "東京倉庫");

    // 0 を入力
    await page.getByPlaceholder("1").fill("0");
    await expect(page.getByText(/正の整数を入力してください/)).toBeVisible();
    await expect(page.getByRole("button", { name: "入庫登録" })).toBeDisabled();
  });

  test("履歴タブにフィルターとページネーションが表示される", async ({
    page,
  }) => {
    // 履歴タブに切り替え
    await page.getByRole("tab", { name: "履歴" }).click();
    await expect(page.getByText("入出庫履歴")).toBeVisible();

    // フィルター要素が存在する
    await expect(page.getByText("期間 From")).toBeVisible();
    await expect(page.getByText("To")).toBeVisible();

    // テーブルヘッダーが表示される
    await expect(
      page.getByRole("columnheader", { name: "日時" }),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "種別" }),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "商品" }),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "倉庫" }),
    ).toBeVisible();

    // ページネーションが表示される
    await expect(page.getByRole("button", { name: "前へ" })).toBeVisible();
    await expect(page.getByRole("button", { name: "次へ" })).toBeVisible();
  });

  test("履歴をタイプでフィルターできる", async ({ page }) => {
    await page.getByRole("tab", { name: "履歴" }).click();

    // 入庫のみにフィルター
    await page.getByText("すべて").click();
    await page.getByRole("option", { name: "入庫" }).click();

    // 出庫バッジが存在しないことを確認
    const rows = page.getByRole("row");
    const count = await rows.count();
    for (let i = 1; i < count; i++) {
      await expect(rows.nth(i).getByText("出庫")).not.toBeVisible();
    }
  });
});
