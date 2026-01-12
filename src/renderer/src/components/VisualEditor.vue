<script setup lang="ts">
import { ref, computed, watch } from 'vue'

const emit = defineEmits<{
  'save-config': [content: string]
}>()

interface ServerConfig {
  listen: string
  serverName: string
  root: string
  index: string
  proxyTarget: string
  useProxy: boolean
  sslEnabled: boolean
  sslCert: string
  sslKey: string
  clientMaxBodySize: string
  keepaliveTimeout: string
  gzipEnabled: boolean
  cacheEnabled: boolean
  cacheTime: string
  accessLogEnabled: boolean
  errorLogEnabled: boolean
}

const config = ref<ServerConfig>({
  listen: '80',
  serverName: 'localhost',
  root: '',
  index: 'index.html index.htm',
  proxyTarget: '',
  useProxy: false,
  sslEnabled: false,
  sslCert: '',
  sslKey: '',
  clientMaxBodySize: '20M',
  keepaliveTimeout: '65',
  gzipEnabled: true,
  cacheEnabled: false,
  cacheTime: '1h',
  accessLogEnabled: true,
  errorLogEnabled: true
})

const errors = ref<Record<string, string>>({})
const showPreview = ref(true)

// 常用配置模板
const templates = [
  { name: '静态网站', value: 'static' },
  { name: '反向代理', value: 'proxy' },
  { name: 'HTTPS 网站', value: 'https' },
  { name: '负载均衡', value: 'loadbalance' }
]

const selectedTemplate = ref('')

// 监听模板变化
watch(selectedTemplate, (newTemplate) => {
  if (newTemplate === 'static') {
    config.value = {
      ...config.value,
      root: 'C:/www/html',
      index: 'index.html index.htm',
      useProxy: false,
      proxyTarget: ''
    }
  } else if (newTemplate === 'proxy') {
    config.value = {
      ...config.value,
      root: '',
      useProxy: true,
      proxyTarget: 'http://127.0.0.1:3000'
    }
  } else if (newTemplate === 'https') {
    config.value = {
      ...config.value,
      listen: '443 ssl',
      sslEnabled: true,
      sslCert: 'C:/ssl/cert.pem',
      sslKey: 'C:/ssl/key.pem'
    }
  }
})

// 生成配置文件
const generatedConfig = computed(() => {
  let nginxConfig = `server {
    listen ${config.value.listen};
    server_name ${config.value.serverName};
`

  // SSL 配置
  if (config.value.sslEnabled) {
    nginxConfig += `
    ssl_certificate ${config.value.sslCert};
    ssl_certificate_key ${config.value.sslKey};
`
  }

  // 根目录配置
  if (config.value.root && !config.value.useProxy) {
    nginxConfig += `
    root ${config.value.root};
    index ${config.value.index};
`
  }

  // 代理配置
  if (config.value.useProxy && config.value.proxyTarget) {
    nginxConfig += `
    location / {
        proxy_pass ${config.value.proxyTarget};
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
`
  } else if (config.value.root) {
    nginxConfig += `
    location / {
        try_files $uri $uri/ =404;
    }
`
  }

  // 其他配置
  if (config.value.clientMaxBodySize) {
    nginxConfig += `
    client_max_body_size ${config.value.clientMaxBodySize};
`
  }

  if (config.value.keepaliveTimeout) {
    nginxConfig += `
    keepalive_timeout ${config.value.keepaliveTimeout};
`
  }

  // Gzip 配置
  if (config.value.gzipEnabled) {
    nginxConfig += `
    gzip on;
    gzip_vary on;
    gzip_min_length 1000;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
`
  }

  // 日志配置
  if (config.value.accessLogEnabled) {
    nginxConfig += `
    access_log logs/access.log;
`
  }

  if (config.value.errorLogEnabled) {
    nginxConfig += `
    error_log logs/error.log;
`
  }

  nginxConfig += `
}
`

  return nginxConfig
})

// 验证配置
function validateConfig() {
  errors.value = {}

  if (!config.value.serverName) {
    errors.value.serverName = '请输入服务器名称'
  }

  if (config.value.sslEnabled) {
    if (!config.value.sslCert) {
      errors.value.sslCert = '请输入 SSL 证书路径'
    }
    if (!config.value.sslKey) {
      errors.value.sslKey = '请输入 SSL 私钥路径'
    }
  }

  if (config.value.useProxy && !config.value.proxyTarget) {
    errors.value.proxyTarget = '请输入代理目标地址'
  }

  if (!config.value.useProxy && !config.value.root) {
    errors.value.root = '请输入根目录路径或启用代理'
  }

  return Object.keys(errors.value).length === 0
}

// 保存配置
function handleSave() {
  if (validateConfig()) {
    emit('save-config', generatedConfig.value)
  }
}

// 导出配置
function exportConfig() {
  const blob = new Blob([generatedConfig.value], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'nginx-server.conf'
  a.click()
  URL.revokeObjectURL(url)
}

// 导入配置
function importConfig(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      // 简单的解析逻辑
      const listenMatch = content.match(/listen\s+([^;]+)/)
      const serverNameMatch = content.match(/server_name\s+([^;]+)/)
      const rootMatch = content.match(/root\s+([^;]+)/)
      const indexMatch = content.match(/index\s+([^;]+)/)
      const proxyMatch = content.match(/proxy_pass\s+([^;]+)/)
      const certMatch = content.match(/ssl_certificate\s+([^;]+)/)
      const keyMatch = content.match(/ssl_certificate_key\s+([^;]+)/)

      if (listenMatch) config.value.listen = listenMatch[1].trim()
      if (serverNameMatch) config.value.serverName = serverNameMatch[1].trim()
      if (rootMatch) config.value.root = rootMatch[1].trim()
      if (indexMatch) config.value.index = indexMatch[1].trim()
      if (proxyMatch) {
        config.value.useProxy = true
        config.value.proxyTarget = proxyMatch[1].trim()
      }
      if (certMatch) {
        config.value.sslEnabled = true
        config.value.sslCert = certMatch[1].trim()
      }
      if (keyMatch) {
        config.value.sslKey = keyMatch[1].trim()
      }
    }
    reader.readAsText(file)
  }
  input.value = ''
}

// 重置配置
function resetConfig() {
  config.value = {
    listen: '80',
    serverName: 'localhost',
    root: '',
    index: 'index.html index.htm',
    proxyTarget: '',
    useProxy: false,
    sslEnabled: false,
    sslCert: '',
    sslKey: '',
    clientMaxBodySize: '20M',
    keepaliveTimeout: '65',
    gzipEnabled: true,
    cacheEnabled: false,
    cacheTime: '1h',
    accessLogEnabled: true,
    errorLogEnabled: true
  }
  errors.value = {}
  selectedTemplate.value = ''
}
</script>

<template>
  <div class="visual-editor">
    <!-- 头部操作栏 -->
    <div class="editor-header">
      <h2>可视化配置编辑器</h2>
      <div class="header-actions">
        <button @click="exportConfig" class="btn btn-secondary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          <span>导出</span>
        </button>
        <label class="btn btn-secondary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          <span>导入</span>
          <input type="file" accept=".conf" @change="importConfig" hidden />
        </label>
        <button @click="resetConfig" class="btn btn-danger">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
          <span>重置</span>
        </button>
        <button @click="handleSave" class="btn btn-primary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
            <polyline points="17 21 17 13 7 13 7 21"></polyline>
            <polyline points="7 3 7 8 15 8"></polyline>
          </svg>
          <span>保存</span>
        </button>
      </div>
    </div>

    <div class="editor-content">
      <!-- 左侧配置表单 -->
      <div class="config-form">
        <!-- 模板选择 -->
        <div class="form-section">
          <h3>快速开始</h3>
          <div class="form-group">
            <label>配置模板</label>
            <select v-model="selectedTemplate" class="form-control">
              <option value="">-- 请选择模板 --</option>
              <option v-for="template in templates" :key="template.value" :value="template.value">
                {{ template.name }}
              </option>
            </select>
          </div>
        </div>

        <!-- 基本配置 -->
        <div class="form-section">
          <h3>基本配置</h3>
          <div class="form-group">
            <label>监听端口 <span class="required">*</span></label>
            <input
              v-model="config.listen"
              type="text"
              class="form-control"
              placeholder="例如: 80 或 443 ssl"
            />
          </div>
          <div class="form-group">
            <label>服务器名称 <span class="required">*</span></label>
            <input
              v-model="config.serverName"
              type="text"
              class="form-control"
              placeholder="例如: example.com"
              :class="{ error: errors.serverName }"
            />
            <span v-if="errors.serverName" class="error-message">{{ errors.serverName }}</span>
          </div>
        </div>

        <!-- 网站根目录或代理配置 -->
        <div class="form-section">
          <h3>网站设置</h3>
          <div class="form-group toggle-group">
            <label>配置模式</label>
            <div class="toggle-buttons">
              <button
                :class="['toggle-btn', !config.useProxy ? 'active' : '']"
                @click="config.useProxy = false"
              >
                静态网站
              </button>
              <button
                :class="['toggle-btn', config.useProxy ? 'active' : '']"
                @click="config.useProxy = true"
              >
                反向代理
              </button>
            </div>
          </div>

          <div v-if="!config.useProxy" class="form-group">
            <label>网站根目录 <span class="required">*</span></label>
            <input
              v-model="config.root"
              type="text"
              class="form-control"
              placeholder="例如: C:/www/html"
              :class="{ error: errors.root }"
            />
            <span v-if="errors.root" class="error-message">{{ errors.root }}</span>
          </div>

          <div v-if="config.useProxy" class="form-group">
            <label>代理目标地址 <span class="required">*</span></label>
            <input
              v-model="config.proxyTarget"
              type="text"
              class="form-control"
              placeholder="例如: http://127.0.0.1:3000"
              :class="{ error: errors.proxyTarget }"
            />
            <span v-if="errors.proxyTarget" class="error-message">{{ errors.proxyTarget }}</span>
          </div>

          <div v-if="!config.useProxy" class="form-group">
            <label>默认首页文件</label>
            <input
              v-model="config.index"
              type="text"
              class="form-control"
              placeholder="例如: index.html index.htm"
            />
          </div>
        </div>

        <!-- SSL 配置 -->
        <div class="form-section">
          <div class="section-header">
            <h3>SSL 证书配置</h3>
            <label class="switch">
              <input type="checkbox" v-model="config.sslEnabled" />
              <span class="slider"></span>
            </label>
          </div>

          <div v-if="config.sslEnabled" class="ssl-config">
            <div class="form-group">
              <label>证书文件路径 <span class="required">*</span></label>
              <input
                v-model="config.sslCert"
                type="text"
                class="form-control"
                placeholder="例如: C:/ssl/cert.pem"
                :class="{ error: errors.sslCert }"
              />
              <span v-if="errors.sslCert" class="error-message">{{ errors.sslCert }}</span>
            </div>
            <div class="form-group">
              <label>私钥文件路径 <span class="required">*</span></label>
              <input
                v-model="config.sslKey"
                type="text"
                class="form-control"
                placeholder="例如: C:/ssl/key.pem"
                :class="{ error: errors.sslKey }"
              />
              <span v-if="errors.sslKey" class="error-message">{{ errors.sslKey }}</span>
            </div>
          </div>
        </div>

        <!-- 性能优化 -->
        <div class="form-section">
          <h3>性能优化</h3>
          <div class="form-group">
            <label>客户端最大请求体大小</label>
            <select v-model="config.clientMaxBodySize" class="form-control">
              <option value="1M">1 MB</option>
              <option value="10M">10 MB</option>
              <option value="20M">20 MB</option>
              <option value="50M">50 MB</option>
              <option value="100M">100 MB</option>
              <option value="500M">500 MB</option>
            </select>
          </div>
          <div class="form-group">
            <label>连接保持超时 (秒)</label>
            <input
              v-model="config.keepaliveTimeout"
              type="number"
              class="form-control"
              placeholder="例如: 65"
            />
          </div>
          <div class="form-group">
            <div class="checkbox-group">
              <label class="checkbox-label">
                <input type="checkbox" v-model="config.gzipEnabled" />
                <span>启用 Gzip 压缩</span>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" v-model="config.cacheEnabled" />
                <span>启用缓存</span>
              </label>
            </div>
          </div>
          <div v-if="config.cacheEnabled" class="form-group">
            <label>缓存时间</label>
            <select v-model="config.cacheTime" class="form-control">
              <option value="30m">30 分钟</option>
              <option value="1h">1 小时</option>
              <option value="6h">6 小时</option>
              <option value="24h">1 天</option>
              <option value="7d">7 天</option>
            </select>
          </div>
        </div>

        <!-- 日志配置 -->
        <div class="form-section">
          <h3>日志配置</h3>
          <div class="form-group">
            <div class="checkbox-group">
              <label class="checkbox-label">
                <input type="checkbox" v-model="config.accessLogEnabled" />
                <span>启用访问日志</span>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" v-model="config.errorLogEnabled" />
                <span>启用错误日志</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧预览区域 -->
      <div class="preview-panel">
        <div class="preview-header">
          <h3>配置预览</h3>
          <button
            @click="showPreview = !showPreview"
            class="btn-icon"
            :title="showPreview ? '隐藏预览' : '显示预览'"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline :points="showPreview ? '18 15 12 9 6 15' : '9 18 15 12 9 6'"></polyline>
            </svg>
          </button>
        </div>
        <div v-if="showPreview" class="preview-content">
          <pre>{{ generatedConfig }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.visual-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: #f8f9fa;
}

.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem 2rem;
  background: white;
  border-bottom: 1px solid #e2e8f0;
}

.editor-header h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: #1e293b;
}

.header-actions {
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

.btn-danger {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
  border: none;
}

.btn-danger:hover:not(:disabled) {
  box-shadow: 0 3px 8px rgba(239, 68, 68, 0.4);
}

.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 0.5rem;
  transition: background 0.2s;
}

.btn-icon:hover {
  background: #f1f5f9;
}

.btn-icon svg {
  width: 20px;
  height: 20px;
  color: #64748b;
}

.editor-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 2rem;
}

.config-form {
  overflow-y: auto;
  padding-right: 1rem;
}

.form-section {
  background: white;
  border-radius: 1rem;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.form-section h3 {
  margin: 0 0 1.25rem 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #1e293b;
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #475569;
}

.required {
  color: #ef4444;
}

.form-control {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 2px solid #e2e8f0;
  border-radius: 0.5rem;
  font-size: 0.9375rem;
  transition: all 0.2s ease;
  font-family: inherit;
}

.form-control:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-control.error {
  border-color: #ef4444;
}

.form-control.error:focus {
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}

.error-message {
  display: block;
  margin-top: 0.375rem;
  font-size: 0.8125rem;
  color: #ef4444;
}

.toggle-group label {
  margin-bottom: 0.5rem;
}

.toggle-buttons {
  display: flex;
  gap: 0.5rem;
}

.toggle-btn {
  flex: 1;
  padding: 0.75rem 1rem;
  border: 2px solid #e2e8f0;
  background: white;
  border-radius: 0.5rem;
  cursor: pointer;
  font-size: 0.9375rem;
  font-weight: 500;
  color: #64748b;
  transition: all 0.2s ease;
}

.toggle-btn:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
}

.toggle-btn.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-color: #667eea;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.25rem;
}

.switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 26px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #cbd5e1;
  transition: 0.3s;
  border-radius: 26px;
}

.slider:before {
  position: absolute;
  content: '';
  height: 20px;
  width: 20px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

.switch input:checked + .slider {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.switch input:checked + .slider:before {
  transform: translateX(24px);
}

.ssl-config {
  padding-top: 1rem;
  border-top: 1px solid #e2e8f0;
}

.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  font-size: 0.9375rem;
  color: #475569;
}

.checkbox-label input[type='checkbox'] {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: #667eea;
}

.preview-panel {
  background: white;
  border-radius: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e2e8f0;
  flex-shrink: 0;
}

.preview-header h3 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #1e293b;
}

.preview-content {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 1.5rem;
}

.preview-content pre {
  margin: 0;
  padding: 0;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 0.875rem;
  line-height: 1.6;
  color: #334155;
  white-space: pre-wrap;
  word-break: break-all;
}

::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>
