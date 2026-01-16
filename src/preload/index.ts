import { contextBridge, ipcRenderer } from 'electron'

export interface NetworkAdapter {
  name: string
  description: string
  macAddress: string
  status: string
}

export interface ChangeMacResult {
  success: boolean
  message: string
  originalMac?: string
}

export interface ValidationResult {
  valid: boolean
  message: string
}

const electronAPI = {
  // 获取网络适配器列表
  getAdapters: (): Promise<{ success: boolean; data?: NetworkAdapter[]; error?: string }> =>
    ipcRenderer.invoke('get-adapters'),

  // 修改 MAC 地址
  changeMac: (adapterName: string, newMac: string): Promise<ChangeMacResult> =>
    ipcRenderer.invoke('change-mac', adapterName, newMac),

  // 恢复原始 MAC 地址
  restoreMac: (adapterName: string, originalMac: string): Promise<ChangeMacResult> =>
    ipcRenderer.invoke('restore-mac', adapterName, originalMac),

  // 验证 MAC 地址
  validateMac: (mac: string): Promise<ValidationResult> =>
    ipcRenderer.invoke('validate-mac', mac),

  // 生成随机 MAC 地址
  generateRandomMac: (): Promise<string> =>
    ipcRenderer.invoke('generate-random-mac')
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

export type ElectronAPI = typeof electronAPI
