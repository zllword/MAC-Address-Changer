/**
 * MAC 地址格式验证
 * @param mac MAC 地址字符串
 * @returns 验证结果
 */
export function validateMacAddress(mac: string): {
  valid: boolean;
  message: string;
} {
  if (!mac) {
    return { valid: false, message: "MAC 地址不能为空" };
  }

  // 去除首尾空格
  const trimmedMac = mac.trim();

  if (!trimmedMac) {
    return { valid: false, message: "MAC 地址不能为空" };
  }

  // 支持多种格式的 MAC 地址
  // 00:11:22:33:44:55 或 00-11-22-33-44-55 或 001122334455
  const patterns = [
    /^([0-9A-Fa-f]{2}:){5}([0-9A-Fa-f]{2})$/, // 00:11:22:33:44:55
    /^([0-9A-Fa-f]{2}-){5}([0-9A-Fa-f]{2})$/, // 00-11-22-33-44-55
    /^([0-9A-Fa-f]{12})$/, // 001122334455
  ];

  const isValid = patterns.some((pattern) => pattern.test(trimmedMac));

  if (!isValid) {
    return {
      valid: false,
      message:
        "MAC 地址格式无效，请使用以下格式之一：\n00:11:22:33:44:55 或 00-11-22-33-44-55 或 001122334455",
    };
  }

  // 检查是否为广播地址或组播地址（第一个字节的第二个十六进制位为偶数表示单播）
  const cleanMac = trimmedMac.replace(/[:-]/g, "");
  const firstByte = parseInt(cleanMac.substring(0, 2), 16);
  const isMulticast = (firstByte & 0x01) !== 0;

  if (isMulticast) {
    return {
      valid: false,
      message:
        "MAC 地址不能是组播地址（第一个字节的第二个十六进制位必须为偶数）",
    };
  }

  return { valid: true, message: "MAC 地址格式正确" };
}

/**
 * 标准化 MAC 地址格式（统一转换为 xx:xx:xx:xx:xx:xx）
 * @param mac MAC 地址字符串（支持多种格式）
 * @returns 标准化后的 MAC 地址（xx:xx:xx:xx:xx:xx 格式）
 */
export function normalizeMacAddress(mac: string): string {
  if (!mac) {
    return "";
  }

  // 去除首尾空格
  const trimmedMac = mac.trim();

  // 移除所有分隔符
  const cleanMac = trimmedMac.replace(/[:-]/g, "");

  // 检查长度
  if (cleanMac.length !== 12) {
    return trimmedMac;
  }

  // 转换为小写并添加冒号分隔符
  return cleanMac.toLowerCase().match(/.{2}/g)?.join(":") || trimmedMac;
}

/**
 * 生成随机 MAC 地址（确保是单播地址）
 * @returns 随机生成的 MAC 地址（xx:xx:xx:xx:xx:xx 格式）
 */
export function generateRandomMac(): string {
  const hexDigits = "0123456789abcdef";
  let mac = "";

  for (let i = 0; i < 6; i++) {
    if (i > 0) mac += ":";

    if (i === 0) {
      // 第一个字节：确保是单播地址（第二个十六进制位必须是偶数）
      // 生成 0-255 的随机数，但确保最低位为偶数
      const firstByte = Math.floor(Math.random() * 256) & 0xfe; // 确保最低位为0（单播）
      const highNibble = (firstByte >> 4) & 0x0f;
      const lowNibble = firstByte & 0x0f;
      mac += hexDigits[highNibble] + hexDigits[lowNibble];
    } else {
      // 其他字节：完全随机
      for (let j = 0; j < 2; j++) {
        mac += hexDigits[Math.floor(Math.random() * 16)];
      }
    }
  }

  return mac;
}
