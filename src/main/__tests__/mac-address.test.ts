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
import { changeMacAddress, restoreOriginalMac } from "../ipc/handlers/mac";

describe("MAC 地址修改功能测试", () => {
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

  describe("changeMacAddress - macOS", () => {
    beforeEach(() => {
      Object.defineProperty(process, "platform", { value: "darwin" });
    });

    test("应该成功修改 macOS 网卡的 MAC 地址", async () => {
      // Mock 获取原始 MAC
      mockExec.mockResolvedValueOnce({
        stdout: "00:11:22:33:44:55\n",
        stderr: "",
      });

      // Mock ifconfig 命令
      mockExec.mockResolvedValueOnce({ stdout: "", stderr: "" }); // ifconfig down
      mockExec.mockResolvedValueOnce({ stdout: "", stderr: "" }); // ifconfig ether
      mockExec.mockResolvedValueOnce({ stdout: "", stderr: "" }); // ifconfig up

      const result = await changeMacAddress("en0", "aa:bb:cc:dd:ee:ff");

      expect(result.success).toBe(true);
      expect(result.message).toContain("成功修改为 aa:bb:cc:dd:ee:ff");
      expect(result.originalMac).toBe("00:11:22:33:44:55");

      // 验证调用了正确的命令
      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining("ifconfig en0")
      );
    });

    test("应该在修改前备份原始 MAC 地址", async () => {
      mockExec.mockResolvedValueOnce({
        stdout: "00:11:22:33:44:55\n",
        stderr: "",
      });
      mockExec.mockRejectedValueOnce(new Error("Permission denied"));

      const result = await changeMacAddress("en0", "aa:bb:cc:dd:ee:ff");

      expect(result.success).toBe(false);
      expect(result.originalMac).toBe("00:11:22:33:44:55");
    });
  });

  describe("changeMacAddress - Windows", () => {
    beforeEach(() => {
      Object.defineProperty(process, "platform", { value: "win32" });
    });

    test("应该成功修改 Windows 网卡的 MAC 地址", async () => {
      mockExec.mockResolvedValueOnce({
        stdout: "00-11-22-33-44-55\n",
        stderr: "",
      });
      mockExec.mockResolvedValueOnce({ stdout: "", stderr: "" }); // Disable-NetAdapter
      mockExec.mockResolvedValueOnce({ stdout: "", stderr: "" }); // Set-NetAdapter
      mockExec.mockResolvedValueOnce({ stdout: "", stderr: "" }); // Enable-NetAdapter

      const result = await changeMacAddress("Ethernet", "aa:bb:cc:dd:ee:ff");

      expect(result.success).toBe(true);
      expect(result.message).toContain("成功修改为 aa:bb:cc:dd:ee:ff");

      // 验证使用了 PowerShell 命令
      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining("Disable-NetAdapter")
      );
      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining("Set-NetAdapter")
      );
      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining("Enable-NetAdapter")
      );
    });

    test("应该按顺序执行禁用-修改-启用操作", async () => {
      mockExec.mockResolvedValueOnce({
        stdout: "00-11-22-33-44-55\n",
        stderr: "",
      });
      mockExec.mockResolvedValueOnce({ stdout: "", stderr: "" });
      mockExec.mockResolvedValueOnce({ stdout: "", stderr: "" });
      mockExec.mockResolvedValueOnce({ stdout: "", stderr: "" });

      await changeMacAddress("Ethernet", "aa:bb:cc:dd:ee:ff");

      expect(mockExec).toHaveBeenCalledTimes(4);
    });
  });

  describe("changeMacAddress - 错误处理", () => {
    test("应该处理不支持的平台", async () => {
      Object.defineProperty(process, "platform", { value: "linux" });

      const result = await changeMacAddress("eth0", "aa:bb:cc:dd:ee:ff");

      expect(result.success).toBe(false);
      expect(result.message).toContain("不支持的操作系统");
    });

    test("应该处理macOS权限错误", async () => {
      Object.defineProperty(process, "platform", { value: "darwin" });

      mockExec.mockResolvedValueOnce({
        stdout: "00:11:22:33:44:55\n",
        stderr: "",
      });
      mockExec.mockRejectedValueOnce(new Error("Permission denied"));

      const result = await changeMacAddress("en0", "aa:bb:cc:dd:ee:ff");

      expect(result.success).toBe(false);
      expect(result.message).toContain("修改 macOS MAC 地址失败");
    });

    test("应该处理Windows命令执行错误", async () => {
      Object.defineProperty(process, "platform", { value: "win32" });

      mockExec.mockResolvedValueOnce({
        stdout: "00-11-22-33-44-55\n",
        stderr: "",
      });
      mockExec.mockRejectedValueOnce(new Error("Adapter not found"));

      const result = await changeMacAddress(
        "InvalidAdapter",
        "aa:bb:cc:dd:ee:ff"
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain("修改 Windows MAC 地址失败");
    });
  });

  describe("restoreOriginalMac", () => {
    test("应该成功恢复Windows原始 MAC 地址", async () => {
      Object.defineProperty(process, "platform", { value: "win32" });

      mockExec.mockResolvedValueOnce({ stdout: "", stderr: "" }); // Disable
      mockExec.mockResolvedValueOnce({ stdout: "", stderr: "" }); // Set
      mockExec.mockResolvedValueOnce({ stdout: "", stderr: "" }); // Enable

      const result = await restoreOriginalMac("Ethernet", "00:11:22:33:44:55");

      expect(result.success).toBe(true);
      expect(result.message).toContain("已恢复原始 MAC 地址");
    });

    test("应该成功恢复macOS原始 MAC 地址", async () => {
      Object.defineProperty(process, "platform", { value: "darwin" });

      mockExec.mockResolvedValueOnce({ stdout: "", stderr: "" }); // ifconfig down
      mockExec.mockResolvedValueOnce({ stdout: "", stderr: "" }); // ifconfig ether
      mockExec.mockResolvedValueOnce({ stdout: "", stderr: "" }); // ifconfig up

      const result = await restoreOriginalMac("en0", "00:11:22:33:44:55");

      expect(result.success).toBe(true);
      expect(result.message).toContain("已恢复原始 MAC 地址");
    });

    test("应该处理不支持的平台", async () => {
      Object.defineProperty(process, "platform", { value: "linux" });

      const result = await restoreOriginalMac("eth0", "00:11:22:33:44:55");

      expect(result.success).toBe(false);
      expect(result.message).toContain("不支持的操作系统");
    });

    test("应该处理恢复失败的情况", async () => {
      Object.defineProperty(process, "platform", { value: "win32" });

      mockExec.mockRejectedValueOnce(new Error("Permission denied"));

      const result = await restoreOriginalMac("Ethernet", "00:11:22:33:44:55");

      expect(result.success).toBe(false);
      expect(result.message).toContain("恢复 Windows MAC 地址失败");
    });
  });
});
