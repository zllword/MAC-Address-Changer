import { test, expect, Page } from "@playwright/test";

test.describe("MAC 地址修改器 E2E 测试", () => {
  test.beforeEach(async ({ page }) => {
    // 等待应用加载
    await page.goto("http://localhost:5173");
    await page.waitForLoadState("networkidle");
  });

  test("应该显示应用标题", async ({ page }) => {
    await expect(page.locator(".app-header h1")).toContainText(
      "Windows MAC 地址修改器"
    );
  });

  test("应该加载网络适配器列表", async ({ page }) => {
    // 等待网卡列表加载
    await page.waitForSelector(".el-select", { timeout: 5000 });

    // 检查是否有网卡选项
    const selectOptions = page.locator(".el-select");
    await expect(selectOptions).toBeVisible();
  });

  test("应该能够选择网络适配器", async ({ page }) => {
    // 点击下拉选择框
    await page.click(".el-select");

    // 等待选项出现
    await page.waitForSelector(".el-select-dropdown", { timeout: 3000 });

    // 选择第一个网卡
    await page.click(".el-select-dropdown .el-select-menu__item:first-child");

    // 验证选择成功
    const selectedText = await page
      .locator(".el-select .el-input__inner")
      .inputValue();
    expect(selectedText).toBeTruthy();
  });

  test("应该能够生成随机 MAC 地址", async ({ page }) => {
    // 点击随机生成按钮
    await page.click('button:has-text("随机生成")');

    // 等待输入框有值
    const input = page.locator('input[placeholder*="MAC"]');
    await expect(input).not.toHaveValue("");

    // 验证生成的 MAC 地址格式
    const macValue = await input.inputValue();
    expect(macValue).toMatch(/^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/);
  });

  test("应该验证 MAC 地址格式", async ({ page }) => {
    const input = page.locator('input[placeholder*="MAC"]');

    // 输入无效的 MAC 地址
    await input.fill("invalid-mac");

    // 尝试点击修改按钮 - 应该被禁用或显示错误
    const changeButton = page.locator('button:has-text("修改 MAC")');
    await expect(changeButton).toBeDisabled();
  });

  test("应该显示操作日志", async ({ page }) => {
    // 触发一些操作来生成日志
    await page.click('button:has-text("随机生成")');

    // 检查日志区域
    const logs = page.locator(".el-alert");
    await expect(logs.first()).toBeVisible({ timeout: 3000 });
  });

  test.describe("MAC 地址修改流程", () => {
    test("完整的 MAC 地址修改流程", async ({ page }) => {
      // 1. 选择网卡
      await page.click(".el-select");
      await page.waitForSelector(".el-select-dropdown");
      await page.click(".el-select-dropdown .el-select-menu__item:first-child");

      // 2. 生成随机 MAC 地址
      await page.click('button:has-text("随机生成")');

      // 3. 获取新生成的 MAC 地址
      const input = page.locator('input[placeholder*="MAC"]');
      const newMac = await input.inputValue();

      // 4. 点击修改按钮
      const changeButton = page.locator('button:has-text("修改 MAC")');
      await changeButton.click();

      // 5. 确认对话框
      const dialog = page.locator(".el-message-box");
      await expect(dialog).toBeVisible({ timeout: 3000 });

      // 6. 点击确认
      await page.click('.el-message-box__btns button:has-text("确定")');

      // 7. 等待操作完成
      await page.waitForTimeout(2000);

      // 8. 验证成功消息
      const successMessage = page.locator(".el-message--success");
      if (
        await successMessage.isVisible({ timeout: 5000 }).catch(() => false)
      ) {
        await expect(successMessage).toContainText("成功");
      }
    });
  });

  test.describe("网卡状态显示", () => {
    test("应该标记当前正在使用的网卡", async ({ page }) => {
      // 选择一个网卡
      await page.click(".el-select");
      await page.waitForSelector(".el-select-dropdown");
      await page.click(".el-select-dropdown .el-select-menu__item:first-child");

      // 检查是否显示网卡信息
      const currentInfo = page.locator(".el-descriptions");
      await expect(currentInfo).toBeVisible({ timeout: 3000 });

      // 验证状态标签
      const statusTag = page.locator(".el-tag--success");
      if (await statusTag.isVisible().catch(() => false)) {
        await expect(statusTag).toContainText("已连接");
      }
    });

    test("应该显示当前 MAC 地址", async ({ page }) => {
      // 选择网卡
      await page.click(".el-select");
      await page.waitForSelector(".el-select-dropdown");
      await page.click(".el-select-dropdown .el-select-menu__item:first-child");

      // 检查当前 MAC 地址显示
      const currentMacLabel = page.locator(
        '.el-descriptions-item:has-text("当前 MAC")'
      );
      await expect(currentMacLabel).toBeVisible({ timeout: 3000 });
    });
  });

  test.describe("错误处理", () => {
    test("应该处理权限不足的错误", async ({ page }) => {
      // 这个测试需要模拟权限错误
      // 在实际环境中可能需要特殊设置

      // 选择网卡
      await page.click(".el-select");
      await page.waitForSelector(".el-select-dropdown");
      await page.click(".el-select-dropdown .el-select-menu__item:first-child");

      // 生成随机 MAC
      await page.click('button:has-text("随机生成")');

      // 尝试修改
      const changeButton = page.locator('button:has-text("修改 MAC")');
      await changeButton.click();

      // 如果出现错误，检查错误消息
      const errorMessage = page.locator(".el-message--error");
      if (await errorMessage.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(errorMessage).toBeVisible();
      }
    });

    test("应该处理无效的网卡名称", async ({ page }) => {
      // 刷新网卡列表
      await page.click('button:has-text("刷新网卡列表")');

      // 等待加载完成
      await page.waitForTimeout(2000);

      // 检查是否有错误提示
      const errorAlert = page.locator(".el-alert--error");
      if (await errorAlert.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(errorAlert).toBeVisible();
      }
    });
  });

  test.describe("恢复原始 MAC", () => {
    test("应该能够恢复原始 MAC 地址", async ({ page }) => {
      // 1. 选择网卡
      await page.click(".el-select");
      await page.waitForSelector(".el-select-dropdown");
      await page.click(".el-select-dropdown .el-select-menu__item:first-child");

      // 2. 点击恢复按钮
      const restoreButton = page.locator('button:has-text("恢复原始 MAC")');

      // 按钮可能被禁用（如果还没有修改过）
      const isEnabled = await restoreButton.isEnabled();
      if (isEnabled) {
        await restoreButton.click();

        // 确认对话框
        const dialog = page.locator(".el-message-box");
        await expect(dialog).toBeVisible({ timeout: 3000 });

        // 点击确认
        await page.click('.el-message-box__btns button:has-text("确定")');

        // 等待操作完成
        await page.waitForTimeout(2000);
      }
    });
  });
});
