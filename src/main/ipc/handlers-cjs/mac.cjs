const { exec } = require("child_process");
const { promisify } = require("util");

const execAsync = promisify(exec);

function normalizeMacAddress(mac) {
  // 移除所有分隔符，然后统一转换为冒号分隔
  const cleaned = mac.replace(/[^a-fA-F0-9]/g, "");
  const parts = cleaned.match(/.{1,2}/g) || [];
  return parts.join(":").toLowerCase();
}

async function changeMacOSMacAddress(adapterName, newMac) {
  try {
    const normalizedMac = normalizeMacAddress(newMac);

    const { stdout: originalMac } = await execAsync(
      `ifconfig ${adapterName} | grep ether | awk '{print $2}'`,
      { encoding: "utf8" }
    );
    const originalMacTrimmed = originalMac.trim();

    try {
      await execAsync(`sudo ifconfig ${adapterName} down`, {
        encoding: "utf8",
      });
    } catch (e) {
      // 某些网卡可能不需要 down
    }

    await new Promise((resolve) => setTimeout(resolve, 200));

    await execAsync(`sudo ifconfig ${adapterName} ether ${normalizedMac}`, {
      encoding: "utf8",
    });

    await new Promise((resolve) => setTimeout(resolve, 200));

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
  } catch (error) {
    return {
      success: false,
      message: `修改 macOS MAC 地址失败: ${error.message}`,
    };
  }
}

async function changeWindowsMacAddress(adapterName, newMac) {
  try {
    const normalizedMac = normalizeMacAddress(newMac);

    const getMacCommand = `Get-NetAdapter -Name '${adapterName}' | Select-Object -ExpandProperty MacAddress`;
    const { stdout: originalMac } = await execAsync(
      `powershell -Command "${getMacCommand}"`,
      { encoding: "utf8" }
    );
    const originalMacTrimmed = originalMac.trim();

    await execAsync(
      `powershell -Command "Disable-NetAdapter -Name '${adapterName}' -Confirm:$false"`,
      { encoding: "utf8" }
    );

    await new Promise((resolve) => setTimeout(resolve, 500));

    const setMacCommand = `Set-NetAdapter -Name '${adapterName}' -MacAddress '${normalizedMac}'`;
    await execAsync(`powershell -Command "${setMacCommand}"`, {
      encoding: "utf8",
    });

    await new Promise((resolve) => setTimeout(resolve, 500));

    await execAsync(
      `powershell -Command "Enable-NetAdapter -Name '${adapterName}' -Confirm:$false"`,
      { encoding: "utf8" }
    );

    return {
      success: true,
      message: `MAC 地址已成功修改为 ${normalizedMac}`,
      originalMac: originalMacTrimmed,
    };
  } catch (error) {
    return {
      success: false,
      message: `修改 Windows MAC 地址失败: ${error.message}`,
    };
  }
}

async function changeMacAddress(adapterName, newMac) {
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

async function restoreMacOSMacAddress(adapterName, originalMac) {
  try {
    const normalizedMac = normalizeMacAddress(originalMac);

    try {
      await execAsync(`sudo ifconfig ${adapterName} down`, {
        encoding: "utf8",
      });
    } catch (e) {
      // 某些网卡可能不需要 down
    }

    await new Promise((resolve) => setTimeout(resolve, 200));

    await execAsync(`sudo ifconfig ${adapterName} ether ${normalizedMac}`, {
      encoding: "utf8",
    });

    await new Promise((resolve) => setTimeout(resolve, 200));

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
  } catch (error) {
    return {
      success: false,
      message: `恢复 macOS MAC 地址失败: ${error.message}`,
    };
  }
}

async function restoreWindowsMacAddress(adapterName, originalMac) {
  try {
    const normalizedMac = normalizeMacAddress(originalMac);

    await execAsync(
      `powershell -Command "Disable-NetAdapter -Name '${adapterName}' -Confirm:$false"`,
      { encoding: "utf8" }
    );

    await new Promise((resolve) => setTimeout(resolve, 500));

    const setMacCommand = `Set-NetAdapter -Name '${adapterName}' -MacAddress '${normalizedMac}'`;
    await execAsync(`powershell -Command "${setMacCommand}"`, {
      encoding: "utf8",
    });

    await new Promise((resolve) => setTimeout(resolve, 500));

    await execAsync(
      `powershell -Command "Enable-NetAdapter -Name '${adapterName}' -Confirm:$false"`,
      { encoding: "utf8" }
    );

    return {
      success: true,
      message: `已恢复原始 MAC 地址: ${normalizedMac}`,
    };
  } catch (error) {
    return {
      success: false,
      message: `恢复 Windows MAC 地址失败: ${error.message}`,
    };
  }
}

async function restoreOriginalMac(adapterName, originalMac) {
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

module.exports = { changeMacAddress, restoreOriginalMac };
