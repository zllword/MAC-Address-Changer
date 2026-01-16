import { describe, test, expect } from 'vitest'
import { validateMacAddress, generateRandomMac, normalizeMacAddress } from '../validate';

describe('MAC 地址验证器', () => {
  describe('validateMacAddress', () => {
    test('应该接受有效的冒号分隔格式', () => {
      const result = validateMacAddress('00:11:22:33:44:55');
      expect(result.valid).toBe(true);
      expect(result.message).toContain('格式正确');
    });

    test('应该接受有效的连字符分隔格式', () => {
      const result = validateMacAddress('00-11-22-33-44-55');
      expect(result.valid).toBe(true);
    });

    test('应该接受无分隔符格式', () => {
      const result = validateMacAddress('001122334455');
      expect(result.valid).toBe(true);
    });

    test('应该接受混合大小写', () => {
      const result = validateMacAddress('AA:BB:CC:DD:EE:FF');
      expect(result.valid).toBe(true);
    });

    test('应该拒绝空字符串', () => {
      const result = validateMacAddress('');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('不能为空');
    });

    test('应该拒绝无效格式 - 字符不足', () => {
      const result = validateMacAddress('00:11:22:33:44');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('格式无效');
    });

    test('应该拒绝无效格式 - 包含非法字符', () => {
      const result = validateMacAddress('00:11:22:33:44:GG');
      expect(result.valid).toBe(false);
    });

    test('应该拒绝无效格式 - 单个分隔符', () => {
      const result = validateMacAddress('00:11:22:33:44:');
      expect(result.valid).toBe(false);
    });

    test('应该拒绝无效格式 - 包含字母 G-Z', () => {
      const result = validateMacAddress('00:11:22:33:44:5Z');
      expect(result.valid).toBe(false);
    });
  });

  describe('normalizeMacAddress', () => {
    test('应该将冒号分隔格式标准化', () => {
      const result = normalizeMacAddress('00:11:22:33:44:55');
      expect(result).toBe('00:11:22:33:44:55');
    });

    test('应该将连字符分隔格式标准化为冒号', () => {
      const result = normalizeMacAddress('00-11-22-33-44-55');
      expect(result).toBe('00:11:22:33:44:55');
    });

    test('应该将无分隔符格式添加冒号', () => {
      const result = normalizeMacAddress('001122334455');
      expect(result).toBe('00:11:22:33:44:55');
    });

    test('应该转换为小写', () => {
      const result = normalizeMacAddress('AA:BB:CC:DD:EE:FF');
      expect(result).toBe('aa:bb:cc:dd:ee:ff');
    });

    test('应该处理混合大小写和分隔符', () => {
      const result = normalizeMacAddress('Aa-Bb-Cc-Dd-Ee-Ff');
      expect(result).toBe('aa:bb:cc:dd:ee:ff');
    });
  });

  describe('generateRandomMac', () => {
    test('应该生成有效的 MAC 地址', () => {
      const mac = generateRandomMac();
      const result = validateMacAddress(mac);
      expect(result.valid).toBe(true);
    });

    test('应该生成冒号分隔的格式', () => {
      const mac = generateRandomMac();
      expect(mac).toMatch(/^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/);
    });

    test('应该每次生成不同的 MAC 地址', () => {
      const mac1 = generateRandomMac();
      const mac2 = generateRandomMac();
      expect(mac1).not.toBe(mac2);
    });

    test('应该生成小写的 MAC 地址', () => {
      const mac = generateRandomMac();
      expect(mac).toBe(mac.toLowerCase());
    });

    test('第一个字节的最低位应该是0（单播地址）', () => {
      // 生成多个 MAC 地址并检查
      for (let i = 0; i < 100; i++) {
        const mac = generateRandomMac();
        const firstByte = parseInt(mac.split(':')[0], 16);
        // 检查最低位（0x01 位）是否为 0
        expect(firstByte & 0x01).toBe(0);
      }
    });
  });
});
