/// <reference types="vite/client" />

declare global {
  interface Window {
    electronAPI: {
      getAdapters: () => Promise<{
        success: boolean
        data?: Array<{
          name: string
          description: string
          macAddress: string
          status: string
        }>
        error?: string
      }>
      changeMac: (adapterName: string, newMac: string) => Promise<{
        success: boolean
        message: string
        originalMac?: string
      }>
      restoreMac: (adapterName: string, originalMac: string) => Promise<{
        success: boolean
        message: string
      }>
      validateMac: (mac: string) => Promise<{
        valid: boolean
        message: string
      }>
      generateRandomMac: () => Promise<string>
    }
  }
}

export {}
