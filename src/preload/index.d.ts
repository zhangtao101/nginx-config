import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      getNginxPath: () => Promise<string | null>
      clearNginxPath: () => Promise<{ success: boolean }>
      selectNginxDir: () => Promise<{ success: boolean; path?: string; error?: string }>
      getConfigContent: () => Promise<string | null>
      saveConfig: (content: string) => Promise<{ success: boolean; error?: string }>
      getLogs: () => Promise<{ access: string; error: string }>
      startNginx: () => Promise<{ success: boolean; output?: string; error?: string }>
      stopNginx: () => Promise<{ success: boolean; output?: string; error?: string }>
      reloadNginx: () => Promise<{ success: boolean; output?: string; error?: string }>
      minimizeToTray: () => Promise<{ success: boolean }>
      showMainWindow: () => Promise<{ success: boolean }>
      quitApp: () => Promise<{ success: boolean }>
      checkTrayNeeded: () => Promise<{ success: boolean }>
      checkNginxStatus: () => Promise<{ running: boolean }>
      getSubConfigFiles: () => Promise<{ success: boolean; files: string[] }>
      getSubConfigContent: (filename: string) => Promise<{ success: boolean; content?: string; error?: string }>
      saveSubConfig: (filename: string, content: string) => Promise<{ success: boolean; error?: string }>
      deleteSubConfig: (filename: string) => Promise<{ success: boolean; error?: string }>
      getMainConfig: () => Promise<{ success: boolean; content?: string; error?: string }>
      saveMainConfig: (content: string) => Promise<{ success: boolean; error?: string }>
      isModularConfig: () => Promise<{ isModular: boolean }>
      backupOriginalConfig: () => Promise<{ success: boolean; backupPath?: string; error?: string }>
      createModularConfig: () => Promise<{ success: boolean; error?: string }>
      selectDirectory: () => Promise<{ success: boolean; path?: string; error?: string }>
      selectFile: (filters?: { name: string; extensions: string[] }[]) => Promise<{ success: boolean; path?: string; error?: string }>
    }
  }
}
