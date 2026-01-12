<script setup lang="ts">
import { ref, onMounted } from 'vue'

const props = defineProps<{
  reconfigure?: boolean
}>()

const emit = defineEmits<{
  'path-selected': [path: string]
}>()

const loading = ref(false)
const error = ref('')
const selectedPath = ref('')

async function selectDirectory() {
  try {
    loading.value = true
    error.value = ''

    const result = await window.api.selectNginxDir()

    if (result.success && result.path) {
      selectedPath.value = result.path
      emit('path-selected', result.path)
    } else if (result.error) {
      error.value = result.error
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : '选择目录失败'
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  // 如果是重新配置,不自动加载保存的路径,直接让用户选择
  if (props.reconfigure) {
    selectDirectory()
    return
  }

  // 先检查是否已有保存的nginx路径
  const savedPath = await window.api.getNginxPath()
  if (savedPath) {
    // 已有路径，直接使用
    selectedPath.value = savedPath
    emit('path-selected', savedPath)
  } else {
    // 没有路径，让用户选择
    selectDirectory()
  }
})
</script>

<template>
  <div class="welcome-container">
    <div class="welcome-content">
      <div class="logo-container">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path
            d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
            stroke-linecap="round"
            stroke-linejoin="round"
          ></path>
        </svg>
      </div>

      <h1>Nginx 配置管理</h1>
      <p class="description">欢迎使用 Nginx 配置可视化管理工具</p>

      <div v-if="loading" class="status">
        <div class="loading-spinner"></div>
        <p>正在选择目录...</p>
      </div>

      <div v-else-if="error" class="status error">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <p>{{ error }}</p>
        <button @click="selectDirectory" class="btn btn-primary">重新选择</button>
      </div>

      <div v-else-if="selectedPath" class="status success">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
        <p>已选择目录</p>
        <div class="path-display">{{ selectedPath }}</div>
      </div>

      <div v-else class="info-box">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="16" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
        <p>请选择包含 nginx.exe 的 Nginx 安装目录</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.welcome-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem;
}

.welcome-content {
  background: white;
  padding: 3rem;
  border-radius: 1.5rem;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  text-align: center;
  max-width: 520px;
  width: 100%;
}

.logo-container {
  width: 80px;
  height: 80px;
  margin: 0 auto 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4);
}

.logo-container svg {
  width: 48px;
  height: 48px;
}

h1 {
  color: #1e293b;
  margin-bottom: 0.5rem;
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: -0.5px;
}

.description {
  color: #64748b;
  margin-bottom: 2rem;
  font-size: 1.125rem;
  line-height: 1.6;
}

.status {
  padding: 2rem;
  border-radius: 1rem;
  margin-top: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.status svg {
  width: 48px;
  height: 48px;
}

.status p {
  color: #64748b;
  font-size: 1rem;
  line-height: 1.6;
  margin: 0;
}

.status.error {
  background: #fef2f2;
  border: 1px solid #fecaca;
}

.status.error svg {
  color: #dc2626;
}

.status.error p {
  color: #991b1b;
}

.status.success {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
}

.status.success svg {
  color: #16a34a;
}

.status.success p {
  color: #166534;
  font-weight: 600;
}

.path-display {
  background: white;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 0.875rem;
  color: #166534;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  word-break: break-all;
}

.info-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 2rem;
  background: #f0f9ff;
  border-radius: 1rem;
  margin-top: 1.5rem;
}

.info-box svg {
  width: 48px;
  height: 48px;
  color: #0284c7;
}

.info-box p {
  color: #0369a1;
  font-size: 1rem;
  line-height: 1.6;
  margin: 0;
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #f3f4f6;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  font-size: 0.9375rem;
  font-weight: 600;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
}

.btn-primary:active {
  transform: translateY(0);
}
</style>
