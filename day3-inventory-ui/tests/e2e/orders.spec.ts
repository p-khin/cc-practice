import { test, expect, type Page } from "@playwright/test";

// ─── ヘルパー ─────────────────────────────────────────────────────────────────

const TEST_CUSTOMER = "E2E テスト顧客";
const TEST_EMAIL = "e2e-test@example.com";

/** 新規受注ダイアログを開いて受注を作成する */
async function createOrder(page: Page, productName: string, quantity = "1") {
  await page.getByRole("button", { name: /新規受注/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  await dialog.getByLabel("顧客名 *").fill(TEST_CUSTOMER);
  await dialog.getByLabel("メールアドレス *").fill(TEST_EMAIL);

  // 商品行のセレクト
  await dialog.getByRole("combobox").first().click();
  await page.getByRole("option", { name: new RegExp(productName) }).click();

  // 数量
  await dialog.locator('input[type="number"]').fill(quantity);

  await dialog.getByRole("button", { name: "受注を作成" }).click();
  await expect(page.getByText("受注を作成しました")).toBeVisible();
  await expect(dialog).not.toBeVisible();
}

/** 指定顧客名の受注行を返す */
function orderRow(page: Page, customerName = TEST_CUSTOMER) {
  return page.getByRole("row").filter({ hasText: customerName }).first();
}

// ─── テスト ───────────────────────────────────────────────────────────────────

test.describe("受注 → 発送フロー", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/orders");
    await expect(page.getByRole("heading", { name: "受注管理" })).toBeVisible();
  });

  test("初期データの受注一覧が表示される", async ({ page }) => {
    await expect(page.getByText("山田 太郎")).toBeVisible();
    await expect(page.getByText("佐藤 花子")).toBeVisible();
    // ステータスバッジが存在する
    await expect(page.getByText("配達済み").first()).toBeVisible();
    await expect(page.getByText("発送済み").first()).toBeVisible();
  });

  test("ステータスタブでフィルターできる", async ({ page }) => {
    // 「未確認」タブをクリック
    await page.getByRole("tab", { name: "未確認" }).click();
    // pending の受注だけ表示される
    await expect(page.getByText("高橋 美咲")).toBeVisible();
    await expect(page.getByText("渡辺 誠")).toBeVisible();
    // delivered の山田太郎は非表示
    await expect(page.getByText("山田 太郎")).not.toBeVisible();
  });

  test("顧客名で検索できる", async ({ page }) => {
    await page.getByPlaceholder("顧客名・受注番号で検索...").fill("佐藤");
    await expect(page.getByText("佐藤 花子")).toBeVisible();
    await expect(page.getByText("山田 太郎")).not.toBeVisible();
  });

  test("新規受注を作成できる", async ({ page }) => {
    await createOrder(page, "HDMI Cable");

    // 作成した受注が一覧に表示される
    await expect(orderRow(page)).toBeVisible();
    await expect(orderRow(page).getByText("未確認")).toBeVisible();
  });

  test("受注詳細モーダルに明細が表示される", async ({ page }) => {
    await createOrder(page, "Wireless Mouse", "2");

    // 詳細ボタンをクリック
    await orderRow(page).getByRole("button", { name: "詳細" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // 顧客情報
    await expect(dialog.getByText(TEST_CUSTOMER)).toBeVisible();
    await expect(dialog.getByText(TEST_EMAIL)).toBeVisible();

    // 明細テーブル（商品名・数量）
    await expect(dialog.getByText("Wireless Mouse")).toBeVisible();
    await expect(dialog.getByText("2")).toBeVisible();

    // 合計金額（¥3,980 × 2 = ¥7,960）
    await expect(dialog.getByText("¥7,960")).toBeVisible();

    await dialog.getByRole("button", { name: "閉じる" }).click();
    await expect(dialog).not.toBeVisible();
  });

  test("受注 → 確認済み → 発送済み の完全フロー", async ({ page }) => {
    // ── 1. 新規受注作成 ──────────────────────────────────────────
    await createOrder(page, "HDMI Cable", "3");

    const row = orderRow(page);
    await expect(row.getByText("未確認")).toBeVisible();

    // ── 2. 詳細を開いて「確認済み」に変更 ───────────────────────
    await row.getByRole("button", { name: "詳細" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await dialog.getByRole("button", { name: "確認済み へ変更" }).click();
    await expect(
      page.getByText("ステータスを「確認済み」に変更しました"),
    ).toBeVisible();

    // ダイアログが自動で閉じる
    await expect(dialog).not.toBeVisible();

    // 一覧に「確認済み」バッジが表示される
    await expect(orderRow(page).getByText("確認済み")).toBeVisible();

    // ── 3. 発送処理 ──────────────────────────────────────────────
    await orderRow(page).getByRole("button", { name: "発送" }).click();
    const shipDialog = page.getByRole("dialog");
    await expect(shipDialog).toBeVisible();
    await expect(shipDialog.getByText(/発送処理/)).toBeVisible();

    // 配送業者を選択
    await shipDialog.getByText("配送業者を選択...").click();
    await page.getByRole("option", { name: "ヤマト運輸" }).click();

    // 追跡番号を入力
    await shipDialog.getByLabel("追跡番号").fill("1234-5678-9012");

    // 発送確定
    await shipDialog.getByRole("button", { name: "発送確定" }).click();
    await expect(page.getByText("発送処理が完了しました")).toBeVisible();
    await expect(shipDialog).not.toBeVisible();

    // ── 4. 最終ステータス確認 ────────────────────────────────────
    await expect(orderRow(page).getByText("発送済み")).toBeVisible();

    // 「発送」ボタンは消えている（shipped 状態では表示されない）
    await expect(
      orderRow(page).getByRole("button", { name: "発送" }),
    ).not.toBeVisible();
  });

  test("発送処理ダイアログの入力バリデーション", async ({ page }) => {
    // confirmed 状態の受注（初期データ: 鈴木 一郎）の発送ボタンを使う
    const confirmedRow = page
      .getByRole("row")
      .filter({ hasText: "鈴木 一郎" })
      .first();
    await confirmedRow.getByRole("button", { name: "発送" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // 配送業者・追跡番号が未入力の場合、確定ボタンは無効
    await expect(
      dialog.getByRole("button", { name: "発送確定" }),
    ).toBeDisabled();

    // 配送業者だけ入力
    await dialog.getByText("配送業者を選択...").click();
    await page.getByRole("option", { name: "佐川急便" }).click();
    await expect(
      dialog.getByRole("button", { name: "発送確定" }),
    ).toBeDisabled();

    // 追跡番号も入力 → 有効になる
    await dialog.getByLabel("追跡番号").fill("ABC-123");
    await expect(
      dialog.getByRole("button", { name: "発送確定" }),
    ).toBeEnabled();
  });
});
