import crypto from 'crypto';

// 与 Rust 端一致的密钥
const SECRET_KEY = 'GIFT_BOOK_LICENSE_KEY_2026_V1.0';

function generateLicense(machineId, name = '用户', days = null) {
  // 确保 machineId 格式清洗 - 去掉所有非字母数字
  const cleanMachineId = machineId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  console.log('清洗后的机器码:', cleanMachineId);

  const payload = {
    mid: machineId,  // 保留原始格式用于验证比较
    name: name,
    exp: days ? Math.floor(Date.now() / 1000) + days * 86400 : null
  };

  console.log('Payload:', JSON.stringify(payload));

  const jsonStr = JSON.stringify(payload);
  const data = Buffer.from(jsonStr).toString('base64url');
  console.log('Data (base64url):', data);

  const sign = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(data)
    .digest('base64url');
  console.log('Sign:', sign);

  const token = (data + '.' + sign).toUpperCase();
  const formatted = token.match(/.{1,4}/g).join('-');
  console.log('激活码:', formatted);

  return formatted;
}

// 命令行调用
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('用法: node scripts/debug-license.js <机器码> [用户名] [天数]');
  process.exit(0);
}

generateLicense(args[0], args[1], args[2]);
