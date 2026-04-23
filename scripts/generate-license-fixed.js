import crypto from 'crypto';

const SECRET_KEY = 'GIFT_BOOK_LICENSE_KEY_2026_V1.0';

function generateLicense(machineId, name = '用户', days = null) {
    const payload = {
        mid: machineId,
        name: name,
        exp: days ? Math.floor(Date.now() / 1000) + days * 86400 : null
    };
    
    const jsonStr = JSON.stringify(payload);
    const data = Buffer.from(jsonStr)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/g, '');
        
    const sign = crypto
        .createHmac('sha256', SECRET_KEY)
        .update(data)
        .digest('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/g, '');
    
    const token = data + '.' + sign;
    
    // 正确的分组方式 - 每4个字符加短横线，保留原字符大小写
    let formatted = '';
    for (let i = 0; i < token.length; i += 4) {
        formatted += token.substring(i, i + 4);
        if (i + 4 < token.length) formatted += '-';
    }
    
    return formatted;
}

const args = process.argv.slice(2);
if (args.length === 0) {
    console.log('用法: node generate-license-fixed.js <机器码> [用户名] [天数]');
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
