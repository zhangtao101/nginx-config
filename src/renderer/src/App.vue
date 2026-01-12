<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Welcome from './components/Welcome.vue'
import ModularConfigEditor from './components/ModularConfigEditor.vue'
import LogViewer from './components/LogViewer.vue'
import NginxControl from './components/NginxControl.vue'

type TabType = 'control' | 'config' | 'logs'

const hasNginxPath = ref(false)
const activeTab = ref<TabType>('control')
const nginxPath = ref('')
const isReconfiguring = ref(false)

const logViewerRef = ref<InstanceType<typeof LogViewer>>()
const nginxControlRef = ref<InstanceType<typeof NginxControl>>()

async function handlePathSelected(path: string): Promise<void> {
  nginxPath.value = path
  hasNginxPath.value = true
  isReconfiguring.value = false

  // 检查配置文件是否为模块化结构
  const { isModular } = await window.api.isModularConfig()
  if (!isModular) {
    // 备份原始配置文件
    const backupResult = await window.api.backupOriginalConfig()
    if (backupResult.success && backupResult.backupPath) {
      console.log(`配置文件已备份到: ${backupResult.backupPath}`)

      // 创建模块化配置文件
      const createResult = await window.api.createModularConfig()
      if (createResult.success) {
        console.log('已成功创建模块化配置文件')
      } else {
        console.error('创建模块化配置文件失败:', createResult.error)
      }
    } else {
      console.error('备份配置文件失败:', backupResult.error)
    }
  }

  // 检查Nginx状态
  if (nginxControlRef.value) {
    await nginxControlRef.value.checkStatus()
  }
}

async function handleTabChange(tab: TabType): Promise<void> {
  activeTab.value = tab

  // 加载对应的数据
  if (tab === 'logs' && logViewerRef.value) {
    await logViewerRef.value.loadLogs()
  }
}

async function handleReconfigurePath(): Promise<void> {
  // 清除保存的路径
  await window.api.clearNginxPath()
  hasNginxPath.value = false
  nginxPath.value = ''
  isReconfiguring.value = true
}

onMounted(async () => {
  // 检查是否已经配置了Nginx路径
  const path = await window.api.getNginxPath()
  if (path) {
    nginxPath.value = path
    hasNginxPath.value = true

    // 检查配置文件是否为模块化结构
    const { isModular } = await window.api.isModularConfig()
    if (!isModular) {
      // 备份原始配置文件
      const backupResult = await window.api.backupOriginalConfig()
      if (backupResult.success && backupResult.backupPath) {
        console.log(`配置文件已备份到: ${backupResult.backupPath}`)

        // 创建模块化配置文件
        const createResult = await window.api.createModularConfig()
        if (createResult.success) {
          console.log('已成功创建模块化配置文件')
        } else {
          console.error('创建模块化配置文件失败:', createResult.error)
        }
      } else {
        console.error('备份配置文件失败:', backupResult.error)
      }
    }

    // 检查Nginx状态
    setTimeout(async () => {
      if (nginxControlRef.value) {
        await nginxControlRef.value.checkStatus()
      }
    }, 100)
  }
})
</script>

<template>
  <div class="app-container">
    <div v-if="!hasNginxPath" class="welcome-wrapper">
      <Welcome @path-selected="handlePathSelected" :reconfigure="isReconfiguring" />
    </div>

    <div v-else class="main-wrapper">
      <header class="app-header">
        <div class="app-logo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
          </svg>
          <span>Nginx 配置管理</span>
        </div>
        <div class="header-actions">
          <div class="path-display">
            <span>{{ nginxPath }}</span>
          </div>
          <button @click="handleReconfigurePath" class="btn-icon" title="重新配置路径">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 15m-15.357 2A8.001 8.001 0 0020 15m-6 0a6 6 0 11-12 0m6 0v6m0-6v6"></path>
            </svg>
          </button>
        </div>
      </header>

      <main class="content">
        <div class="tabs">
          <button
            :class="['tab-btn', { active: activeTab === 'control' }]"
            @click="handleTabChange('control')"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5 13.636m3.536 0L5 17.172l3.536 3.536m0-5.656l3.536-3.536m-6.364 0l3.536 3.536M21 12a9 9 0 11-18 0m9 9a9 9 0 01-18 0"></path>
            </svg>
            <span>控制</span>
          </button>
          <button
            :class="['tab-btn', { active: activeTab === 'config' }]"
            @click="handleTabChange('config')"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l6.414 6.414a1 1 0 01.293.707V15a2 2 0 01-2 2z"></path>
              <path d="M15 5h2v14h-2z"></path>
            </svg>
            <span>配置</span>
          </button>
          <button
            :class="['tab-btn', { active: activeTab === 'logs' }]"
            @click="handleTabChange('logs')"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l6.414 6.414a1 1 0 01.293.707V15a2 2 0 01-2 2z"></path>
              <path d="M15 5h2v14h-2z"></path>
            </svg>
            <span>日志</span>
          </button>
        </div>

        <div class="tab-content">
          <NginxControl v-show="activeTab === 'control'" ref="nginxControlRef" />
          <ModularConfigEditor v-show="activeTab === 'config'" />
          <LogViewer v-show="activeTab === 'logs'" ref="logViewerRef" />
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
}

.app-container {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.welcome-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.main-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.app-header {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  padding: 1.25rem 2rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 2px 20px rgba(0, 0, 0, 0.1);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
  z-index: 10;
}

.app-logo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1.125rem;
  font-weight: 600;
  color: #1e293b;
}

.app-logo svg {
  width: 28px;
  height: 28px;
  color: #667eea;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.path-display {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  color: #64748b;
  font-family: 'Consolas', 'Monaco', monospace;
  max-width: 400px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.btn-icon {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  padding: 0.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.btn-icon:hover {
  background: #667eea;
  border-color: #667eea;
  color: white;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.btn-icon svg {
  width: 18px;
  height: 18px;
  color: #64748b;
  transition: color 0.2s ease;
}

.btn-icon:hover svg {
  color: white;
}

.content {
  flex: 1;
  overflow: hidden;
  background: #f8f9fa;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.tabs {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  padding: 0 2rem;
  display: flex;
  gap: 0.25rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
}

.tab-btn {
  background: transparent;
  border: none;
  padding: 1rem 1.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9375rem;
  color: #64748b;
  font-weight: 500;
  transition: all 0.2s ease;
  position: relative;
  border-radius: 0.5rem 0.5rem 0 0;
}

.tab-btn:hover {
  background: #f1f5f9;
  color: #667eea;
}

.tab-btn.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.2);
}

.tab-btn svg {
  width: 18px;
  height: 18px;
}

.tab-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
</style>
