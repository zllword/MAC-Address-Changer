import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";

// Use vi.hoisted to ensure mock is created before module import
const { mockExec } = vi.hoisted(() => {
  // Create a mock function that can be used with mockResolvedValueOnce
  const mockExec = vi.fn();
  return { mockExec };
});

// Mock child_process.exec first
vi.mock("child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof import("child_process")>();
  return {
    ...actual,
    exec: vi.fn(),
  };
});

// Mock util.promisify to return our mock function
vi.mock("util", async () => {
  const actual = await vi.importActual<typeof import("util")>("util");
  return {
    ...actual,
    promisify: vi.fn((fn: any) => {
      // Return a function that matches the promisified exec signature
      // execAsync(command, options) returns Promise<{ stdout, stderr }>
      return mockExec;
    }) as typeof actual.promisify,
  };
});

// Import after mocks are set up
import { getAdapters, restartAdapter } from "../adapter";

describe("网络适配器获取功能测试", () => {
  let originalPlatform: string;

  beforeEach(() => {
    originalPlatform = process.platform;
    vi.clearAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(process, "platform", {
      value: originalPlatform,
    });
  });

  describe("getAdapters - macOS", () => {
    beforeEach(() => {
      Object.defineProperty(process, "platform", { value: "darwin" });
    });

    test("应该正确解析macOS网卡列表", async () => {
      mockExec.mockResolvedValue({
        stdout: `
en0: flags=8863<UP,BROADCAST,SMART,RUNNING,SIMPLEX,MULTICAST> mtu 1500
	options=646 <PERFORMNUD>
	ether 00:11:22:33:44:55
	media: autoselect (1000baseT <full-duplex>)
	status: active
en1: flags=8863<UP,BROADCAST,SMART,RUNNING,SIMPLEX,MULTICAST> mtu 1500
	ether 66:77:88:99:aa:bb
	media: autoselect (1000baseT <full-duplex>)
	status: inactive
`,
        stderr: "",
      });

      const adapters = await getAdapters();

      expect(adapters).toHaveLength(2);
      expect(adapters[0].name).toBe("en0");
      expect(adapters[0].macAddress).toBe("00:11:22:33:44:55");
      expect(adapters[0].status).toBe("Up");
      expect(adapters[1].name).toBe("en1");
      expect(adapters[1].status).toBe("Down");
    });

    test("应该过滤掉没有MAC地址的网卡", async () => {
      mockExec.mockResolvedValue({
        stdout: `
en0: flags=8863<UP,BROADCAST,SMART,RUNNING,SIMPLEX,MULTICAST> mtu 1500
	status: active
en1: flags=8863<UP,BROADCAST,SMART,RUNNING,SIMPLEX,MULTICAST> mtu 1500
	ether 66:77:88:99:aa:bb
	status: inactive
`,
        stderr: "",
      });

      const adapters = await getAdapters();

      expect(adapters).toHaveLength(1);
      expect(adapters[0].name).toBe("en1");
    });

    test("应该处理空网卡列表", async () => {
      mockExec.mockResolvedValue({ stdout: "", stderr: "" });

      const adapters = await getAdapters();

      expect(adapters).toHaveLength(0);
    });

    test("应该处理命令执行错误", async () => {
      mockExec.mockRejectedValue(new Error("Command failed"));

      await expect(getAdapters()).rejects.toThrow("获取 macOS 网卡列表失败");
    });
  });

  describe("getAdapters - Windows", () => {
    beforeEach(() => {
      Object.defineProperty(process, "platform", { value: "win32" });
    });

    test("应该正确解析Windows网卡列表", async () => {
      mockExec.mockResolvedValue({
        stdout: JSON.stringify([
          {
            Name: "Ethernet",
            InterfaceDescription: "Intel(R) Ethernet Connection",
            MacAddress: "00-11-22-33-44-55",
            Status: "Up",
          },
          {
            Name: "Wi-Fi",
            InterfaceDescription: "Intel(R) Wi-Fi 6 AX200",
            MacAddress: "AA-BB-CC-DD-EE-FF",
            Status: "Disconnected",
          },
        ]),
        stderr: "",
      });

      const adapters = await getAdapters();

      expect(adapters).toHaveLength(2);
      expect(adapters[0].name).toBe("Ethernet");
      expect(adapters[0].macAddress).toBe("00-11-22-33-44-55");
      expect(adapters[0].status).toBe("Up");
    });

    test("应该处理单个网卡的情况", async () => {
      mockExec.mockResolvedValue({
        stdout: JSON.stringify({
          Name: "Ethernet",
          InterfaceDescription: "Intel(R) Ethernet Connection",
          MacAddress: "00-11-22-33-44-55",
          Status: "Up",
        }),
        stderr: "",
      });

      const adapters = await getAdapters();

      expect(adapters).toHaveLength(1);
      expect(adapters[0].name).toBe("Ethernet");
    });

    test("应该处理空输出", async () => {
      mockExec.mockResolvedValue({ stdout: "", stderr: "" });

      const adapters = await getAdapters();

      expect(adapters).toHaveLength(0);
    });

    test("应该过滤掉无效的网卡数据", async () => {
      mockExec.mockResolvedValue({
        stdout: JSON.stringify([
          {
            Name: "Ethernet",
            MacAddress: "00-11-22-33-44-55",
            Status: "Up",
          },
          {
            Name: "Wi-Fi",
            // 缺少MacAddress
            Status: "Disconnected",
          },
        ]),
        stderr: "",
      });

      const adapters = await getAdapters();

      expect(adapters).toHaveLength(1);
      expect(adapters[0].name).toBe("Ethernet");
    });

    test("应该处理命令执行错误", async () => {
      mockExec.mockRejectedValue(new Error("PowerShell error"));

      await expect(getAdapters()).rejects.toThrow("获取 Windows 网卡列表失败");
    });
  });

  describe("getAdapters - 不支持的平台", () => {
    test("应该在Linux上抛出错误", async () => {
      Object.defineProperty(process, "platform", { value: "linux" });

      await expect(getAdapters()).rejects.toThrow("不支持的操作系统: linux");
    });
  });

  describe("restartAdapter", () => {
    test("应该在macOS上重启网卡", async () => {
      Object.defineProperty(process, "platform", { value: "darwin" });

      mockExec.mockResolvedValueOnce({ stdout: "Wi-Fi", stderr: "" }); // 获取服务名
      mockExec.mockResolvedValueOnce({ stdout: "", stderr: "" }); // 关闭
      mockExec.mockResolvedValueOnce({ stdout: "", stderr: "" }); // 打开

      await expect(restartAdapter("en0")).resolves.not.toThrow();
    });

    test("应该在Windows上重启网卡", async () => {
      Object.defineProperty(process, "platform", { value: "win32" });

      mockExec.mockResolvedValueOnce({ stdout: "", stderr: "" }); // 禁用
      mockExec.mockResolvedValueOnce({ stdout: "", stderr: "" }); // 启用

      await expect(restartAdapter("Ethernet")).resolves.not.toThrow();
    });

    test("应该处理重启失败", async () => {
      Object.defineProperty(process, "platform", { value: "win32" });

      mockExec.mockRejectedValue(new Error("Permission denied"));

      await expect(restartAdapter("Ethernet")).rejects.toThrow(
        "重启 Windows 网卡失败"
      );
    });
  });
});
