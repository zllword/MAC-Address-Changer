import { getAdapters } from "./handlers/adapter";
import { changeMacAddress, restoreOriginalMac } from "./handlers/mac";
import { validateMacAddress, generateRandomMac } from "./handlers/validate";

// 使用动态导入来避免构建时的问题
let ipcMain: any;

/**
 * 注册所有 IPC 处理器
 */
export function registerIpcHandlers() {
  // 动态获取 ipcMain
  if (!ipcMain) {
    const electron = require('electron');
    ipcMain = electron.ipcMain;
  }

  // 获取网络适配器列表
  ipcMain.handle("get-adapters", async () => {
    try {
      const adapters = await getAdapters();
      return { success: true, data: adapters };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // 修改 MAC 地址
  ipcMain.handle(
    "change-mac",
    async (_event: any, adapterName: string, newMac: string) => {
      try {
        const result = await changeMacAddress(adapterName, newMac);
        return result;
      } catch (error: any) {
        return { success: false, message: error.message };
      }
    }
  );

  // 恢复原始 MAC 地址
  ipcMain.handle(
    "restore-mac",
    async (_event: any, adapterName: string, originalMac: string) => {
      try {
        const result = await restoreOriginalMac(adapterName, originalMac);
        return result;
      } catch (error: any) {
        return { success: false, message: error.message };
      }
    }
  );

  // 验证 MAC 地址
  ipcMain.handle("validate-mac", async (_event: any, mac: string) => {
    return validateMacAddress(mac);
  });

  // 生成随机 MAC 地址
  ipcMain.handle("generate-random-mac", async () => {
    return generateRandomMac();
  });
}
