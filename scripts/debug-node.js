import crypto from 'crypto';

const SECRET_KEY = 'GIFT_BOOK_LICENSE_KEY_2026_V1.0';

function debugGenerate(machineId, name = '用户', days = null) {
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
        .digest(); // 直接返回Buffer字节
        
    console.log('Node.js数据:');
    console.log('  Data:', data);
    console.log('  Sign bytes:', Array.from(sign));
}

debugGenerate('8037-43F4-69');
