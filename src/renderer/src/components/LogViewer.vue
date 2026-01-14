<script setup lang="ts">
import { ref } from 'vue'

const logs = ref<{ access: string; error: string }>({ access: '', error: '' })
const activeTab = ref<'access' | 'error'>('error')
const loading = ref(false)
const autoRefresh = ref(false)
const showConfirmDialog = ref(false)
const maxLines = ref(5000)
let refreshInterval: NodeJS.Timeout | null = null

async function loadLogs() {
  try {
    loading.value = true
    logs.value = await window.api.getLogs(maxLines.value)
  } catch (err) {
    console.error('加载日志失败:', err)
  } finally {
    loading.value = false
  }
}

function toggleAutoRefresh() {
  autoRefresh.value = !autoRefresh.value

  if (autoRefresh.value) {
    loadLogs()
    refreshInterval = setInterval(loadLogs, 3000)
  } else {
    if (refreshInterval) {
      clearInterval(refreshInterval)
      refreshInterval = null
    }
  }
}

function openClearDialog() {
  showConfirmDialog.value = true
}

async function confirmClearLogs() {
  try {
    const result = await window.api.clearLogs()
    if (result.success) {
      logs.value = { access: '', error: '' }
    } else {
      alert('清空日志失败: ' + (result.error || '未知错误'))
    }
  } catch (err) {
    console.error('清空日志失败:', err)
    alert('清空日志失败，请检查Nginx路径配置')
  } finally {
    showConfirmDialog.value = false
  }
}

function cancelClearLogs() {
  showConfirmDialog.value = false
}

defineExpose({
  loadLogs
})
</script>

<template>
  <div class="logs-container">
    <div class="logs-header">
      <div class="header-left">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
        <h2>Nginx 日志</h2>
      </div>
      <div class="actions">
        <button @click="loadLogs" class="btn btn-secondary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 4 23 10 17 10"></polyline>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
          </svg>
          <span>刷新</span>
        </button>
        <button
          @click="toggleAutoRefresh"
          :class="['btn', autoRefresh ? 'btn-active' : 'btn-secondary']"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 12c0-5.5 4.5-10 10-10 3.5 0 6.5 1.8 8.3 4.5"></path>
            <path d="M12 22c5.5 0 10-4.5 10-10 0-3.5-1.8-6.5-4.5-8.3"></path>
          </svg>
          <span>{{ autoRefresh ? '停止自动刷新' : '自动刷新' }}</span>
        </button>
        <button @click="openClearDialog" class="btn btn-secondary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path
              d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
            ></path>
          </svg>
          <span>清空</span>
        </button>
      </div>
    </div>

    <div class="logs-tabs">
      <button
        @click="activeTab = 'access'"
        :class="['tab', activeTab === 'access' ? 'active' : '']"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
          <circle cx="12" cy="12" r="3"></circle>
        </svg>
        <span>访问日志</span>
      </button>
      <button @click="activeTab = 'error'" :class="['tab', activeTab === 'error' ? 'active' : '']">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <span>错误日志</span>
      </button>
    </div>

    <div class="logs-content">
      <div v-if="loading" class="loading">
        <div class="loading-spinner"></div>
        <p>加载中...</p>
      </div>
      <pre v-else-if="activeTab === 'access' && logs.access" class="log-content">{{
        logs.access
      }}</pre>
      <pre v-else-if="activeTab === 'error' && logs.error" class="log-content">{{
        logs.error
      }}</pre>
      <div v-else class="empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
        </svg>
        <p>暂无日志数据</p>
      </div>
    </div>

    <!-- 确认对话框 -->
    <div v-if="showConfirmDialog" class="dialog-overlay" @click.self="cancelClearLogs">
      <div class="dialog">
        <div class="dialog-header">
          <h3>确认清空日志</h3>
          <button @click="cancelClearLogs" class="dialog-close">&times;</button>
        </div>
        <div class="dialog-body">
          <p>确定要清空所有日志文件吗？此操作不可恢复。</p>
        </div>
        <div class="dialog-footer">
          <button @click="cancelClearLogs" class="btn btn-secondary">取消</button>
          <button @click="confirmClearLogs" class="btn btn-danger">确认清空</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.logs-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.logs-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  background: white;
  border-bottom: 1px solid #e2e8f0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.header-left svg {
  width: 24px;
  height: 24px;
  color: #64748b;
}

.header-left h2 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: #1e293b;
}

.actions {
  display: flex;
  gap: 0.5rem;
}

.btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  background: white;
  cursor: pointer;
  font-size: 0.8125rem;
  font-weight: 600;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.btn svg {
  width: 16px;
  height: 16px;
}

.btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.15);
}

.btn-active {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border: none;
}

.btn-active:hover {
  box-shadow: 0 3px 8px rgba(16, 185, 129, 0.4);
}

.btn-secondary {
  background: white;
  color: #64748b;
  border: 1px solid #cbd5e1;
}

.btn-secondary:hover {
  background: #f8fafc;
  border-color: #94a3b8;
}

.logs-tabs {
  display: flex;
  background: white;
  border-bottom: 2px solid #e2e8f0;
}

.tab {
  flex: 1;
  padding: 1rem 1.5rem;
  border: none;
  background: white;
  cursor: pointer;
  font-size: 0.9375rem;
  font-weight: 600;
  color: #64748b;
  border-bottom: 3px solid transparent;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.tab svg {
  width: 18px;
  height: 18px;
}

.tab:hover {
  background: #f8fafc;
  color: #667eea;
}

.tab.active {
  color: #667eea;
  border-bottom-color: #667eea;
  background: #f8fafc;
}

.logs-content {
  flex: 1;
  padding: 1.5rem 2rem;
  overflow: hidden;
  background: #f8fafc;
}

.loading,
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 1rem;
  color: #94a3b8;
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #e2e8f0;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.empty svg {
  width: 64px;
  height: 64px;
  opacity: 0.3;
}

.empty p {
  margin: 0;
  font-size: 0.9375rem;
}

.log-content {
  width: 100%;
  height: 100%;
  overflow: auto;
  background: #1e1e1e;
  color: #d4d4d4;
  border-radius: 0.75rem;
  padding: 1.5rem;
  margin: 0;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 0.8125rem;
  line-height: 1.6;
}

.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog {
  background: white;
  border-radius: 0.75rem;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  min-width: 400px;
  max-width: 90%;
  animation: dialogSlideIn 0.2s ease;
}

@keyframes dialogSlideIn {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #e2e8f0;
}

.dialog-header h3 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #1e293b;
}

.dialog-close {
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.375rem;
  transition: all 0.2s ease;
}

.dialog-close:hover {
  background: #f1f5f9;
  color: #1e293b;
}

.dialog-body {
  padding: 1.5rem;
}

.dialog-body p {
  margin: 0;
  color: #475569;
  font-size: 0.9375rem;
  line-height: 1.6;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid #e2e8f0;
}

.btn-danger {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
  border: none;
}

.btn-danger:hover {
  box-shadow: 0 3px 8px rgba(239, 68, 68, 0.4);
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
}
</style>
