import { exec } from "child_process";
import { promisify } from "util";
import { normalizeMacAddress } from "./validate";

const execAsync = promisify(exec);

export interface ChangeMacResult {
  success: boolean;
  message: string;
  originalMac?: string;
}

/**
 * 修改 macOS 网络适配器的 MAC 地址
 */
async function changeMacOSMacAddress(
  adapterName: string,
  newMac: string
): Promise<ChangeMacResult> {
  try {
    const normalizedMac = normalizeMacAddress(newMac);

    // 1. 获取原始 MAC 地址
    const { stdout: originalMac } = await execAsync(
      `ifconfig ${adapterName} | grep ether | awk '{print $2}'`,
      { encoding: "utf8" }
    );
    const originalMacTrimmed = originalMac.trim();

    // 2. 断开网卡连接
    try {
      await execAsync(`sudo ifconfig ${adapterName} down`, {
        encoding: "utf8",
      });
    } catch (e) {
      // 某些网卡可能不需要 down
    }

    await new Promise((resolve) => setTimeout(resolve, 200));

    // 3. 设置新的 MAC 地址
    await execAsync(`sudo ifconfig ${adapterName} ether ${normalizedMac}`, {
      encoding: "utf8",
    });

    await new Promise((resolve) => setTimeout(resolve, 200));

    // 4. 重新启用网卡
    try {
      await execAsync(`sudo ifconfig ${adapterName} up`, {
        encoding: "utf8",
      });
    } catch (e) {
      // 某些网卡会自动 up
    }

    return {
      success: true,
      message: `MAC 地址已成功修改为 ${normalizedMac}`,
      originalMac: originalMacTrimmed,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `修改 macOS MAC 地址失败: ${error.message}`,
    };
  }
}

/**
 * 修改 Windows 网络适配器的 MAC 地址
 */
async function changeWindowsMacAddress(
  adapterName: string,
  newMac: string
): Promise<ChangeMacResult> {
  try {
    const normalizedMac = normalizeMacAddress(newMac);

    // 1. 获取原始 MAC 地址
    const getMacCommand = `Get-NetAdapter -Name '${adapterName}' | Select-Object -ExpandProperty MacAddress`;
    const { stdout: originalMac } = await execAsync(
      `powershell -Command "${getMacCommand}"`,
      { encoding: "utf8" }
    );
    const originalMacTrimmed = originalMac.trim();

    // 2. 禁用网卡
    await execAsync(
      `powershell -Command "Disable-NetAdapter -Name '${adapterName}' -Confirm:$false"`,
      { encoding: "utf8" }
    );

    await new Promise((resolve) => setTimeout(resolve, 500));

    // 3. 设置新的 MAC 地址
    const setMacCommand = `Set-NetAdapter -Name '${adapterName}' -MacAddress '${normalizedMac}'`;
    await execAsync(`powershell -Command "${setMacCommand}"`, {
      encoding: "utf8",
    });

    await new Promise((resolve) => setTimeout(resolve, 500));

    // 4. 启用网卡
    await execAsync(
      `powershell -Command "Enable-NetAdapter -Name '${adapterName}' -Confirm:$false"`,
      { encoding: "utf8" }
    );

    return {
      success: true,
      message: `MAC 地址已成功修改为 ${normalizedMac}`,
      originalMac: originalMacTrimmed,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `修改 Windows MAC 地址失败: ${error.message}`,
    };
  }
}

/**
 * 修改网络适配器的 MAC 地址（跨平台）
 */
export async function changeMacAddress(
  adapterName: string,
  newMac: string
): Promise<ChangeMacResult> {
  const platform = process.platform;

  if (platform === "darwin") {
    return changeMacOSMacAddress(adapterName, newMac);
  } else if (platform === "win32") {
    return changeWindowsMacAddress(adapterName, newMac);
  } else {
    return {
      success: false,
      message: `不支持的操作系统: ${platform}`,
    };
  }
}

/**
 * 恢复 macOS 原始 MAC 地址
 */
async function restoreMacOSMacAddress(
  adapterName: string,
  originalMac: string
): Promise<ChangeMacResult> {
  try {
    const normalizedMac = normalizeMacAddress(originalMac);

    // 1. 断开网卡
    try {
      await execAsync(`sudo ifconfig ${adapterName} down`, {
        encoding: "utf8",
      });
    } catch (e) {
      // 某些网卡可能不需要 down
    }

    await new Promise((resolve) => setTimeout(resolve, 200));

    // 2. 恢复原始 MAC 地址
    await execAsync(`sudo ifconfig ${adapterName} ether ${normalizedMac}`, {
      encoding: "utf8",
    });

    await new Promise((resolve) => setTimeout(resolve, 200));

    // 3. 重新启用网卡
    try {
      await execAsync(`sudo ifconfig ${adapterName} up`, {
        encoding: "utf8",
      });
    } catch (e) {
      // 某些网卡会自动 up
    }

    return {
      success: true,
      message: `已恢复原始 MAC 地址: ${normalizedMac}`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `恢复 macOS MAC 地址失败: ${error.message}`,
    };
  }
}

/**
 * 恢复 Windows 原始 MAC 地址
 */
async function restoreWindowsMacAddress(
  adapterName: string,
  originalMac: string
): Promise<ChangeMacResult> {
  try {
    const normalizedMac = normalizeMacAddress(originalMac);

    // 1. 禁用网卡
    await execAsync(
      `powershell -Command "Disable-NetAdapter -Name '${adapterName}' -Confirm:$false"`,
      { encoding: "utf8" }
    );

    await new Promise((resolve) => setTimeout(resolve, 500));

    // 2. 恢复原始 MAC 地址
    const setMacCommand = `Set-NetAdapter -Name '${adapterName}' -MacAddress '${normalizedMac}'`;
    await execAsync(`powershell -Command "${setMacCommand}"`, {
      encoding: "utf8",
    });

    await new Promise((resolve) => setTimeout(resolve, 500));

    // 3. 启用网卡
    await execAsync(
      `powershell -Command "Enable-NetAdapter -Name '${adapterName}' -Confirm:$false"`,
      { encoding: "utf8" }
    );

    return {
      success: true,
      message: `已恢复原始 MAC 地址: ${normalizedMac}`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `恢复 Windows MAC 地址失败: ${error.message}`,
    };
  }
}

/**
 * 恢复原始 MAC 地址（跨平台）
 */
export async function restoreOriginalMac(
  adapterName: string,
  originalMac: string
): Promise<ChangeMacResult> {
  const platform = process.platform;

  if (platform === "darwin") {
    return restoreMacOSMacAddress(adapterName, originalMac);
  } else if (platform === "win32") {
    return restoreWindowsMacAddress(adapterName, originalMac);
  } else {
    return {
      success: false,
      message: `不支持的操作系统: ${platform}`,
    };
  }
}
