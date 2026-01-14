import { ipcMain, dialog, BrowserWindow, Tray, Menu, app } from 'electron'
import { NginxStore } from './store'
import icon from '../../resources/icon.png?asset'

const nginxStore = new NginxStore()
let tray: Tray | null = null
let mainWindow: BrowserWindow | null = null

// 暴露创建托盘的函数到全局
;(global as any).trayCreated = false

export function createTray() {
  if (tray) {
    return
  }

  tray = new Tray(icon)
  ;(global as any).trayCreated = true

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '打开',
      click: () => {
        if (mainWindow) {
          mainWindow.show()
          mainWindow.focus()
        }
      }
    },
    {
      label: '退出',
      click: () => {
        quitApp()
      }
    }
  ])

  tray.setToolTip('Nginx配置管理')
  tray.setContextMenu(contextMenu)

  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show()
      mainWindow.focus()
    }
  })
}

function quitApp() {
  ;(app as any).isQuitting = true

  // 关闭所有窗口
  if (mainWindow) {
    mainWindow.close()
  }

  // 销毁托盘
  if (tray) {
    tray.destroy()
    tray = null
  }

  // 退出应用
  app.quit()
}

export function registerIpcHandlers(mainWin: BrowserWindow) {
  mainWindow = mainWin

  // 获取Nginx路径
  ipcMain.handle('get-nginx-path', async () => {
    return await nginxStore.getNginxPath()
  })

  // 清除Nginx路径
  ipcMain.handle('clear-nginx-path', async () => {
    await nginxStore.clearNginxPath()
    return { success: true }
  })

  // 选择Nginx目录
  ipcMain.handle('select-nginx-dir', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openDirectory'],
      title: '选择Nginx安装目录'
    })

    if (!result.canceled && result.filePaths.length > 0) {
      const nginxPath = result.filePaths[0]
      const isValid = await nginxStore.validateNginxPath(nginxPath)

      if (isValid) {
        await nginxStore.setNginxPath(nginxPath)
        return { success: true, path: nginxPath }
      } else {
        return {
          success: false,
          error: '无效的Nginx目录，请在包含nginx可执行文件的目录中选择'
        }
      }
    }

    return { success: false, error: '未选择目录' }
  })

  // 获取配置文件内容
  ipcMain.handle('get-config-content', async () => {
    return await nginxStore.getConfigContent()
  })

  // 保存配置文件
  ipcMain.handle('save-config', async (_, content: string) => {
    return await nginxStore.saveMainConfig(content)
  })

  // 获取子配置文件列表
  ipcMain.handle('get-sub-config-files', async () => {
    const files = await nginxStore.getSubConfigFiles()
    return { success: true, files }
  })

  // 获取子配置文件内容
  ipcMain.handle('get-sub-config-content', async (_, filename: string) => {
    const content = await nginxStore.getSubConfigContent(filename)
    if (content !== null) {
      return { success: true, content }
    }
    return { success: false, error: '文件不存在' }
  })

  // 保存子配置文件
  ipcMain.handle('save-sub-config', async (_, filename: string, content: string) => {
    return await nginxStore.saveSubConfig(filename, content)
  })

  // 删除子配置文件
  ipcMain.handle('delete-sub-config', async (_, filename: string) => {
    return await nginxStore.deleteSubConfig(filename)
  })

  // 获取主配置文件内容
  ipcMain.handle('get-main-config', async () => {
    const content = await nginxStore.getMainConfigContent()
    if (content !== null) {
      return { success: true, content }
    }
    return { success: false, error: '主配置文件不存在' }
  })

  // 保存主配置文件
  ipcMain.handle('save-main-config', async (_, content: string) => {
    return await nginxStore.saveMainConfig(content)
  })

  // 获取日志
  ipcMain.handle('get-logs', async (_, maxLines?: number) => {
    return await nginxStore.getLogs(maxLines)
  })

  // 清空日志
  ipcMain.handle('clear-logs', async () => {
    return await nginxStore.clearLogs()
  })

  // 启动Nginx
  ipcMain.handle('start-nginx', async () => {
    return await nginxStore.startNginx()
  })

  // 停止Nginx
  ipcMain.handle('stop-nginx', async () => {
    return await nginxStore.stopNginx()
  })

  // 重载Nginx
  ipcMain.handle('reload-nginx', async () => {
    return await nginxStore.reloadNginx()
  })

  // 最小化到托盘
  ipcMain.handle('minimize-to-tray', async () => {
    if (mainWindow) {
      mainWindow.hide()
      if (!tray) {
        createTray()
      }
    }
    return { success: true }
  })

  // 显示主窗口
  ipcMain.handle('show-main-window', async () => {
    if (mainWindow) {
      mainWindow.show()
      mainWindow.focus()
    }
    return { success: true }
  })

  // 退出应用
  ipcMain.handle('quit-app', async () => {
    quitApp()
    return { success: true }
  })

  // 检查Nginx状态
  ipcMain.handle('check-nginx-status', async () => {
    const isRunning = await nginxStore.checkNginxStatus()
    return { running: isRunning }
  })

  // 检查配置文件是否为模块化结构
  ipcMain.handle('is-modular-config', async () => {
    const isModular = await nginxStore.isModularConfig()
    return { isModular }
  })

  // 备份原始配置文件
  ipcMain.handle('backup-original-config', async () => {
    return await nginxStore.backupOriginalConfig()
  })

  // 创建模块化配置文件
  ipcMain.handle('create-modular-config', async () => {
    return await nginxStore.createModularConfig()
  })

  // 选择目录
  ipcMain.handle('select-directory', async () => {
    return await nginxStore.selectDirectory(mainWindow)
  })

  // 选择文件
  ipcMain.handle('select-file', async (_, filters?: { name: string; extensions: string[] }[]) => {
    return await nginxStore.selectFile(mainWindow, filters)
  })
}

export function destroyTray() {
  if (tray) {
    tray.destroy()
    tray = null
  }
}
