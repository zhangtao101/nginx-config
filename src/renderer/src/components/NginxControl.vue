<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const emit = defineEmits<{
  'nginx-action': [action: string]
}>()

const status = ref<'stopped' | 'running'>('stopped')
const starting = ref(false)
const stopping = ref(false)
const reloading = ref(false)
const message = ref('')
const messageType = ref<'success' | 'error' | 'info'>('info')

let statusCheckInterval: ReturnType<typeof setInterval> | null = null

async function checkStatus(): Promise<void> {
  try {
    const result = await window.api.checkNginxStatus()
    console.log('Nginx status check:', result)
    status.value = result.running ? 'running' : 'stopped'
  } catch (err) {
    console.error('Status check error:', err)
    status.value = 'stopped'
  }
}

async function startNginx(): Promise<void> {
  try {
    starting.value = true
    const result = await window.api.startNginx()

    if (result.success) {
      message.value = result.output || '启动成功'
      messageType.value = 'success'
      emit('nginx-action', 'start')

      // 等待一段时间让Nginx启动，然后检查状态
      await new Promise((resolve) => setTimeout(resolve, 1000))
      await checkStatus()

      setTimeout(() => {
        message.value = ''
        messageType.value = 'info'
      }, 3000)
    } else {
      message.value = result.error || '启动失败'
      messageType.value = 'error'
    }
  } catch (err) {
    message.value = err instanceof Error ? err.message : '启动失败'
    messageType.value = 'error'
  } finally {
    starting.value = false
  }
}

async function stopNginx(): Promise<void> {
  try {
    stopping.value = true
    const result = await window.api.stopNginx()

    if (result.success) {
      message.value = result.output || '停止成功'
      messageType.value = 'success'
      // 重新检查实际状态
      await checkStatus()
      emit('nginx-action', 'stop')
      setTimeout(() => {
        message.value = ''
        messageType.value = 'info'
      }, 3000)
    } else {
      message.value = result.error || '停止失败'
      messageType.value = 'error'
    }
  } catch (err) {
    message.value = err instanceof Error ? err.message : '停止失败'
    messageType.value = 'error'
  } finally {
    stopping.value = false
  }
}

async function reloadNginx(): Promise<void> {
  try {
    reloading.value = true
    const result = await window.api.reloadNginx()

    if (result.success) {
      message.value = result.output || '重载成功'
      messageType.value = 'success'
      emit('nginx-action', 'reload')
      setTimeout(() => {
        message.value = ''
        messageType.value = 'info'
      }, 3000)
    } else {
      message.value = result.error || '重载失败'
      messageType.value = 'error'
    }
  } catch (err) {
    message.value = err instanceof Error ? err.message : '重载失败'
    messageType.value = 'error'
  } finally {
    reloading.value = false
  }
}

onMounted(() => {
  checkStatus()
  statusCheckInterval = setInterval(checkStatus, 5000)
})

onUnmounted(() => {
  if (statusCheckInterval) {
    clearInterval(statusCheckInterval)
  }
})

defineExpose({
  checkStatus
})
</script>

<template>
  <div class="control-container">
    <div class="status-card">
      <div class="status-icon" :class="status">
        <svg
          v-if="status === 'running'"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            d="M22 11.08V12a10 10 0 1 1-5.93-9.14"
            stroke-linecap="round"
            stroke-linejoin="round"
          ></path>
          <polyline
            points="22 4 12 14.01 9 11.01"
            stroke-linecap="round"
            stroke-linejoin="round"
          ></polyline>
        </svg>
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" stroke-linecap="round" stroke-linejoin="round"></circle>
          <line x1="15" y1="9" x2="9" y2="15" stroke-linecap="round" stroke-linejoin="round"></line>
          <line x1="9" y1="9" x2="15" y2="15" stroke-linecap="round" stroke-linejoin="round"></line>
        </svg>
      </div>
      <div class="status-info">
        <h2>{{ status === 'running' ? '运行中' : '已停止' }}</h2>
        <p>Nginx 服务状态</p>
      </div>
    </div>

    <div v-if="message" :class="['message', messageType]">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" v-if="messageType === 'success'"></circle>
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" v-if="messageType === 'success'"></path>
        <polyline points="22 4 12 14.01 9 11.01" v-if="messageType === 'success'"></polyline>
      </svg>
      {{ message }}
    </div>

    <div class="control-buttons">
      <button @click="startNginx" :disabled="starting || status === 'running'" class="btn btn-start">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
        <span>启动</span>
        <div v-if="starting" class="btn-loading"></div>
      </button>
      <button @click="stopNginx" :disabled="stopping || status === 'stopped'" class="btn btn-stop">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="6" y="4" width="4" height="16"></rect>
          <rect x="14" y="4" width="4" height="16"></rect>
        </svg>
        <span>停止</span>
        <div v-if="stopping" class="btn-loading"></div>
      </button>
      <button
        @click="reloadNginx"
        :disabled="reloading || status === 'stopped'"
        class="btn btn-reload"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21.5 2v6h-6M2.5 22v-6h6M2 12c0-5.5 4.5-10 10-10 3.5 0 6.5 1.8 8.3 4.5"></path>
          <path d="M12 22c5.5 0 10-4.5 10-10 0-3.5-1.8-6.5-4.5-8.3"></path>
        </svg>
        <span>重载配置</span>
        <div v-if="reloading" class="btn-loading"></div>
      </button>
    </div>

    <div class="info">
      <div class="info-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="16" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
      </div>
      <div class="info-content">
        <h3>操作提示</h3>
        <p>启动、停止和重载操作会影响 Nginx 服务。请确保在进行这些操作前已备份重要配置。</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.control-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 2.5rem;
  gap: 1.5rem;
  max-width: 900px;
  margin: 0 auto;
}

.status-card {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 2rem;
  background: white;
  border-radius: 1rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
}

.status-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
}

.status-icon {
  width: 80px;
  height: 80px;
  border-radius: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
  transition: all 0.3s ease;
}

.status-icon svg {
  width: 40px;
  height: 40px;
}

.status-icon.running {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  box-shadow: 0 4px 16px rgba(16, 185, 129, 0.4);
}

.status-icon.stopped {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  box-shadow: 0 4px 16px rgba(239, 68, 68, 0.4);
}

.status-info h2 {
  margin: 0 0 0.5rem 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: #1e293b;
}

.status-info p {
  margin: 0;
  font-size: 0.9375rem;
  color: #64748b;
}

.message {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-radius: 0.75rem;
  font-size: 0.9375rem;
  font-weight: 500;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message svg {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.message.success {
  background: #f0fdf4;
  color: #166534;
  border: 1px solid #bbf7d0;
}

.message.error {
  background: #fef2f2;
  color: #991b1b;
  border: 1px solid #fecaca;
}

.message.info {
  background: #f0f9ff;
  color: #0369a1;
  border: 1px solid #bae6fd;
}

.control-buttons {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.btn {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1.5rem 1rem;
  border: none;
  border-radius: 1rem;
  cursor: pointer;
  font-size: 0.9375rem;
  font-weight: 600;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.btn svg {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
}

.btn span {
  position: relative;
  z-index: 1;
}

.btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
}

.btn:active:not(:disabled) {
  transform: translateY(0);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.btn-start {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
}

.btn-stop {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
}

.btn-reload {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
}

.btn-loading {
  position: absolute;
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.info {
  display: flex;
  gap: 1rem;
  padding: 1.5rem;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-radius: 1rem;
  border-left: 4px solid #f59e0b;
}

.info-icon {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #b45309;
}

.info-icon svg {
  width: 24px;
  height: 24px;
}

.info-content h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: #92400e;
}

.info-content p {
  margin: 0;
  font-size: 0.875rem;
  color: #a16207;
  line-height: 1.6;
}
</style>
