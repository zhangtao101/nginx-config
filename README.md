# Nginx 配置管理工具

一款基于 Electron + Vue 3 + TypeScript 开发的 Nginx 配置文件可视化管理工具。

## 功能特性

### 配置管理
- **模块化配置支持**: 自动检测并转换为模块化配置结构
- **可视化编辑**: 提供友好的表单界面编辑 Nginx 配置
- **配置预览**: 实时预览生成的 Nginx 配置内容
- **主配置编辑**: 直接编辑主配置文件 `nginx.conf`

### 子配置管理
- **抽屉式列表**: 右侧抽屉展示子配置文件列表
- **文件操作**: 支持新建、编辑、删除子配置文件
- **一键加载**: 点击列表项即可加载配置到编辑器

### Nginx 服务控制
- **启动/停止**: 一键启动或停止 Nginx 服务
- **重载配置**: 修改配置后快速重载 Nginx
- **状态监控**: 实时显示 Nginx 运行状态

### 日志查看
- **访问日志**: 查看 Nginx 访问日志
- **错误日志**: 查看 Nginx 错误日志

### 安全配置
- **SSL 证书**: 支持配置 SSL 证书和私钥
- **系统弹窗选择**: 根目录和证书文件通过系统弹窗选择,禁止手动输入

## 快速开始

### 环境要求
- Node.js >= 18
- pnpm >= 8

### 安装依赖

```bash
pnpm install
```

### 开发模式

```bash
pnpm dev
```

### 构建应用

```bash
# 构建所有平台
pnpm build

# 仅构建 Windows
pnpm build:win

# 仅构建 macOS
pnpm build:mac

# 仅构建 Linux
pnpm build:linux
```

### 代码检查

```bash
# 类型检查
pnpm typecheck

# 代码检查
pnpm lint

# 代码格式化
pnpm format
```

## 使用说明

### 初次使用
1. 启动应用后,点击"选择 Nginx 目录"按钮
2. 选择 Nginx 安装目录(包含 nginx.exe 的目录)
3. 应用会自动检测配置文件结构
4. 如果配置文件非模块化结构,会自动备份并转换为模块化配置

### 创建站点配置
1. 点击"配置"标签进入配置编辑页面
2. 点击"子配置文件"按钮打开抽屉
3. 点击"新建配置文件"或选择已有文件
4. 在左侧表单中填写配置信息:
   - **快速开始**: 选择预设模板(静态网站、反向代理、HTTPS 网站)
   - **基本配置**: 设置监听端口和服务器名称
   - **Location 配置**: 添加路径规则,支持静态文件和反向代理
   - **SSL 配置**: 配置 HTTPS 证书(通过系统弹窗选择)
5. 右侧预览配置内容
6. 点击"保存为子配置"保存到 `conf.d` 目录

### 管理 Nginx 服务
1. 点击"控制"标签进入服务控制页面
2. 查看当前运行状态
3. 使用按钮启动、停止或重载 Nginx
4. 实时查看服务状态变化

### 查看日志
1. 点击"日志"标签进入日志查看页面
2. 分别查看访问日志和错误日志
3. 日志自动刷新

## 配置文件结构

```
nginx/
├── conf/
│   ├── nginx.conf          # 主配置文件
│   └── conf.d/           # 子配置文件目录
│       ├── site1.conf
│       ├── site2.conf
│       └── ...
├── logs/
│   ├── access.log         # 访问日志
│   └── error.log          # 错误日志
└── nginx.exe             # Nginx 可执行文件
```

## 技术栈

- **Electron**: 跨平台桌面应用框架
- **Vue 3**: 渐进式 JavaScript 框架
- **TypeScript**: 类型安全的 JavaScript 超集
- **Vite**: 下一代前端构建工具
- **Electron Vite**: Electron + Vite 集成工具

## 项目结构

```
src/
├── main/                 # 主进程
│   ├── index.ts         # 主进程入口
│   ├── ipc.ts          # IPC 通信处理
│   └── store.ts        # 数据存储和业务逻辑
├── preload/             # 预加载脚本
│   ├── index.ts        # 暴露 API 到渲染进程
│   └── index.d.ts      # TypeScript 类型定义
└── renderer/           # 渲染进程
    └── src/
        ├── main.ts      # 应用入口
        ├── App.vue     # 根组件
        └── components/ # 组件目录
            ├── Welcome.vue            # 欢迎页面
            ├── ModularConfigEditor.vue  # 模块化配置编辑器
            ├── NginxControl.vue        # Nginx 服务控制
            └── LogViewer.vue          # 日志查看器
```

## 安全特性

- **配置自动备份**: 转换为模块化配置前自动备份原配置文件
- **文件路径验证**: 根目录和证书文件必须通过系统弹窗选择
- **文件名验证**: 子配置文件必须以 `.conf` 结尾
- **配置语法检查**: 保存前进行基本语法验证

## 常见问题

### Q: 如何重置配置文件路径?
A: 点击右上角的重新配置路径按钮,然后重新选择 Nginx 目录。

### Q: 配置文件保存在哪里?
A: 子配置文件保存在 Nginx 安装目录的 `conf/conf.d/` 文件夹中。

### Q: 如何支持 HTTPS?
A: 在编辑器中启用 SSL 配置,通过系统弹窗选择证书文件和私钥文件。

### Q: 配置修改后如何生效?
A: 保存配置文件后,点击"控制"标签中的"重载"按钮即可。

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request!

## 联系方式

- Email: your-email@example.com
- GitHub: your-github-username
