import crypto from 'crypto';

// 与 Rust 端一致的密钥
const SECRET_KEY = 'GIFT_BOOK_LICENSE_KEY_2026_V1.0';
const SIGN_BYTES = 6;  // 48位签名长度

/**
 * 标准 Base32 编码 (RFC 4648)
 * 字母表: ABCDEFGHIJKLMNOPQRSTUVWXYZ234567
 */
function encodeBase32(buffer) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += alphabet[(value << (5 - bits)) & 31];
  }

  return output;
}

/**
 * 生成短激活码（标准 Base32 编码）
 * 格式: XXXX-XXXX-XXXX-XXXX-XXXX (20~24字符)
 * 
 * 二进制结构:
 * - 6 bytes: 签名 (HMAC-SHA256 截断)
 * - 4 bytes: 机器码 (8位十六进制转4字节)
 * - 1 byte:  用户名首字母 ASCII
 * - 4 bytes: 过期时间戳 (可选, 大端序)
 * 
 * @param {string} machineId - 机器码 (如: 381C-7CEE-88)
 * @param {string} name - 用户名
 * @param {number|null} exp - 过期时间戳 (null为永久)
 * @returns {string} 短激活码
 */
function generateShortLicense(machineId, name = '用户', exp = null) {
  // 1. 解析机器码为4字节
  const midHex = machineId.replace(/[-\s]/g, '').substring(0, 8).toUpperCase();
  const midBytes = Buffer.from(midHex, 'hex');
  
  if (midBytes.length !== 4) {
    throw new Error('机器码格式错误');
  }

  // 2. 构建payload
  const nameChar = name.charCodeAt(0) || 0x7528; // 默认"用"
  
  let payload;
  if (exp !== null) {
    // 有过期时间: 4+1+4 = 9字节
    const expBuffer = Buffer.allocUnsafe(4);
    expBuffer.writeUInt32BE(exp >>> 0, 0); // 大端序
    payload = Buffer.concat([midBytes, Buffer.from([nameChar]), expBuffer]);
  } else {
    // 永久: 4+1 = 5字节
    payload = Buffer.concat([midBytes, Buffer.from([nameChar])]);
  }

  // 3. 计算HMAC-SHA256签名
  const hmac = crypto.createHmac('sha256', SECRET_KEY);
  hmac.update(payload);
  const fullSign = hmac.digest();

  // 4. 取前6字节签名
  const shortSign = fullSign.subarray(0, SIGN_BYTES);

  // 5. 合并 (签名 + payload)
  const combined = Buffer.concat([shortSign, payload]);

  // 6. 标准 Base32 编码（无填充）
  const token = encodeBase32(combined);

  // 7. 格式化为 XXXX-XXXX-XXXX-XXXX-XXXX 格式
  const cleanToken = token.toUpperCase();
  const grouped = cleanToken.match(/.{1,4}/g)?.join('-') || cleanToken;
  
  return grouped;
}

/**
 * 生成带有效期的激活码
 * @param {string} machineId - 机器码
 * @param {string} name - 用户名
 * @param {number} days - 有效天数
 * @returns {string} 短激活码
 */
function generateShortLicenseWithDays(machineId, name = '用户', days = 365) {
  const exp = Math.floor(Date.now() / 1000) + days * 86400;
  return generateShortLicense(machineId, name, exp);
}

// 命令行调用
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('\n======== 短激活码生成工具 v2.0 ========');
  console.log('用法: node scripts/generate-license-v2.js <机器码> [用户名] [天数]');
  console.log('');
  console.log('示例:');
  console.log('  永久激活: node scripts/generate-license-v2.js "381C-7CEE-88" "张三"');
  console.log('  一年有效: node scripts/generate-license-v2.js "381C-7CEE-88" "张三" 365');
  console.log('========================================\n');
  process.exit(0);
}

const machineId = args[0];
const name = args[1] || '用户';
const days = args[2] ? parseInt(args[2]) : null;

try {
  let license;
  if (days) {
    license = generateShortLicenseWithDays(machineId, name, days);
  } else {
    license = generateShortLicense(machineId, name, null);
  }

  console.log('\n======== 激活码生成成功 ========');
  console.log(`机器码: ${machineId}`);
  console.log(`短机器码: ${machineId.replace(/[-\s]/g, '').substring(0, 8)}`);
  console.log(`用户名: ${name} (${name.charAt(0)})`);
  console.log(`有效期: ${days ? days + '天' : '永久'}`);
  console.log(`激活码: ${license}`);
  console.log(`长度: ${license.length} 字符`);
  console.log('================================\n');
} catch (err) {
  console.error('生成失败:', err.message);
  process.exit(1);
}

// 导出供其他脚本使用
export { generateShortLicense, generateShortLicenseWithDays };
