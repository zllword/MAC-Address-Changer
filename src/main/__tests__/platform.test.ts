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
import { getAdapters } from "../ipc/handlers/adapter";

describe("平台检测", () => {
  let originalPlatform: string;

  beforeEach(() => {
    originalPlatform = process.platform;
    vi.clearAllMocks();
  });

  afterEach(() => {
    // 恢复原始平台
    Object.defineProperty(process, "platform", {
      value: originalPlatform,
    });
  });

  describe("getAdapters", () => {
    test("在 macOS 上应该使用 ifconfig 命令", async () => {
      Object.defineProperty(process, "platform", {
        value: "darwin",
      });

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
      expect(adapters[0].status).toBe("Up");
      expect(adapters[1].status).toBe("Down");
      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining("ifconfig")
      );
    });

    test("在 Windows 上应该使用 PowerShell 命令", async () => {
      Object.defineProperty(process, "platform", {
        value: "win32",
      });

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
      expect(adapters[0].status).toBe("Up");
      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining("powershell")
      );
    });

    test("在不支持的平台上应该抛出错误", async () => {
      Object.defineProperty(process, "platform", {
        value: "linux",
      });

      await expect(getAdapters()).rejects.toThrow("不支持的操作系统");
    });
  });
});
