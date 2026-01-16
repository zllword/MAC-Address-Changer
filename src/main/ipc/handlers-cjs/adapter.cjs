const { exec } = require("child_process");
const { promisify } = require("util");

const execAsync = promisify(exec);

async function getMacOSAdapters() {
  try {
    const { stdout } = await execAsync("ifconfig -a", {
      encoding: "utf8",
    });

    const adapters = [];
    const lines = stdout.split("\n");
    let currentAdapter = null;

    for (const line of lines) {
      const nameMatch = line.match(/^([a-z]+\d+):/);
      if (nameMatch) {
        if (currentAdapter && currentAdapter.name) {
          adapters.push(currentAdapter);
        }
        currentAdapter = {
          name: nameMatch[1],
          description: `Network Interface ${nameMatch[1]}`,
          macAddress: "",
          status: "",
        };
      }

      const macMatch = line.match(/ether\s+([a-fA-F0-9:]{17})/);
      if (macMatch && currentAdapter) {
        currentAdapter.macAddress = macMatch[1];
      }

      if (line.includes("status: active") && currentAdapter) {
        currentAdapter.status = "Up";
      } else if (line.includes("status: inactive") && currentAdapter) {
        currentAdapter.status = "Down";
      }
    }

    if (currentAdapter && currentAdapter.name && currentAdapter.macAddress) {
      adapters.push(currentAdapter);
    }

    return adapters.filter((adapter) => adapter.macAddress);
  } catch (error) {
    throw new Error(`获取 macOS 网卡列表失败: ${error.message}`);
  }
}

async function getWindowsAdapters() {
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
      .filter((adapter) => adapter && adapter.MacAddress && adapter.Name)
      .map((adapter) => ({
        name: adapter.Name || "",
        description: adapter.InterfaceDescription || "",
        macAddress: adapter.MacAddress || "",
        status: adapter.Status || "Unknown",
      }));
  } catch (error) {
    throw new Error(`获取 Windows 网卡列表失败: ${error.message}`);
  }
}

async function getAdapters() {
  const platform = process.platform;

  if (platform === "darwin") {
    return getMacOSAdapters();
  } else if (platform === "win32") {
    return getWindowsAdapters();
  } else {
    throw new Error(`不支持的操作系统: ${platform}`);
  }
}

async function restartMacOSAdapter(adapterName) {
  try {
    const { execSync } = require("child_process");
    const service = execSync(`networksetup -listallhardwareports | grep -A 1 "Device: ${adapterName}" | grep "Hardware Port" | awk '{print $3}'`, {
      encoding: "utf8"
    }).trim().catch(() => adapterName);

    await execAsync(`networksetup -setairportpower ${service} off`, {
      encoding: "utf8",
    });

    await new Promise((resolve) => setTimeout(resolve, 500));

    await execAsync(`networksetup -setairportpower ${service} on`, {
      encoding: "utf8",
    });
  } catch (error) {
    throw new Error(`重启 macOS 网卡失败: ${error.message}`);
  }
}

async function restartWindowsAdapter(adapterName) {
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
  } catch (error) {
    throw new Error(`重启 Windows 网卡失败: ${error.message}`);
  }
}

async function restartAdapter(adapterName) {
  const platform = process.platform;

  if (platform === "darwin") {
    return restartMacOSAdapter(adapterName);
  } else if (platform === "win32") {
    return restartWindowsAdapter(adapterName);
  } else {
    throw new Error(`不支持的操作系统: ${platform}`);
  }
}

module.exports = { getAdapters, restartAdapter };
