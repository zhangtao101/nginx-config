import { app } from 'electron'
import { readFile, writeFile, access, constants, readdir, mkdir, unlink } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { exec, spawn } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export class NginxStore {
  private configPath: string
  private dataDir: string

  constructor() {
    this.dataDir = join(app.getPath('userData'), 'data')
    this.configPath = join(this.dataDir, 'config.json')
  }

  private async ensureDataDir(): Promise<void> {
    try {
      await access(this.dataDir)
    } catch {
      await mkdir(this.dataDir, { recursive: true })
    }
  }

  async getNginxPath(): Promise<string | null> {
    try {
      const data = await readFile(this.configPath, 'utf-8')
      const config = JSON.parse(data)
      return config.nginxPath || null
    } catch {
      return null
    }
  }

  async setNginxPath(nginxPath: string): Promise<void> {
    await this.ensureDataDir()
    const config = { nginxPath }
    await writeFile(this.configPath, JSON.stringify(config, null, 2))
  }

  async clearNginxPath(): Promise<void> {
    try {
      await this.ensureDataDir()
      const config = { nginxPath: null }
      await writeFile(this.configPath, JSON.stringify(config, null, 2))
    } catch {
      // 忽略错误
    }
  }

  async validateNginxPath(nginxPath: string): Promise<boolean> {
    try {
      const nginxExe = process.platform === 'win32' ? 'nginx.exe' : 'nginx'
      const nginxBin = join(nginxPath, nginxExe)
      await access(nginxBin, constants.X_OK)
      return true
    } catch {
      return false
    }
  }

  async getConfigPath(): Promise<string | null> {
    const nginxPath = await this.getNginxPath()
    if (!nginxPath) return null

    const confPath = join(nginxPath, 'conf', 'nginx.conf')
    if (existsSync(confPath)) {
      return confPath
    }
    return null
  }

  async getConfigContent(): Promise<string | null> {
    const configPath = await this.getConfigPath()
    if (!configPath) return null
    try {
      return await readFile(configPath, 'utf-8')
    } catch {
      return null
    }
  }

  async getConfDir(): Promise<string | null> {
    const nginxPath = await this.getNginxPath()
    if (!nginxPath) return null

    const confDir = join(nginxPath, 'conf', 'conf.d')
    return confDir
  }

  async ensureConfDir(): Promise<void> {
    const confDir = await this.getConfDir()
    if (confDir) {
      await mkdir(confDir, { recursive: true })
    }
  }

  async getSubConfigFiles(): Promise<string[]> {
    const confDir = await this.getConfDir()
    if (!confDir) return []

    try {
      const files = await readdir(confDir)
      return files.filter((file) => file.endsWith('.conf'))
    } catch {
      return []
    }
  }

  async getSubConfigContent(filename: string): Promise<string | null> {
    const confDir = await this.getConfDir()
    if (!confDir) return null

    const filePath = join(confDir, filename)
    try {
      return await readFile(filePath, 'utf-8')
    } catch {
      return null
    }
  }

  async saveSubConfig(filename: string, content: string): Promise<{ success: boolean; error?: string }> {
    const confDir = await this.getConfDir()
    if (!confDir) {
      return { success: false, error: '未找到conf.d目录' }
    }

    if (!filename.endsWith('.conf')) {
      return { success: false, error: '文件名必须以.conf结尾' }
    }

    try {
      await this.ensureConfDir()
      const filePath = join(confDir, filename)
      await writeFile(filePath, content, 'utf-8')
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '保存失败'
      }
    }
  }

  async deleteSubConfig(filename: string): Promise<{ success: boolean; error?: string }> {
    const confDir = await this.getConfDir()
    if (!confDir) {
      return { success: false, error: '未找到conf.d目录' }
    }

    try {
      const filePath = join(confDir, filename)
      await readFile(filePath, 'utf-8') // 先检查文件是否存在
      await unlink(filePath)
      return { success: true }
    } catch {
      return { success: false, error: '文件不存在或删除失败' }
    }
  }

  async getMainConfigContent(): Promise<string | null> {
    const configPath = await this.getConfigPath()
    if (!configPath) return null
    try {
      return await readFile(configPath, 'utf-8')
    } catch {
      return null
    }
  }

  async saveMainConfig(content: string): Promise<{ success: boolean; error?: string }> {
    const configPath = await this.getConfigPath()
    if (!configPath) {
      return { success: false, error: '未找到nginx.conf文件' }
    }

    try {
      await writeFile(configPath, content, 'utf-8')
      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : '保存失败' }
    }
  }

  async getLogs(): Promise<{ access: string; error: string }> {
    const nginxPath = await this.getNginxPath()
    if (!nginxPath) {
      return { access: '', error: '' }
    }

    const logsPath = join(nginxPath, 'logs')

    try {
      const files = await readdir(logsPath)
      let accessContent = ''
      let errorContent = ''

      for (const file of files) {
        const filePath = join(logsPath, file)
        try {
          const content = await readFile(filePath, 'utf-8')
          if (file.includes('access')) {
            accessContent = content
          } else if (file.includes('error')) {
            errorContent = content
          }
        } catch {
          // 忽略读取失败的文件
        }
      }

      return { access: accessContent, error: errorContent }
    } catch {
      return { access: '', error: '' }
    }
  }

  async startNginx(): Promise<{ success: boolean; output?: string; error?: string }> {
    const nginxPath = await this.getNginxPath()
    if (!nginxPath) {
      return { success: false, error: '未配置Nginx路径' }
    }

    try {
      const nginxExe = process.platform === 'win32' ? 'nginx.exe' : 'nginx'
      const nginxBin = join(nginxPath, nginxExe)

      // 使用 spawn 启动 nginx，不等待它完成
      const child = spawn(nginxBin, [], {
        cwd: nginxPath,
        detached: true,
        stdio: 'ignore',
        windowsHide: true
      })

      // 立即让子进程独立运行
      child.unref()

      return {
        success: true,
        output: '启动成功'
      }
    } catch (error) {
      const errorStr = error instanceof Error ? error.message : String(error)
      return {
        success: false,
        error: errorStr
      }
    }
  }

  async stopNginx(): Promise<{ success: boolean; output?: string; error?: string }> {
    const nginxPath = await this.getNginxPath()
    if (!nginxPath) {
      return { success: false, error: '未配置Nginx路径' }
    }

    try {
      const nginxExe = process.platform === 'win32' ? 'nginx.exe' : 'nginx'
      const nginxBin = join(nginxPath, nginxExe)
      const command = `"${nginxBin}" -s stop`

      // Nginx 的 -s stop 命令可能会返回错误码，但这不表示停止失败
      // 等待一小段时间后检查进程是否真的停止了
      await execAsync(command, {
        cwd: nginxPath,
        shell: true,
        windowsHide: true
      } as any)

      // 等待500ms让进程停止
      await new Promise((resolve) => setTimeout(resolve, 500))

      // 验证是否真的停止了
      const isRunning = await this.checkNginxStatus()

      if (isRunning) {
        // 如果进程还在运行，尝试强制结束
        if (process.platform === 'win32') {
          await execAsync('taskkill /F /IM nginx.exe', { shell: true } as any)
        } else {
          await execAsync('pkill -9 nginx', { shell: true } as any)
        }
      }

      return {
        success: true,
        output: '停止成功'
      }
    } catch (error) {
      const errorStr = error instanceof Error ? error.message : String(error)

      // 即使命令返回错误，检查进程是否真的停止了
      await new Promise((resolve) => setTimeout(resolve, 500))
      const isRunning = await this.checkNginxStatus()

      if (!isRunning) {
        return {
          success: true,
          output: '停止成功'
        }
      }

      return {
        success: false,
        error: errorStr
      }
    }
  }

  async reloadNginx(): Promise<{ success: boolean; output?: string; error?: string }> {
    const nginxPath = await this.getNginxPath()
    if (!nginxPath) {
      return { success: false, error: '未配置Nginx路径' }
    }

    try {
      const nginxExe = process.platform === 'win32' ? 'nginx.exe' : 'nginx'
      const nginxBin = join(nginxPath, nginxExe)
      const command = `"${nginxBin}" -s reload`

      const result = await execAsync(command, {
        cwd: nginxPath,
        shell: true,
        windowsHide: true
      } as any)

      const stdout =
        typeof result.stdout === 'string' ? result.stdout : result.stdout.toString('utf-8')
      const stderr =
        typeof result.stderr === 'string' ? result.stderr : result.stderr.toString('utf-8')

      return {
        success: true,
        output: stdout || '重载成功',
        error: stderr || undefined
      }
    } catch (error) {
      const errorStr = error instanceof Error ? error.message : String(error)
      return {
        success: false,
        error: errorStr
      }
    }
  }

  async checkNginxStatus(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const nginxExe = process.platform === 'win32' ? 'nginx.exe' : 'nginx'

        if (process.platform === 'win32') {
          // Windows 使用 tasklist 命令检查进程
          exec('tasklist', (error, stdout) => {
            if (error) {
              resolve(false)
              return
            }
            // 检查 nginx.exe 是否在进程列表中
            resolve(stdout.toLowerCase().includes(nginxExe))
          })
        } else {
          // Linux/Mac 使用 pgrep 或 ps 命令检查进程
          exec('pgrep -x nginx', (error) => {
            // 如果 error 为 null，说明进程存在
            resolve(!error)
          })
        }
      } catch {
        resolve(false)
      }
    })
  }

  // 检查配置文件是否为模块化结构
  async isModularConfig(): Promise<boolean> {
    const content = await this.getMainConfigContent()
    if (!content) return false

    // 检查是否包含 include conf.d/*.conf
    const hasIncludeConfD = content.includes('include conf.d/*.conf') ||
                            content.includes('include conf.d/*.conf;') ||
                            content.includes("include conf.d/*.conf")

    return hasIncludeConfD
  }

  // 备份原始配置文件
  async backupOriginalConfig(): Promise<{ success: boolean; backupPath?: string; error?: string }> {
    const configPath = await this.getConfigPath()
    if (!configPath) {
      return { success: false, error: '未找到配置文件' }
    }

    try {
      const content = await readFile(configPath, 'utf-8')
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
      const backupPath = configPath.replace('.conf', `.backup.${timestamp}.conf`)

      await writeFile(backupPath, content, 'utf-8')
      return { success: true, backupPath }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '备份失败'
      }
    }
  }

  // 创建模块化配置文件
  async createModularConfig(): Promise<{ success: boolean; error?: string }> {
    const configPath = await this.getConfigPath()
    if (!configPath) {
      return { success: false, error: '未找到配置文件' }
    }

    try {
      // 创建conf.d目录
      await this.ensureConfDir()

      // 创建新的模块化主配置
      const modularMainConfig = `# 主配置文件 - 模块化结构
worker_processes  1;

events {
    worker_connections  1024;
}

http {
    include       mime.types;
    default_type  application/octet-stream;

    sendfile        on;
    keepalive_timeout  65;

    # 包含子配置文件
    include conf.d/*.conf;
}
`

      await writeFile(configPath, modularMainConfig, 'utf-8')
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '创建模块化配置失败'
      }
    }
  }

  // 选择目录
  async selectDirectory(mainWindow: any): Promise<{ success: boolean; path?: string; error?: string }> {
    const { dialog } = require('electron')

    try {
      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory'],
        title: '选择目录'
      })

      if (!result.canceled && result.filePaths.length > 0) {
        return { success: true, path: result.filePaths[0] }
      }

      return { success: false, error: '未选择目录' }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '选择目录失败'
      }
    }
  }

  // 选择文件
  async selectFile(mainWindow: any, filters?: { name: string; extensions: string[] }[]): Promise<{ success: boolean; path?: string; error?: string }> {
    const { dialog } = require('electron')

    try {
      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        title: '选择文件',
        filters: filters || []
      })

      if (!result.canceled && result.filePaths.length > 0) {
        return { success: true, path: result.filePaths[0] }
      }

      return { success: false, error: '未选择文件' }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '选择文件失败'
      }
    }
  }
}
