/**
 * 测试辅助工具和 Mock 数据
 */

export const MOCK_ADAPTERS = {
  macOS: [
    {
      name: 'en0',
      description: 'Network Interface en0',
      macAddress: '00:11:22:33:44:55',
      status: 'Up'
    },
    {
      name: 'en1',
      description: 'Network Interface en1',
      macAddress: 'aa:bb:cc:dd:ee:ff',
      status: 'Down'
    }
  ],
  windows: [
    {
      name: 'Ethernet',
      description: 'Intel(R) Ethernet Connection (2) I219-V',
      macAddress: '00-11-22-33-44-55',
      status: 'Up'
    },
    {
      name: 'Wi-Fi',
      description: 'Intel(R) Wi-Fi 6 AX200 160MHz',
      macAddress: 'AA-BB-CC-DD-EE-FF',
      status: 'Disconnected'
    }
  ]
};

export const MOCK_MAC_ADDRESSES = {
  valid: [
    '00:11:22:33:44:55',
    '00-11-22-33-44-55',
    '001122334455',
    'AA:BB:CC:DD:EE:FF'
  ],
  invalid: [
    '', // 空
    '00:11:22:33:44', // 太短
    '00:11:22:33:44:55:66', // 太长
    '00:11:22:33:44:GG', // 非法字符
    'invalid', // 完全错误
    'XX:XX:XX:XX:XX:XX'  // X 不是十六进制
  ]
};

/**
 * Mock child_process.exec
 */
export const mockExec = (stdout: string, stderr = '') => {
  return jest.fn().mockImplementation((command: string, options: any, callback?: any) => {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }
    if (typeof callback === 'function') {
      callback(null, { stdout, stderr });
    }
    return Promise.resolve({ stdout, stderr });
  });
};

/**
 * Mock electron API
 */
export const mockElectron = () => {
  const electron = {
    app: {
      whenReady: jest.fn().mockResolvedValue(null),
      on: jest.fn(),
      quit: jest.fn()
    },
    BrowserWindow: jest.fn().mockImplementation(() => ({
      loadURL: jest.fn(),
      loadFile: jest.fn(),
      webContents: {
        openDevTools: jest.fn(),
        on: jest.fn()
      },
      on: jest.fn()
    })),
    ipcMain: {
      handle: jest.fn(),
      on: jest.fn(),
      removeHandler: jest.fn()
    }
  };
  return electron;
};

/**
 * 创建模拟的 IPC 事件
 */
export const createMockIpcEvent = (channel: string, data: any) => {
  return {
    sender: {
      send: jest.fn()
    },
    reply: jest.fn(),
    ...data
  };
};

/**
 * 等待条件满足
 */
export const waitFor = (condition: () => boolean, timeout = 5000): Promise<void> => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const check = () => {
      if (condition()) {
        resolve();
      } else if (Date.now() - startTime > timeout) {
        reject(new Error(`Timeout waiting for condition`));
      } else {
        setTimeout(check, 100);
      }
    };
    
    check();
  });
};

/**
 * 延迟函数
 */
export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};
