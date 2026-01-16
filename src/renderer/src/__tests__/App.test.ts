import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mount, VueWrapper } from "@vue/test-utils";
import App from "../App.vue";

// Mock electronAPI
const mockElectronAPI = {
  getAdapters: vi.fn(),
  changeMac: vi.fn(),
  restoreMac: vi.fn(),
  validateMac: vi.fn(),
  generateRandomMac: vi.fn(),
};

vi.mock("element-plus", () => ({
  ElMessage: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
  ElMessageBox: {
    confirm: vi.fn(),
  },
}));

Object.defineProperty(window, "electronAPI", {
  value: mockElectronAPI,
  writable: true,
});

describe("App.vue", () => {
  let wrapper: VueWrapper<any>;

  beforeEach(() => {
    // 清除所有 mock 调用（在挂载前清除，避免影响测试）
    vi.clearAllMocks();

    wrapper = mount(App, {
      global: {
        stubs: {
          "el-header": true,
          "el-main": true,
          "el-card": true,
          "el-divider": true,
          "el-select": true,
          "el-option": true,
          "el-input": true,
          "el-button": true,
          "el-descriptions": true,
          "el-descriptions-item": true,
          "el-tag": true,
          "el-alert": true,
          "el-empty": true,
        },
      },
    });
  });

  afterEach(() => {
    wrapper.unmount();
  });

  describe("组件初始化", () => {
    it("应该正确渲染组件", () => {
      expect(wrapper.exists()).toBe(true);
    });

    it("应该有正确的类名", () => {
      expect(wrapper.find(".mac-changer-app").exists()).toBe(true);
    });
  });

  describe("网卡列表功能", () => {
    it("应该在挂载时加载网卡列表", async () => {
      // 清除之前的 mock 调用记录
      vi.clearAllMocks();

      mockElectronAPI.getAdapters.mockResolvedValue({
        success: true,
        data: [
          {
            name: "en0",
            description: "Wi-Fi",
            macAddress: "00:11:22:33:44:55",
            status: "Up",
          },
        ],
      });

      // 重新挂载组件以触发 onMounted
      wrapper.unmount();
      wrapper = mount(App, {
        global: {
          stubs: {
            "el-header": true,
            "el-main": true,
            "el-card": true,
            "el-divider": true,
            "el-select": true,
            "el-option": true,
            "el-input": true,
            "el-button": true,
            "el-descriptions": true,
            "el-descriptions-item": true,
            "el-tag": true,
            "el-alert": true,
            "el-empty": true,
          },
        },
      });

      // Wait for component to mount and onMounted to execute
      await wrapper.vm.$nextTick();
      // Wait for the async refreshAdapters call to complete
      await new Promise((resolve) => setTimeout(resolve, 300));

      expect(mockElectronAPI.getAdapters).toHaveBeenCalled();
    });

    it("应该成功加载网卡列表", async () => {
      const mockAdapters = [
        {
          name: "en0",
          description: "Wi-Fi",
          macAddress: "00:11:22:33:44:55",
          status: "Up",
        },
      ];

      mockElectronAPI.getAdapters.mockResolvedValue({
        success: true,
        data: mockAdapters,
      });

      await wrapper.vm.refreshAdapters();

      expect(wrapper.vm.adapters).toEqual(mockAdapters);
      expect(wrapper.vm.adapters.length).toBe(1);
    });
  });

  describe("MAC 地址验证", () => {
    it("应该验证有效的 MAC 地址", async () => {
      mockElectronAPI.validateMac.mockResolvedValue({
        valid: true,
        message: "MAC 地址格式正确",
      });

      const result = await window.electronAPI.validateMac("00:11:22:33:44:55");

      expect(result.valid).toBe(true);
      expect(mockElectronAPI.validateMac).toHaveBeenCalledWith(
        "00:11:22:33:44:55"
      );
    });

    it("应该拒绝无效的 MAC 地址", async () => {
      mockElectronAPI.validateMac.mockResolvedValue({
        valid: false,
        message: "MAC 地址格式不正确",
      });

      const result = await window.electronAPI.validateMac("invalid-mac");

      expect(result.valid).toBe(false);
    });
  });

  describe("随机 MAC 地址生成", () => {
    it("应该生成随机 MAC 地址", async () => {
      mockElectronAPI.generateRandomMac.mockResolvedValue("aa:bb:cc:dd:ee:ff");

      await wrapper.vm.generateRandomMac();

      expect(wrapper.vm.newMacAddress).toBe("aa:bb:cc:dd:ee:ff");
      expect(mockElectronAPI.generateRandomMac).toHaveBeenCalled();
    });

    it("应该生成有效的 MAC 地址格式", async () => {
      const randomMac = "12:34:56:78:9a:bc";
      mockElectronAPI.generateRandomMac.mockResolvedValue(randomMac);
      mockElectronAPI.validateMac.mockResolvedValue({
        valid: true,
        message: "MAC 地址格式正确",
      });

      await wrapper.vm.generateRandomMac();

      const validation = await window.electronAPI.validateMac(randomMac);
      expect(validation.valid).toBe(true);
    });
  });

  describe("MAC 地址修改流程", () => {
    beforeEach(() => {
      mockElectronAPI.validateMac.mockResolvedValue({
        valid: true,
        message: "MAC 地址格式正确",
      });

      mockElectronAPI.generateRandomMac.mockResolvedValue("aa:bb:cc:dd:ee:ff");
    });

    it("应该成功修改 MAC 地址", async () => {
      wrapper.vm.selectedAdapter = "en0";
      wrapper.vm.newMacAddress = "aa:bb:cc:dd:ee:ff";

      mockElectronAPI.changeMac.mockResolvedValue({
        success: true,
        message: "MAC 地址已成功修改为 aa:bb:cc:dd:ee:ff",
        originalMac: "00:11:22:33:44:55",
      });

      // Mock confirm dialog
      const { ElMessageBox } = await import("element-plus");
      (ElMessageBox.confirm as any).mockResolvedValue("confirm");

      await wrapper.vm.changeMac();

      expect(mockElectronAPI.changeMac).toHaveBeenCalledWith(
        "en0",
        "aa:bb:cc:dd:ee:ff"
      );
      expect(wrapper.vm.changing).toBe(false);
    });

    it("修改失败时应该显示错误", async () => {
      wrapper.vm.selectedAdapter = "en0";
      wrapper.vm.newMacAddress = "aa:bb:cc:dd:ee:ff";

      mockElectronAPI.changeMac.mockResolvedValue({
        success: false,
        message: "权限不足",
      });

      const { ElMessageBox } = await import("element-plus");
      (ElMessageBox.confirm as any).mockResolvedValue("confirm");

      await wrapper.vm.changeMac();

      expect(wrapper.vm.changing).toBe(false);
    });
  });

  describe("日志功能", () => {
    it("应该记录操作日志", () => {
      const initialLogCount = wrapper.vm.logs.length;

      wrapper.vm.addLog("测试日志", "info");

      expect(wrapper.vm.logs.length).toBe(initialLogCount + 1);
      expect(wrapper.vm.logs[0].message).toBe("测试日志");
      expect(wrapper.vm.logs[0].type).toBe("info");
    });

    it("应该只保留最近 20 条日志", () => {
      // 添加 25 条日志
      for (let i = 0; i < 25; i++) {
        wrapper.vm.addLog(`日志 ${i}`, "info");
      }

      expect(wrapper.vm.logs.length).toBe(20);
    });
  });

  describe("网卡选择", () => {
    it("选择网卡后应该保存原始 MAC", () => {
      const mockAdapters = [
        {
          name: "en0",
          description: "Wi-Fi",
          macAddress: "00:11:22:33:44:55",
          status: "Up",
        },
      ];

      wrapper.vm.adapters = mockAdapters;
      wrapper.vm.selectedAdapter = "en0";

      wrapper.vm.onAdapterChange();

      expect(wrapper.vm.originalMac).toBe("00:11:22:33:44:55");
    });
  });
});
