import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  // 获取Nginx路径
  getNginxPath: () => ipcRenderer.invoke('get-nginx-path'),
  // 清除Nginx路径
  clearNginxPath: () => ipcRenderer.invoke('clear-nginx-path'),
  // 选择Nginx目录
  selectNginxDir: () => ipcRenderer.invoke('select-nginx-dir'),
  // 获取配置文件内容
  getConfigContent: () => ipcRenderer.invoke('get-config-content'),
  // 保存配置文件
  saveConfig: (content: string) => ipcRenderer.invoke('save-config', content),
  // 获取日志
  getLogs: () => ipcRenderer.invoke('get-logs'),
  // 启动Nginx
  startNginx: () => ipcRenderer.invoke('start-nginx'),
  // 停止Nginx
  stopNginx: () => ipcRenderer.invoke('stop-nginx'),
  // 重载Nginx
  reloadNginx: () => ipcRenderer.invoke('reload-nginx'),
  // 最小化到托盘
  minimizeToTray: () => ipcRenderer.invoke('minimize-to-tray'),
  // 显示主窗口
  showMainWindow: () => ipcRenderer.invoke('show-main-window'),
  // 退出应用
  quitApp: () => ipcRenderer.invoke('quit-app'),
  // 检查是否需要创建托盘
  checkTrayNeeded: () => ipcRenderer.invoke('check-tray-needed'),
  // 检查Nginx状态
  checkNginxStatus: () => ipcRenderer.invoke('check-nginx-status'),
  // 获取子配置文件列表
  getSubConfigFiles: () => ipcRenderer.invoke('get-sub-config-files'),
  // 获取子配置文件内容
  getSubConfigContent: (filename: string) => ipcRenderer.invoke('get-sub-config-content', filename),
  // 保存子配置文件
  saveSubConfig: (filename: string, content: string) => ipcRenderer.invoke('save-sub-config', filename, content),
  // 删除子配置文件
  deleteSubConfig: (filename: string) => ipcRenderer.invoke('delete-sub-config', filename),
  // 获取主配置文件内容
  getMainConfig: () => ipcRenderer.invoke('get-main-config'),
  // 保存主配置文件
  saveMainConfig: (content: string) => ipcRenderer.invoke('save-main-config', content),
  // 检查配置文件是否为模块化结构
  isModularConfig: () => ipcRenderer.invoke('is-modular-config'),
  // 备份原始配置文件
  backupOriginalConfig: () => ipcRenderer.invoke('backup-original-config'),
  // 创建模块化配置文件
  createModularConfig: () => ipcRenderer.invoke('create-modular-config'),
  // 选择目录
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  // 选择文件
  selectFile: (filters?: { name: string; extensions: string[] }[]) => ipcRenderer.invoke('select-file', filters)
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
