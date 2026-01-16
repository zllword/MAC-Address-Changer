import { app, BrowserWindow, ipcMain } from "electron";
import { join } from "path";
import { getAdapters } from "./ipc/handlers/adapter";
import { changeMacAddress, restoreOriginalMac } from "./ipc/handlers/mac";
import { validateMacAddress, generateRandomMac } from "./ipc/handlers/validate";

let mainWindow: BrowserWindow | null = null;

/**
 * 获取 preload 脚本路径
 * electron-vite 在开发模式下会自动编译 preload 脚本到临时目录
 * 生产模式下使用编译后的路径
 */
function getPreloadPath(): string {
  // electron-vite 在开发模式下会将 preload 编译到临时目录
  // 在开发模式下，__dirname 指向编译后的临时目录
  // 在生产模式下，__dirname 指向 out 目录
  const preloadPath = join(__dirname, "../preload/index.js");
  return preloadPath;
}

/**
 * 创建主窗口
 */
function createWindow() {
  const preloadPath = getPreloadPath();
  console.log("Preload 路径:", preloadPath);
  console.log("__dirname:", __dirname);
  console.log("VITE_DEV_SERVER_URL:", process.env.VITE_DEV_SERVER_URL);

  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 700,
    minHeight: 600,
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
    title: "MAC 地址修改器",
    icon: undefined, // 可以在这里添加图标路径
  });

  // 开发模式下加载开发服务器，生产环境加载打包后的文件
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    // 开发模式下打开开发者工具
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }

  // 监听 preload 脚本加载错误
  mainWindow.webContents.on(
    "did-fail-load",
    (event, errorCode, errorDescription) => {
      console.error("页面加载失败:", errorCode, errorDescription);
    }
  );

  // 监听控制台消息
  mainWindow.webContents.on("console-message", (event, level, message) => {
    console.log(`[渲染进程 ${level}]:`, message);
  });
}

// 注册所有 IPC 处理器
function registerIpcHandlers() {
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

// 注册 IPC 处理器
registerIpcHandlers();

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  // Windows 和 Linux 上，关闭所有窗口时退出应用
  // macOS 上，应用通常保持运行状态
  if (process.platform !== "darwin") {
    app.quit();
  }
});
