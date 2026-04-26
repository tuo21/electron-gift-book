import crypto from 'crypto';

// 与 Rust 端一致的密钥
const SECRET_KEY = 'GIFT_BOOK_LICENSE_KEY_2026_V1.0';

function generateLicense(machineId, name = 'U', days = null) {
  // 只取机器码前8位（去掉横线后），缩短长度
  const shortMid = machineId.replace(/[-\s]/g, '').substring(0, 8).toUpperCase();
  
  const payload = {
    m: shortMid,  // 短字段名
    n: name.charAt(0),  // 只取用户名首字母
    e: days ? Math.floor(Date.now() / 1000) + days * 86400 : null  // 短字段名
  };

  const jsonStr = JSON.stringify(payload);
  
  // Base64 URL 编码
  const data = Buffer.from(jsonStr)
    .toString('base64url')  // 使用 base64url 直接编码
    .replace(/=+$/g, '');

  const sign = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(data)
    .digest('base64url')
    .replace(/=+$/g, '');

  const token = data + '.' + sign;
  
  // 更短的分组：每3个字符加短横线
  let formatted = '';
  for (let i = 0; i < token.length; i += 3) {
    formatted += token.substring(i, i + 3);
    if (i + 3 < token.length) formatted += '-';
  }
  
  return formatted;
}

// 命令行调用
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('用法: node generate-license-short.js <机器码> [用户名] [天数]');
  console.log('示例: node generate-license-short.js ABCD-1234-EFGH 张三');
  console.log('      node generate-license-short.js ABCD-1234-EFGH 张三 365');
  process.exit(0);
}

const machineId = args[0];
const name = args[1] || 'U';
const days = args[2] ? parseInt(args[2]) : null;

const license = generateLicense(machineId, name, days);
console.log('\n======== 短激活码生成成功 ========');
console.log(`机器码: ${machineId}`);
console.log(`短机器码: ${machineId.replace(/[-\s]/g, '').substring(0, 8).toUpperCase()}`);
console.log(`用户名: ${name}`);
console.log(`有效期: ${days ? days + '天' : '永久'}`);
console.log(`激活码: ${license}`);
console.log(`长度: ${license.length} 字符`);
console.log('==================================\n');
