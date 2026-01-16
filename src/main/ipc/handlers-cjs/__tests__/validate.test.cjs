const { validateMacAddress, generateRandomMac } = require('../validate.cjs');

describe('MAC 地址验证器 (CommonJS)', () => {
  describe('validateMacAddress', () => {
    test('应该接受有效的冒号分隔格式', () => {
      const result = validateMacAddress('00:11:22:33:44:55');
      expect(result.valid).toBe(true);
    });

    test('应该拒绝空字符串', () => {
      const result = validateMacAddress('');
      expect(result.valid).toBe(false);
    });

    test('应该拒绝无效格式', () => {
      const result = validateMacAddress('invalid');
      expect(result.valid).toBe(false);
    });
  });

  describe('generateRandomMac', () => {
    test('应该生成有效的 MAC 地址', () => {
      const mac = generateRandomMac();
      const result = validateMacAddress(mac);
      expect(result.valid).toBe(true);
    });

    test('应该每次生成不同的 MAC 地址', () => {
      const mac1 = generateRandomMac();
      const mac2 = generateRandomMac();
      expect(mac1).not.toBe(mac2);
    });
  });
});
