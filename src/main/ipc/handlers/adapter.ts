import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface NetworkAdapter {
  name: string;
  description: string;
  macAddress: string;
  status: string;
}

/**
 * 获取 macOS 的网络适配器列表
 */
async function getMacOSAdapters(): Promise<NetworkAdapter[]> {
  try {
    const { stdout } = await execAsync("ifconfig -a", {
      encoding: "utf8",
    });

    const adapters: NetworkAdapter[] = [];
    const lines = stdout.split("\n");

    let currentAdapter: Partial<NetworkAdapter> | null = null;

    for (const line of lines) {
      // 匹配网卡名称（如 en0, en1 等）
      const nameMatch = line.match(/^([a-z]+\d+):/);
      if (nameMatch) {
        if (currentAdapter && currentAdapter.name) {
          adapters.push(currentAdapter as NetworkAdapter);
        }
        currentAdapter = {
          name: nameMatch[1],
          description: `Network Interface ${nameMatch[1]}`,
          macAddress: "",
          status: "",
        };
      }

      // 匹配 MAC 地址
      const macMatch = line.match(/ether\s+([a-fA-F0-9:]{17})/);
      if (macMatch && currentAdapter) {
        currentAdapter.macAddress = macMatch[1];
      }

      // 匹配状态（active/inactive）
      if (line.includes("status: active") && currentAdapter) {
        currentAdapter.status = "Up";
      } else if (line.includes("status: inactive") && currentAdapter) {
        currentAdapter.status = "Down";
      }
    }

    // 添加最后一个网卡
    if (currentAdapter && currentAdapter.name && currentAdapter.macAddress) {
      adapters.push(currentAdapter as NetworkAdapter);
    }

    // 过滤掉没有 MAC 地址的网卡
    return adapters.filter((adapter) => adapter.macAddress);
  } catch (error: any) {
    throw new Error(`获取 macOS 网卡列表失败: ${error.message}`);
  }
}

/**
 * 获取 Windows 的网络适配器列表
 */
async function getWindowsAdapters(): Promise<NetworkAdapter[]> {
  try {
    const command = `Get-NetAdapter | Where-Object { $_.MacAddress -ne $null } | Select-Object Name, InterfaceDescription, MacAddress, Status | ConvertTo-Json -Depth 2`;

    const { stdout } = await execAsync(`powershell -Command "${command}"`, {
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 10,
    });

    if (!stdout || stdout.trim() === "") {
      return [];
    }

    const adapters = JSON.parse(stdout);
    const adapterList = Array.isArray(adapters) ? adapters : [adapters];

    return adapterList
      .filter((adapter: any) => adapter && adapter.MacAddress && adapter.Name)
      .map((adapter: any) => ({
        name: adapter.Name || "",
        description: adapter.InterfaceDescription || "",
        macAddress: adapter.MacAddress || "",
        status: adapter.Status || "Unknown",
      }));
  } catch (error: any) {
    throw new Error(`获取 Windows 网卡列表失败: ${error.message}`);
  }
}

/**
 * 获取所有网络适配器列表（跨平台）
 */
export async function getAdapters(): Promise<NetworkAdapter[]> {
  const platform = process.platform;

  if (platform === "darwin") {
    return getMacOSAdapters();
  } else if (platform === "win32") {
    return getWindowsAdapters();
  } else {
    throw new Error(`不支持的操作系统: ${platform}`);
  }
}

/**
 * 重启 macOS 的网络适配器
 */
async function restartMacOSAdapter(adapterName: string): Promise<void> {
  try {
    // macOS 下通过 networksetup 重启网卡
    const service = await execAsync(`networksetup -listallhardwareports | grep -A 1 "Device: ${adapterName}" | grep "Hardware Port" | awk '{print $3}'`, {
      encoding: "utf8",
    }).then(({ stdout }) => stdout.trim()).catch(() => adapterName);

    // 断开并重新连接 Wi-Fi（如果是无线网卡）
    await execAsync(`networksetup -setairportpower ${service} off`, {
      encoding: "utf8",
    });

    await new Promise((resolve) => setTimeout(resolve, 500));

    await execAsync(`networksetup -setairportpower ${service} on`, {
      encoding: "utf8",
    });
  } catch (error: any) {
    // 如果是 Wi-Fi 操作失败，尝试其他方法
    throw new Error(`重启 macOS 网卡失败: ${error.message}`);
  }
}

/**
 * 重启 Windows 的网络适配器
 */
async function restartWindowsAdapter(adapterName: string): Promise<void> {
  try {
    await execAsync(
      `powershell -Command "Disable-NetAdapter -Name '${adapterName}' -Confirm:$false"`,
      { encoding: "utf8" }
    );

    await new Promise((resolve) => setTimeout(resolve, 1000));

    await execAsync(
      `powershell -Command "Enable-NetAdapter -Name '${adapterName}' -Confirm:$false"`,
      { encoding: "utf8" }
    );
  } catch (error: any) {
    throw new Error(`重启 Windows 网卡失败: ${error.message}`);
  }
}

/**
 * 重启指定的网络适配器（跨平台）
 */
export async function restartAdapter(adapterName: string): Promise<void> {
  const platform = process.platform;

  if (platform === "darwin") {
    return restartMacOSAdapter(adapterName);
  } else if (platform === "win32") {
    return restartWindowsAdapter(adapterName);
  } else {
    throw new Error(`不支持的操作系统: ${platform}`);
  }
}
