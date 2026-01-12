<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{
  'config-changed': [content: string]
}>()

const configContent = ref('')
const isEditing = ref(false)
const tempContent = ref('')
const saving = ref(false)
const error = ref('')

async function loadConfig() {
  try {
    const content = await window.api.getConfigContent()
    if (content) {
      configContent.value = content
      tempContent.value = content
    } else {
      error.value = '无法加载配置文件'
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载配置失败'
  }
}

async function saveConfig() {
  try {
    saving.value = true
    error.value = ''

    const result = await window.api.saveConfig(tempContent.value)

    if (result.success) {
      configContent.value = tempContent.value
      isEditing.value = false
      emit('config-changed', tempContent.value)
      error.value = '配置已保存'
      setTimeout(() => {
        error.value = ''
      }, 3000)
    } else if (result.error) {
      error.value = result.error
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : '保存配置失败'
  } finally {
    saving.value = false
  }
}

function startEdit() {
  tempContent.value = configContent.value
  isEditing.value = true
  error.value = ''
}

function cancelEdit() {
  tempContent.value = configContent.value
  isEditing.value = false
  error.value = ''
}

defineExpose({
  loadConfig
})
</script>

<template>
  <div class="config-container">
    <div class="config-header">
      <div class="header-left">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
        <h2>Nginx 配置文件</h2>
      </div>
      <div class="actions">
        <template v-if="!isEditing">
          <button @click="loadConfig" class="btn btn-secondary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="23 4 23 10 17 10"></polyline>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
            </svg>
            <span>刷新</span>
          </button>
          <button @click="startEdit" class="btn btn-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
            <span>编辑</span>
          </button>
        </template>
        <template v-else>
          <button @click="cancelEdit" class="btn btn-secondary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
            <span>取消</span>
          </button>
          <button @click="saveConfig" :disabled="saving" class="btn btn-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span>{{ saving ? '保存中...' : '保存' }}</span>
          </button>
        </template>
      </div>
    </div>

    <div v-if="error" :class="['message', error === '配置已保存' ? 'success' : 'error']">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <g v-if="error === '配置已保存'">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </g>
        <g v-else>
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </g>
      </svg>
      {{ error }}
    </div>

    <div class="config-content">
      <pre v-if="!isEditing && configContent" class="config-display">{{ configContent }}</pre>
      <textarea
        v-else-if="isEditing"
        v-model="tempContent"
        class="config-editor"
        spellcheck="false"
      />
      <div v-else class="placeholder">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
        </svg>
        <p>点击刷新按钮加载配置文件</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.config-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 1rem;
}

.config-header {
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
  gap: 0.75rem;
}

.btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  background: white;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 600;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.btn svg {
  width: 16px;
  height: 16px;
}

.btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.15);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
}

.btn-primary:hover:not(:disabled) {
  box-shadow: 0 3px 8px rgba(102, 126, 234, 0.4);
}

.btn-secondary {
  background: white;
  color: #64748b;
  border: 1px solid #cbd5e1;
}

.btn-secondary:hover:not(:disabled) {
  background: #f8fafc;
  border-color: #94a3b8;
}

.message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  margin: 0 1rem;
}

.message svg {
  width: 18px;
  height: 18px;
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

.config-content {
  flex: 1;
  padding: 1.5rem 2rem;
  overflow: hidden;
}

.config-display {
  width: 100%;
  height: 100%;
  overflow: auto;
  background: #1e1e1e;
  color: #d4d4d4;
  border-radius: 0.75rem;
  padding: 1.5rem;
  margin: 0;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 0.875rem;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
}

.config-editor {
  width: 100%;
  height: 100%;
  padding: 1.5rem;
  background: #1e1e1e;
  color: #d4d4d4;
  border: 2px solid #667eea;
  border-radius: 0.75rem;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 0.875rem;
  line-height: 1.6;
  resize: none;
  outline: none;
  transition: all 0.2s ease;
}

.config-editor:focus {
  border-color: #764ba2;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #94a3b8;
  gap: 1rem;
}

.placeholder svg {
  width: 48px;
  height: 48px;
  opacity: 0.5;
}

.placeholder p {
  margin: 0;
  font-size: 0.9375rem;
}
</style>
