function normalizeMacAddress(mac) {
  // 移除所有分隔符，然后统一转换为冒号分隔
  const cleaned = mac.replace(/[^a-fA-F0-9]/g, "");
  const parts = cleaned.match(/.{1,2}/g) || [];
  return parts.join(":").toLowerCase();
}

function validateMacAddress(mac) {
  // 支持的格式: 00:11:22:33:44:55, 00-11-22-33-44-55, 001122334455
  const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$|^([0-9A-Fa-f]{12})$/;

  if (!mac || mac.trim() === "") {
    return {
      valid: false,
      message: "MAC 地址不能为空",
    };
  }

  if (!macRegex.test(mac.trim())) {
    return {
      valid: false,
      message: "MAC 地址格式不正确，请使用格式如 00:11:22:33:44:55",
    };
  }

  return {
    valid: true,
    message: "MAC 地址格式正确",
  };
}

function generateRandomMac() {
  const hexDigits = "0123456789ABCDEF";
  let mac = "";

  for (let i = 0; i < 6; i++) {
    if (i > 0) mac += ":";
    for (let j = 0; j < 2; j++) {
      mac += hexDigits[Math.floor(Math.random() * 16)];
    }
  }

  return mac.toLowerCase();
}

module.exports = { validateMacAddress, generateRandomMac };
