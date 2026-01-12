<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface Message {
  type: 'success' | 'error' | 'info'
  text: string
  id: number
}

const messages = ref<Message[]>([])
let messageIdCounter = 0

function showMessage(type: 'success' | 'error' | 'info', text: string) {
  const id = messageIdCounter++
  messages.value.push({ type, text, id })
  setTimeout(() => {
    const index = messages.value.findIndex(m => m.id === id)
    if (index > -1) {
      messages.value.splice(index, 1)
    }
  }, 3000)
}

interface LocationConfig {
  path: string
  root: string
  index: string
  proxyTarget: string
  useProxy: boolean
  proxyHeaders: string[]
  tryFiles: string
}

interface ServerConfig {
  listen: string
  serverName: string
  root: string
  index: string
  locations: LocationConfig[]
  sslEnabled: boolean
  sslCert: string
  sslKey: string
  clientMaxBodySize: string
  keepaliveTimeout: string
  gzipEnabled: boolean
  useProxy: boolean
  proxyTarget: string
  errorPages: { code: string; path: string }[]
}

const emit = defineEmits<{
  'save-config': [content: string]
}>()

const config = ref<ServerConfig>({
  listen: '80',
  serverName: 'localhost',
  root: '',
  index: 'index.html index.htm',
  locations: [],
  sslEnabled: false,
  sslCert: '',
  sslKey: '',
  clientMaxBodySize: '20M',
  keepaliveTimeout: '65',
  gzipEnabled: true,
  useProxy: false,
  proxyTarget: '',
  errorPages: []
})

const errors = ref<Record<string, string>>({})
const showPreview = ref(true)

// 子配置文件相关
const subConfigFiles = ref<string[]>([])
const selectedSubConfig = ref<string | null>(null)
const subConfigContent = ref('')
const subConfigFilename = ref('')
const isCreatingSubConfig = ref(false)
const showSubConfigDrawer = ref(false)
const showMainConfig = ref(false)
const mainConfigContent = ref('')

// 常用配置模板
const templates = [
  { name: '静态网站', value: 'static' },
  { name: '反向代理', value: 'proxy' },
  { name: 'HTTPS 网站', value: 'https' }
]

const selectedTemplate = ref('')

// 监听模板变化
function applyTemplate(newTemplate: string) {
  if (newTemplate === 'static') {
    config.value = {
      ...config.value,
      root: 'C:/www/html',
      index: 'index.html index.htm',
      locations: [{
        path: '/',
        root: 'C:/www/html',
        index: 'index.html index.htm',
        useProxy: false,
        proxyTarget: '',
        proxyHeaders: [],
        tryFiles: '$uri $uri/ /index.html'
      }]
    }
  } else if (newTemplate === 'proxy') {
    config.value = {
      ...config.value,
      root: '',
      locations: [{
        path: '/',
        root: '',
        index: '',
        useProxy: true,
        proxyTarget: 'http://127.0.0.1:3000',
        proxyHeaders: [
          'Host $host',
          'X-Real-IP $remote_addr',
          'X-Forwarded-For $proxy_add_x_forwarded_for',
          'X-Forwarded-Proto $scheme'
        ],
        tryFiles: ''
      }]
    }
  } else if (newTemplate === 'https') {
    config.value = {
      ...config.value,
      listen: '443 ssl',
      sslEnabled: true,
      sslCert: 'C:/ssl/cert.pem',
      sslKey: 'C:/ssl/key.pem',
      locations: []
    }
  }
}

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
  if (config.value.root && !config.value.useProxy && config.value.locations.length === 0) {
    nginxConfig += `
    root ${config.value.root};
    index ${config.value.index};
`
  }

  // Location 配置
  for (const location of config.value.locations) {
    nginxConfig += `\n    location ${location.path} {`

    // root
    if (location.root) {
      nginxConfig += `
        root ${location.root};`
    }

    // index
    if (location.index) {
      nginxConfig += `
        index ${location.index};`
    }

    // proxy 配置
    if (location.useProxy && location.proxyTarget) {
      nginxConfig += `
        proxy_pass ${location.proxyTarget};`
      if (location.proxyHeaders.length > 0) {
        for (const header of location.proxyHeaders) {
          nginxConfig += `
        proxy_set_header ${header};`
        }
      }
    }

    // try_files
    if (location.tryFiles) {
      nginxConfig += `
        try_files ${location.tryFiles};`
    } else if (!location.useProxy && location.root) {
      nginxConfig += `
        try_files $uri $uri/ =404;`
    }

    nginxConfig += `
    }`
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

  nginxConfig += `
}
`

  return nginxConfig
})

// 加载子配置文件列表
async function loadSubConfigFiles() {
  const result = await window.api.getSubConfigFiles()
  if (result.success) {
    subConfigFiles.value = result.files
  }
}

// 添加 location
function addLocation() {
  config.value.locations.push({
    path: '/',
    root: '',
    index: '',
    proxyTarget: '',
    useProxy: false,
    proxyHeaders: [],
    tryFiles: ''
  })
}

// 删除 location
function removeLocation(index: number) {
  config.value.locations.splice(index, 1)
}

// 复制 location
function duplicateLocation(index: number) {
  const location = config.value.locations[index]
  config.value.locations.splice(index + 1, 0, {
    ...location,
    path: location.path + '-copy'
  })
}

// 加载子配置文件内容
async function loadSubConfigContent(filename: string) {
  const result = await window.api.getSubConfigContent(filename)
  if (result.success && result.content) {
    selectedSubConfig.value = filename
    subConfigContent.value = result.content
    showSubConfigDrawer.value = false

    // 解析配置并填充到表单
    parseConfigToForm(result.content)
  }
}

// 解析配置内容并填充到表单
function parseConfigToForm(content: string) {
  const lines = content.split('\n')
  let inServerBlock = false
  let inLocationBlock = false
  let currentLocation: LocationConfig | null = null
  const locations: LocationConfig[] = []

  for (const line of lines) {
    const trimmedLine = line.trim()

    // 检测 server 块
    if (trimmedLine.startsWith('server') && trimmedLine.includes('{')) {
      inServerBlock = true
      continue
    }

    // 检测 location 块
    if (trimmedLine.startsWith('location') && trimmedLine.includes('{')) {
      inLocationBlock = true

      // 解析 location 路径
      const pathMatch = trimmedLine.match(/location\s+([^{\s]+)/)
      if (pathMatch) {
        currentLocation = {
          path: pathMatch[1].trim(),
          root: '',
          index: '',
          proxyTarget: '',
          useProxy: false,
          proxyHeaders: [],
          tryFiles: ''
        }
      }
      continue
    }

    // server 块结束
    if (trimmedLine === '}' && !inLocationBlock) {
      inServerBlock = false
      continue
    }

    // location 块结束
    if (trimmedLine === '}' && inLocationBlock && currentLocation) {
      inLocationBlock = false
      locations.push(currentLocation)
      currentLocation = null
      continue
    }

    // 解析 server 级别的配置
    if (inServerBlock && !inLocationBlock) {
      // listen
      const listenMatch = trimmedLine.match(/listen\s+([^;]+);/)
      if (listenMatch) {
        config.value.listen = listenMatch[1].trim()
      }

      // server_name
      const serverNameMatch = trimmedLine.match(/server_name\s+([^;]+);/)
      if (serverNameMatch) {
        config.value.serverName = serverNameMatch[1].trim()
      }

      // root
      const rootMatch = trimmedLine.match(/root\s+([^;]+);/)
      if (rootMatch) {
        config.value.root = rootMatch[1].trim()
      }

      // index
      const indexMatch = trimmedLine.match(/index\s+([^;]+);/)
      if (indexMatch) {
        config.value.index = indexMatch[1].trim()
      }

      // ssl_certificate
      const certMatch = trimmedLine.match(/ssl_certificate\s+([^;]+);/)
      if (certMatch) {
        config.value.sslCert = certMatch[1].trim()
        config.value.sslEnabled = true
      }

      // ssl_certificate_key
      const keyMatch = trimmedLine.match(/ssl_certificate_key\s+([^;]+);/)
      if (keyMatch) {
        config.value.sslKey = keyMatch[1].trim()
      }

      // client_max_body_size
      const clientMaxMatch = trimmedLine.match(/client_max_body_size\s+([^;]+);/)
      if (clientMaxMatch) {
        config.value.clientMaxBodySize = clientMaxMatch[1].trim()
      }

      // keepalive_timeout
      const keepaliveMatch = trimmedLine.match(/keepalive_timeout\s+([^;]+);/)
      if (keepaliveMatch) {
        config.value.keepaliveTimeout = keepaliveMatch[1].trim()
      }

      // gzip
      if (trimmedLine.includes('gzip on;')) {
        config.value.gzipEnabled = true
      }
      if (trimmedLine.includes('gzip off;')) {
        config.value.gzipEnabled = false
      }
    }

    // 解析 location 块中的配置
    if (inLocationBlock && currentLocation) {
      // root
      const rootMatch = trimmedLine.match(/root\s+([^;]+);/)
      if (rootMatch) {
        currentLocation.root = rootMatch[1].trim()
      }

      // index
      const indexMatch = trimmedLine.match(/index\s+([^;]+);/)
      if (indexMatch) {
        currentLocation.index = indexMatch[1].trim()
      }

      // proxy_pass
      const proxyMatch = trimmedLine.match(/proxy_pass\s+([^;]+);/)
      if (proxyMatch) {
        currentLocation.proxyTarget = proxyMatch[1].trim()
        currentLocation.useProxy = true
      }

      // proxy_set_header
      const headerMatch = trimmedLine.match(/proxy_set_header\s+([^;]+);/)
      if (headerMatch) {
        const header = headerMatch[1].trim()
        if (!currentLocation.proxyHeaders.includes(header)) {
          currentLocation.proxyHeaders.push(header)
        }
      }

      // try_files
      const tryFilesMatch = trimmedLine.match(/try_files\s+([^;]+);/)
      if (tryFilesMatch) {
        currentLocation.tryFiles = tryFilesMatch[1].trim()
      }
    }
  }

  // 保存解析到的 location 配置
  if (locations.length > 0) {
    config.value.locations = locations
  }
}

// 保存子配置文件
async function saveSubConfig() {
  if (!subConfigFilename.value.trim()) {
    showMessage('error', '请输入文件名')
    return
  }

  const filename = subConfigFilename.value.trim()
  const result = await window.api.saveSubConfig(filename, generatedConfig.value)

  if (result.success) {
    showMessage('success', '保存成功!')
    await loadSubConfigFiles()
    subConfigFilename.value = ''
    isCreatingSubConfig.value = false
  } else {
    showMessage('error', '保存失败: ' + (result.error || '未知错误'))
  }
}

// 更新当前子配置文件
async function updateCurrentSubConfig() {
  if (!selectedSubConfig.value) {
    showMessage('error', '未选择文件')
    return
  }

  const result = await window.api.saveSubConfig(selectedSubConfig.value, generatedConfig.value)

  if (result.success) {
    showMessage('success', '更新成功!')
  } else {
    showMessage('error', '更新失败: ' + (result.error || '未知错误'))
  }
}

// 删除子配置文件
async function deleteSubConfig(filename: string) {
  if (!confirm(`确定要删除 ${filename} 吗?`)) {
    return
  }

  const result = await window.api.deleteSubConfig(filename)

  if (result.success) {
    showMessage('success', '删除成功!')
    if (selectedSubConfig.value === filename) {
      selectedSubConfig.value = null
      subConfigContent.value = ''
    }
    await loadSubConfigFiles()
  } else {
    showMessage('error', '删除失败: ' + (result.error || '未知错误'))
  }
}

// 加载主配置文件
async function loadMainConfig() {
  const result = await window.api.getMainConfig()
  if (result.success && result.content) {
    mainConfigContent.value = result.content
    showMainConfig.value = true
  }
}

// 保存主配置文件
async function saveMainConfig() {
  const result = await window.api.saveMainConfig(mainConfigContent.value)
  if (result.success) {
    showMessage('success', '保存成功!')
  } else {
    showMessage('error', '保存失败: ' + (result.error || '未知错误'))
  }
}


// 选择根目录
async function selectRootDir(location: LocationConfig) {
  const result = await window.api.selectDirectory()
  if (result.success && result.path) {
    location.root = result.path
  }
}

// 选择证书文件
async function selectCertFile() {
  const result = await window.api.selectFile([{ name: '证书文件', extensions: ['pem', 'crt', 'cer'] }])
  if (result.success && result.path) {
    config.value.sslCert = result.path
  }
}

// 选择私钥文件
async function selectKeyFile() {
  const result = await window.api.selectFile([{ name: '私钥文件', extensions: ['pem', 'key'] }])
  if (result.success && result.path) {
    config.value.sslKey = result.path
  }
}

// 重置配置
function resetConfig() {
  config.value = {
    listen: '80',
    serverName: 'localhost',
    root: '',
    index: 'index.html index.htm',
    locations: [],
    sslEnabled: false,
    sslCert: '',
    sslKey: '',
    clientMaxBodySize: '20M',
    keepaliveTimeout: '65',
    gzipEnabled: true,
    useProxy: false,
    proxyTarget: '',
    errorPages: []
  }
  errors.value = {}
  selectedTemplate.value = ''
}

onMounted(async () => {
  await loadSubConfigFiles()
})
</script>

<template>
  <div class="modular-editor">
    <!-- 消息提示 -->
    <div class="messages-container">
      <transition-group name="message">
        <div
          v-for="message in messages"
          :key="message.id"
          :class="['message', message.type]"
        >
          <svg v-if="message.type === 'success'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <svg v-else-if="message.type === 'error'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
          <span>{{ message.text }}</span>
        </div>
      </transition-group>
    </div>
    <!-- 头部操作栏 -->
    <div class="editor-header">
      <h2>模块化配置编辑器</h2>
      <div class="header-actions">
        <button @click="showSubConfigDrawer = true; loadSubConfigFiles()" class="btn btn-secondary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-6l-2-2H5a2 2 0 0 0-2 2z"></path>
          </svg>
          <span>子配置文件</span>
        </button>
        <button @click="showMainConfig = true; loadMainConfig()" class="btn btn-secondary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
          <span>主配置</span>
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
            <select v-model="selectedTemplate" @change="applyTemplate(selectedTemplate)" class="form-control">
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

        <!-- Location 配置 -->
        <div class="form-section">
          <div class="section-header">
            <h3>Location 配置</h3>
            <button @click="addLocation" class="btn btn-secondary btn-sm">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              <span>添加 Location</span>
            </button>
          </div>

          <div v-if="config.locations.length === 0" class="empty-locations">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <p>暂无 Location 配置</p>
            <p class="tip">点击"添加 Location"按钮添加新的路径配置</p>
          </div>

          <div v-for="(location, index) in config.locations" :key="index" class="location-item">
            <div class="location-header">
              <div class="location-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 3"></polyline>
                </svg>
                <span>Location {{ index + 1 }}</span>
                <input
                  v-model="location.path"
                  type="text"
                  class="form-control location-path"
                  placeholder="例如: / 或 /api/"
                />
              </div>
              <div class="location-actions">
                <button @click="duplicateLocation(index)" class="btn-icon" title="复制">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                </button>
                <button @click="removeLocation(index)" class="btn-icon delete-btn" title="删除">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
                  </svg>
                </button>
              </div>
            </div>

            <div class="location-config">
              <div class="form-group">
                <label>配置模式</label>
                <div class="toggle-buttons">
                  <button
                    :class="['toggle-btn', !location.useProxy ? 'active' : '']"
                    @click="location.useProxy = false"
                  >
                    静态文件
                  </button>
                  <button
                    :class="['toggle-btn', location.useProxy ? 'active' : '']"
                    @click="location.useProxy = true"
                  >
                    反向代理
                  </button>
                </div>
              </div>

              <div v-if="!location.useProxy" class="form-group">
                <label>根目录</label>
                <div class="input-with-button">
                  <input
                    v-model="location.root"
                    type="text"
                    class="form-control"
                    placeholder="例如: C:/www/html"
                    readonly
                  />
                  <button @click="selectRootDir(location)" class="btn-icon select-btn" title="选择目录">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-6l-2-2H5a2 2 0 0 0-2 2z"></path>
                    </svg>
                  </button>
                </div>
              </div>

              <div v-if="location.useProxy" class="form-group">
                <label>代理目标</label>
                <input
                  v-model="location.proxyTarget"
                  type="text"
                  class="form-control"
                  placeholder="例如: http://127.0.0.1:3000"
                />
              </div>

              <div v-if="!location.useProxy" class="form-group">
                <label>首页文件</label>
                <input
                  v-model="location.index"
                  type="text"
                  class="form-control"
                  placeholder="例如: index.html index.htm"
                />
              </div>

              <div v-if="!location.useProxy" class="form-group">
                <label>Try Files</label>
                <input
                  v-model="location.tryFiles"
                  type="text"
                  class="form-control"
                  placeholder="例如: $uri $uri/ /index.html"
                />
              </div>

              <div v-if="location.useProxy && location.proxyHeaders.length > 0" class="form-group">
                <label>代理请求头</label>
                <div class="proxy-headers">
                  <div
                    v-for="(headerItem, hIndex) in location.proxyHeaders"
                    :key="hIndex"
                    class="header-item"
                  >
                    <input
                      v-model="location.proxyHeaders[hIndex]"
                      type="text"
                      class="form-control"
                      :placeholder="headerItem || 'Host $host'"
                    />
                    <button @click="location.proxyHeaders.splice(hIndex, 1)" class="btn-icon delete-btn">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  </div>
                  <button @click="location.proxyHeaders.push('')" class="btn-icon add-header">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
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
              <div class="input-with-button">
                <input
                  v-model="config.sslCert"
                  type="text"
                  class="form-control"
                  placeholder="例如: C:/ssl/cert.pem"
                  :class="{ error: errors.sslCert }"
                  readonly
                />
                <button @click="selectCertFile" class="btn-icon select-btn" title="选择证书文件">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-6l-2-2H5a2 2 0 0 0-2 2z"></path>
                  </svg>
                </button>
              </div>
              <span v-if="errors.sslCert" class="error-message">{{ errors.sslCert }}</span>
            </div>
            <div class="form-group">
              <label>私钥文件路径 <span class="required">*</span></label>
              <div class="input-with-button">
                <input
                  v-model="config.sslKey"
                  type="text"
                  class="form-control"
                  placeholder="例如: C:/ssl/key.pem"
                  :class="{ error: errors.sslKey }"
                  readonly
                />
                <button @click="selectKeyFile" class="btn-icon select-btn" title="选择私钥文件">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-6l-2-2H5a2 2 0 0 0-2 2z"></path>
                  </svg>
                </button>
              </div>
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
            <label class="checkbox-label">
              <input type="checkbox" v-model="config.gzipEnabled" />
              <span>启用 Gzip 压缩</span>
            </label>
          </div>
        </div>
      </div>

      <!-- 右侧面板 -->
      <div class="right-panel">
        <!-- 配置预览 -->
        <div class="preview-panel" v-if="!showMainConfig">
          <div class="panel-header">
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

          <!-- 保存操作 -->
          <div class="save-actions">
            <div v-if="isCreatingSubConfig" class="form-group">
              <label>文件名 (.conf)</label>
              <input v-model="subConfigFilename" type="text" class="form-control" placeholder="例如: mysite.conf" />
            </div>
            <div class="action-buttons">
              <button v-if="!isCreatingSubConfig" @click="isCreatingSubConfig = true" class="btn btn-secondary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                <span>新建配置文件</span>
              </button>
              <button v-if="isCreatingSubConfig" @click="saveSubConfig" class="btn btn-primary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                  <polyline points="17 21 17 13 7 13 7 21"></polyline>
                </svg>
                <span>保存为子配置</span>
              </button>
              <button v-if="selectedSubConfig" @click="updateCurrentSubConfig" class="btn btn-primary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                  <polyline points="17 21 17 13 7 13 7 21"></polyline>
                </svg>
                <span>更新当前文件</span>
              </button>
              <button @click="resetConfig" class="btn btn-danger">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
                <span>重置</span>
              </button>
            </div>
          </div>
        </div>

        <!-- 主配置文件 -->
        <div class="main-config-panel" v-else>
          <div class="panel-header">
            <h3>主配置文件 (nginx.conf)</h3>
            <button @click="showMainConfig = false" class="btn-icon" title="关闭">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div class="config-content">
            <textarea v-model="mainConfigContent" class="config-textarea" spellcheck="false"></textarea>
          </div>
          <div class="save-actions">
            <button @click="saveMainConfig" class="btn btn-primary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                <polyline points="17 21 17 13 7 13 7 21"></polyline>
              </svg>
              <span>保存主配置</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 子配置文件抽屉 -->
      <transition name="drawer">
        <div v-if="showSubConfigDrawer" class="config-drawer">
          <div class="drawer-header">
            <h3>子配置文件</h3>
            <div class="drawer-actions">
              <button @click="loadSubConfigFiles" class="btn-icon" title="刷新">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="23 4 23 10 17 10"></polyline>
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                </svg>
              </button>
              <button @click="showSubConfigDrawer = false" class="btn-icon" title="关闭">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>
          <div class="drawer-content">
            <div v-if="subConfigFiles.length === 0" class="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              </svg>
              <p>暂无子配置文件</p>
            </div>
            <div
              v-for="file in subConfigFiles"
              :key="file"
              class="file-item"
              :class="{ active: selectedSubConfig === file }"
              @click="loadSubConfigContent(file)"
            >
              <div class="file-info">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
                <span>{{ file }}</span>
              </div>
              <button @click.stop="deleteSubConfig(file)" class="btn-icon delete-btn" title="删除">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </transition>
      <!-- 抽屉遮罩 -->
      <transition name="fade">
        <div v-if="showSubConfigDrawer" class="drawer-overlay" @click="showSubConfigDrawer = false"></div>
      </transition>
    </div>
  </div>
</template>

<style scoped>
.modular-editor {
  display: flex;
  flex-direction: column;
  height: 100vh;
  min-height: 0;
  background: #f8f9fa;
  position: relative;
}

.messages-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: none;
}

.message {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-radius: 0.75rem;
  background: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  pointer-events: auto;
  font-size: 0.9375rem;
  font-weight: 500;
  min-width: 280px;
  max-width: 400px;
  color: #1e293b;
}

.message svg {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.message.success {
  border-left: 4px solid #16a34a;
}

.message.success svg {
  color: #16a34a;
}

.message.error {
  border-left: 4px solid #dc2626;
}

.message.error svg {
  color: #dc2626;
}

.message.info {
  border-left: 4px solid #2563eb;
}

.message.info svg {
  color: #2563eb;
}

.message span {
  flex: 1;
}

.message-enter-active,
.message-leave-active {
  transition: all 0.3s ease;
}

.message-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.message-leave-to {
  opacity: 0;
  transform: translateX(100%);
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

.preview-panel {
  overflow-y: auto;
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

.btn-icon.delete-btn svg {
  color: #ef4444;
}

.editor-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  padding: 2rem;
  max-height: calc(100vh - 80px);
}

.config-form {
  overflow-y: auto;
  padding-right: 1rem;
  min-height: 0;
  max-height: 100%;
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

.input-with-button {
  display: flex;
  gap: 0.5rem;
  align-items: stretch;
}

.input-with-button .form-control {
  flex: 1;
}

.input-with-button .select-btn {
  flex-shrink: 0;
  padding: 0.75rem;
  border: 2px solid #e2e8f0;
  border-radius: 0.5rem;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
}

.input-with-button .select-btn:hover {
  border-color: #667eea;
  background: #f8fafc;
}

.input-with-button .select-btn svg {
  width: 18px;
  height: 18px;
  color: #64748b;
  transition: color 0.2s ease;
}

.input-with-button .select-btn:hover svg {
  color: #667eea;
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

/* Location 配置样式 */
.empty-locations {
  text-align: center;
  padding: 3rem 2rem;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 1rem;
  border: 2px dashed #cbd5e1;
}

.empty-locations svg {
  width: 64px;
  height: 64px;
  color: #94a3b8;
  margin-bottom: 1rem;
}

.empty-locations p {
  margin: 0.5rem 0;
  color: #64748b;
  font-size: 1rem;
}

.empty-locations .tip {
  color: #94a3b8;
  font-size: 0.9375rem;
}

.location-item {
  background: white;
  border-radius: 1rem;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 1px solid #e2e8f0;
  transition: all 0.3s ease;
}

.location-item:hover {
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
  border-color: #667eea;
}

.location-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.25rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #f1f5f9;
}

.location-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
}

.location-title svg {
  width: 20px;
  height: 20px;
  color: #667eea;
  flex-shrink: 0;
}

.location-title span {
  font-weight: 600;
  color: #1e293b;
  font-size: 1rem;
}

.location-path {
  margin-left: 0.5rem;
  padding: 0.5rem 0.75rem;
  border: 2px solid #e2e8f0;
  border-radius: 0.5rem;
  font-size: 0.9375rem;
  width: 200px;
  font-family: 'Consolas', 'Monaco', monospace;
}

.location-path:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.location-actions {
  display: flex;
  gap: 0.5rem;
}

.location-actions .btn-icon {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.location-actions .btn-icon:hover {
  background: #667eea;
  border-color: #667eea;
}

.location-actions .btn-icon:hover svg {
  color: white;
}

.location-config {
  display: grid;
  gap: 1rem;
  margin-top: 1.25rem;
}

.proxy-headers {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.header-item {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.header-item .form-control {
  flex: 1;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 0.875rem;
}

.header-item .btn-icon {
  flex-shrink: 0;
  padding: 0.5rem;
  width: 32px;
  height: 32px;
}

.add-header {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  color: white;
}

.add-header:hover {
  transform: scale(1.1);
}

.add-header svg {
  color: white;
}

.right-panel {
  background: white;
  border-radius: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0;
  max-height: 100%;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e2e8f0;
  flex-shrink: 0;
}

.panel-header h3 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #1e293b;
}

.preview-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: auto;
  padding: 1.5rem;
  max-height: 100%;
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

.config-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: auto;
  padding: 1rem;
  max-height: 100%;
}

.config-textarea {
  width: 100%;
  height: 100%;
  min-height: 300px;
  padding: 1rem;
  border: 2px solid #e2e8f0;
  border-radius: 0.5rem;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 0.875rem;
  line-height: 1.6;
  color: #334155;
  resize: none;
}

.config-textarea:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.save-actions {
  padding: 1rem 1.5rem;
  border-top: 1px solid #e2e8f0;
  flex-shrink: 0;
}

.action-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: #94a3b8;
  font-size: 0.9375rem;
}

.file-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 0.5rem;
  color: #475569;
  background: white;
  border: 1px solid #e2e8f0;
}

.file-item:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.file-item.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-color: #667eea;
}

.file-item.active svg {
  color: white;
}

.file-item.active .file-info span {
  color: white;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
  overflow: hidden;
}

.file-info svg {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  color: #64748b;
}

.file-info span {
  font-size: 0.9375rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #1e293b;
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

/* 抽屉样式 */
.drawer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 100;
}

.config-drawer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 350px;
  background: white;
  z-index: 101;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  border-bottom: 2px solid #f1f5f9;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
}

.drawer-header h3 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #1e293b;
}

.drawer-actions {
  display: flex;
  gap: 0.5rem;
}

.drawer-actions .btn-icon {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  padding: 0.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.drawer-actions .btn-icon:hover {
  background: #667eea;
  border-color: #667eea;
  color: white;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

.drawer-actions .btn-icon svg {
  width: 18px;
  height: 18px;
  color: #64748b;
  transition: color 0.2s ease;
}

.drawer-actions .btn-icon:hover svg {
  color: white;
}

.drawer-content {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.drawer-content .file-item {
  background: white;
  border: 2px solid #e2e8f0;
}

.drawer-content .file-item:hover {
  border-color: #667eea;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.15);
}

.drawer-content .file-item.active {
  border-color: #667eea;
}

.drawer-content .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  color: #94a3b8;
  font-size: 0.9375rem;
}

.drawer-content .empty-state svg {
  width: 64px;
  height: 64px;
  margin-bottom: 1rem;
  color: #cbd5e1;
}

/* 抽屉动画 */
.drawer-enter-active,
.drawer-leave-active {
  transition: transform 0.3s ease;
}

.drawer-enter-from {
  transform: translateX(100%);
}

.drawer-leave-to {
  transform: translateX(100%);
}

/* 遮罩动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
