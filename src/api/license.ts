import { invoke } from '@tauri-apps/api/core'

export interface LicenseInfo {
  mid: string
  name: string
  exp: number | null
}

export const licenseAPI = {
  async getMachineId(): Promise<string> {
    return await invoke<string>('get_machine_id')
  },

  async verifyLicense(code: string): Promise<LicenseInfo> {
    return await invoke<LicenseInfo>('verify_license', { licenseCode: code })
  },

  async saveLicense(code: string): Promise<void> {
    return await invoke<void>('save_license', { licenseCode: code })
  },

  async getLicenseStatus(): Promise<LicenseInfo | null> {
    return await invoke<LicenseInfo | null>('get_license_status')
  },

  async isActivated(): Promise<boolean> {
    return await invoke<boolean>('is_activated')
  },

  async clearLicense(): Promise<void> {
    return await invoke<void>('clear_license')
  }
}

export default licenseAPI
