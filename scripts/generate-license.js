import crypto from 'crypto';

// 与 Rust 端一致的密钥
const SECRET_KEY = 'GIFT_BOOK_LICENSE_KEY_2026_V1.0'; // 替换为实际密钥

function generateLicense(machineId, name = '用户', days = null) {
  const payload = {
    mid: machineId,
    name: name,
    exp: days ? Math.floor(Date.now() / 1000) + days * 86400 : null
  };

  const jsonStr = JSON.stringify(payload);
  
  // 使用标准Base64然后转URL安全，确保Rust端能正确解码
  const data = Buffer.from(jsonStr)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, ''); // 去掉末尾填充，让Rust端自己补充

  const sign = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(data)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

  const token = data + '.' + sign; // ⚠️ 去掉 toUpperCase()！
  return token.match(/.{1,4}/g).join('-');
}

// 命令行调用
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('用法: node scripts/generate-license.js <机器码> [用户名] [天数]');
  console.log('示例: node scripts/generate-license.js ABCD-1234-EFGH 张三');
  console.log('      node scripts/generate-license.js ABCD-1234-EFGH 张三 365');
  process.exit(0);
}

const machineId = args[0];
const name = args[1] || '用户';
const days = args[2] ? parseInt(args[2]) : null;

const license = generateLicense(machineId, name, days);
console.log('\n======== 激活码生成成功 ========');
console.log(`机器码: ${machineId}`);
console.log(`用户名: ${name}`);
console.log(`有效期: ${days ? days + '天' : '永久'}`);
console.log(`激活码: ${license}`);
console.log('================================\n');
