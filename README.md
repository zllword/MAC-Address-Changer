# MAC 地址修改器

一个基于 Electron + Vue 3 开发的跨平台 MAC 地址修改器桌面应用程序，支持 **Windows** 和 **macOS**。

## 功能特性

- 自动生成随机 MAC 地址
- 获取所有网络适配器列表
- 修改指定网卡的 MAC 地址
- MAC 地址格式验证
- 自动备份和恢复原始 MAC 地址
- 操作日志记录
- 现代化的用户界面
- **跨平台支持**: Windows 10/11 和 macOS

## 技术栈

- **Electron** - 跨平台桌面应用框架
- **Vue 3** - 渐进式 JavaScript 框架
- **Vite** - 下一代前端构建工具
- **Element Plus** - Vue 3 组件库
- **TypeScript** - 类型安全的 JavaScript

## 系统要求

### Windows
- Windows 10/11
- Node.js 18+ 和 npm（仅开发时需要）
- **管理员权限**（修改 MAC 地址需要）

### macOS
- macOS 10.15+
- Node.js 18+ 和 npm（仅开发时需要）
- **sudo 权限**（修改 MAC 地址需要）

## 安装和运行

### 开发模式

1. 克隆或下载项目到本地
2. 安装依赖:
```bash
npm install
```

3. 启动开发服务器:
```bash
npm run dev
```

**注意**:
- Windows: 以**管理员身份**运行命令提示符或 PowerShell
- macOS: 使用 `sudo npm run dev`（因为需要 root 权限修改 MAC 地址）

### 构建生产版本

1. 构建应用:
```bash
npm run build
```

2. 打包应用:
```bash
# Windows
npm run build:win

# macOS
npm run build:mac
```

打包完成后，安装包位于 `release/` 目录。

## 使用说明

### 权限要求

**重要**: 修改 MAC 地址需要特殊权限：

- **Windows**: 必须以**管理员身份**运行
- **macOS**: 需要 **sudo 权限**运行

### 操作步骤

1. 启动应用后，会自动获取所有网络适配器
2. 从下拉列表中选择要修改的网卡
3. 点击"随机生成"按钮自动生成新的 MAC 地址，或手动输入
4. 点击"修改 MAC 地址"按钮
5. 确认操作后，应用会自动修改 MAC 地址
6. 如果需要恢复，点击"恢复原始 MAC"按钮

### MAC 地址格式

支持以下格式：
- `00:11:22:33:44:55` (推荐)
- `00-11-22-33-44-55`
- `001122334455`

## 技术实现

### Windows 实现

应用通过 PowerShell 命令来修改 Windows 网卡的 MAC 地址：

```powershell
# 禁用网卡
Disable-NetAdapter -Name "网卡名称" -Confirm:$false

# 设置 MAC 地址
Set-NetAdapter -Name "网卡名称" -MacAddress "00:11:22:33:44:55"

# 启用网卡
Enable-NetAdapter -Name "网卡名称" -Confirm:$false
```

### macOS 实现

应用通过 ifconfig 命令来修改 macOS 网卡的 MAC 地址：

```bash
# 断开网卡
sudo ifconfig en0 down

# 设置新的 MAC 地址
sudo ifconfig en0 ether 00:11:22:33:44:55

# 重新启用网卡
sudo ifconfig en0 up
```

### 架构设计

- **主进程**: 处理系统级操作，执行 PowerShell/bash 命令
- **渲染进程**: Vue 3 应用，提供用户界面
- **IPC 通信**: 主进程和渲染进程通过 IPC 进行通信
- **平台检测**: 自动检测操作系统并使用相应的命令

## 项目结构

```
mac-address-changer/
├── src/
│   ├── main/                    # 主进程
│   │   ├── index.ts             # Electron 主入口
│   │   └── ipc/                 # IPC 通信处理
│   │       ├── handlers/
│   │       │   ├── adapter.ts   # 网卡列表处理（跨平台）
│   │       │   ├── mac.ts       # MAC 修改处理（跨平台）
│   │       │   └── validate.ts  # MAC 验证
│   │       └── index.ts
│   ├── preload/                 # 预加载脚本
│   │   └── index.ts
│   └── renderer/                # 渲染进程（Vue 3）
│       ├── index.html
│       └── src/
│           ├── App.vue
│           ├── main.ts
│           └── components/
├── package.json
├── electron.vite.config.ts
├── electron-builder.json
└── README.md
```

## 注意事项

1. **权限要求**:
   - Windows: 必须以管理员身份运行
   - macOS: 需要 sudo 权限

2. **网络中断**: 修改 MAC 地址期间会短暂断开网络连接

3. **MAC 地址唯一性**: 请确保修改后的 MAC 地址在网络中是唯一的

4. **重启后恢复**:
   - Windows: 修改的 MAC 地址在重启后仍然有效
   - macOS: 修改的 MAC 地址在重启后会恢复为原始地址

5. **虚拟机**: 在虚拟机中修改 MAC 地址可能需要额外的配置

## 故障排除

### Windows

#### 问题: 无法获取网卡列表

**解决方案**: 确保以管理员身份运行应用

#### 问题: 修改 MAC 地址失败

**解决方案**:
1. 检查 MAC 地址格式是否正确
2. 确保有管理员权限
3. 查看操作日志了解详细错误信息

### macOS

#### 问题: 无法获取网卡列表

**解决方案**: 检查是否有执行 ifconfig 命令的权限

#### 问题: 修改 MAC 地址失败

**解决方案**:
1. 确保使用 sudo 运行应用
2. 某些网卡可能不支持修改 MAC 地址
3. 查看操作日志了解详细错误信息

#### 问题: 重启后 MAC 地址恢复

**说明**: macOS 的设计是重启后恢复原始 MAC 地址。这是正常行为。

### 通用问题

#### 问题: 打包后应用无法运行

**解决方案**: 确保在打包前运行了 `npm run build`

## 许可证

MIT License

## 参考资料

### Windows
- [Set-NetAdapter PowerShell 文档](https://learn.microsoft.com/en-us/powershell/module/netadapter/set-netadapter)
- [如何更改 Windows 10 网卡的 MAC 地址](https://blog.miniasp.com/post/2022/08/04/How-to-change-MAC-address-in-Windows-10)
- [PowerShell MAC 地址修改脚本](https://gist.github.com/ohyicong/91ce75f5b065f6bbe77910e9518b7a89)

### macOS
- [ifconfig 手册页](https://www.manpagez.com/man/8/ifconfig/)
- [macOS 修改 MAC 地址指南](https://superuser.com/questions/302084/can-i-change-my-mac-address-on-mac-os-x)

### 开发框架
- [Electron 官方文档](https://www.electronjs.org/)
- [Vue 3 官方文档](https://vuejs.org/)
- [Electron Builder 文档](https://www.electron.build/)

---

**免责声明**: 此工具仅用于合法用途。修改 MAC 地址可能违反某些网络的使用政策，请确保在合法和授权的情况下使用。
