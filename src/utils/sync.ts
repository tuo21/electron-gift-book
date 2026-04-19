import QRCode from 'qrcode'
import { fetch } from '@tauri-apps/plugin-http'
import type { BookInfo, GiftRecord, SyncQRData } from '../types/sync'

const CLOUD_ENV_ID = import.meta.env.VITE_CLOUD_ENV_ID || 'cloud1-2gfg2hme102e2828'

interface CloudFunctionResponse {
  errcode: number
  errmsg: string
  resp_data?: string
}

interface GetTokenResponse {
  success: boolean
  access_token?: string
  error?: string
  cached?: boolean
}

async function getAccessToken(): Promise<string> {
  console.log('[Sync] 开始获取 access_token，环境ID:', CLOUD_ENV_ID)

  const response = await fetch(
    `https://api.weixin.qq.com/tcb/invokecloudfunction?env=${CLOUD_ENV_ID}&name=getAccessToken`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    }
  )

  const result: CloudFunctionResponse = await response.json()
  console.log('[Sync] getAccessToken 原始响应:', JSON.stringify(result))

  // 处理响应数据
  let data: GetTokenResponse
  if (result.resp_data) {
    try {
      data = JSON.parse(result.resp_data)
    } catch (e) {
      console.error('[Sync] 解析 resp_data 失败:', e)
      throw new Error(`解析响应失败: ${result.resp_data}`)
    }
  } else {
    data = result as unknown as GetTokenResponse
  }

  console.log('[Sync] getAccessToken 解析后数据:', JSON.stringify(data))

  if (!data.success || !data.access_token) {
    const errorMsg = data.error || '获取 access_token 失败'
    console.error('[Sync] 获取 access_token 失败:', errorMsg)
    throw new Error(errorMsg)
  }

  console.log('[Sync] access_token', data.cached ? '(缓存)' : '(新获取)')
  return data.access_token
}

async function callCloudFunction<T = any>(functionName: string, data: any): Promise<T> {
  const accessToken = await getAccessToken()

  console.log('[Sync] 调用云函数:', functionName)

  const url = `https://api.weixin.qq.com/tcb/invokecloudfunction?access_token=${accessToken}&env=${CLOUD_ENV_ID}&name=${functionName}`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })

  const result: CloudFunctionResponse = await response.json()
  console.log('[Sync] 云函数响应:', JSON.stringify(result))

  if (result.errcode !== 0) {
    throw new Error(`云函数调用失败: ${result.errmsg}`)
  }

  return (result.resp_data ? JSON.parse(result.resp_data) : result) as T
}

export async function uploadAndGenerateQR(
  bookInfo: BookInfo,
  records: GiftRecord[]
): Promise<SyncQRData> {
  console.log('[Sync] 开始上传数据，礼金记录数:', records.length)

  const result = await callCloudFunction('syncImport', {
    action: 'upload',
    bookInfo,
    records,
  }) as { code?: number; message?: string; token: string; expiresAt: number }

  console.log('[Sync] 上传结果:', JSON.stringify(result))

  if (result.code !== 0) {
    throw new Error(result.message || '上传数据失败')
  }

  const { token, expiresAt } = result

  const qrContent = JSON.stringify({
    type: 'giftbook_sync',
    token,
    env: CLOUD_ENV_ID,
  })

  const qrDataUrl = await QRCode.toDataURL(qrContent, {
    width: 280,
    margin: 2,
    color: {
      dark: '#8B0000',
      light: '#FFF8F0',
    },
  })

  console.log('[Sync] 二维码生成成功')

  return { qrDataUrl, token, expiresAt }
}

export async function pollSyncStatus(
  token: string
): Promise<'pending' | 'success' | 'expired'> {
  console.log('[Sync] 轮询状态，token:', token)

  const result = await callCloudFunction('syncImport', {
    action: 'status',
    token,
  }) as { status: 'pending' | 'success' | 'expired' }

  console.log('[Sync] 状态:', result.status)

  return result.status
}
