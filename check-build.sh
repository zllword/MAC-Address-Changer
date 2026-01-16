#!/bin/bash

# 构建前检查脚本
# 用于诊断构建问题

echo "=== MAC Address Changer 构建检查 ==="
echo ""

# 检查 Node.js 和 npm
echo "1. 检查 Node.js 和 npm..."
if command -v node &> /dev/null; then
    echo "   ✓ Node.js: $(node --version)"
else
    echo "   ✗ Node.js 未安装"
    exit 1
fi

if command -v npm &> /dev/null; then
    echo "   ✓ npm: $(npm --version)"
else
    echo "   ✗ npm 未安装"
    exit 1
fi

echo ""

# 检查依赖
echo "2. 检查依赖..."
if [ -d "node_modules" ]; then
    echo "   ✓ node_modules 目录存在"
    if [ -f "node_modules/.package-lock.json" ] || [ -f "node_modules/electron-vite/package.json" ]; then
        echo "   ✓ 依赖已安装"
    else
        echo "   ⚠ 依赖可能不完整，建议运行: npm install"
    fi
else
    echo "   ✗ node_modules 目录不存在"
    echo "   请运行: npm install"
    exit 1
fi

echo ""

# 检查构建工具
echo "3. 检查构建工具..."
if [ -f "node_modules/.bin/electron-vite" ]; then
    echo "   ✓ electron-vite 已安装"
else
    echo "   ✗ electron-vite 未找到"
    echo "   请运行: npm install"
    exit 1
fi

if [ -f "node_modules/.bin/electron-builder" ]; then
    echo "   ✓ electron-builder 已安装"
else
    echo "   ✗ electron-builder 未找到"
    echo "   请运行: npm install"
    exit 1
fi

echo ""

# 检查源代码
echo "4. 检查源代码..."
if [ -f "src/main/index.ts" ]; then
    echo "   ✓ 主进程文件存在"
else
    echo "   ✗ src/main/index.ts 不存在"
    exit 1
fi

if [ -f "src/preload/index.ts" ]; then
    echo "   ✓ Preload 文件存在"
else
    echo "   ✗ src/preload/index.ts 不存在"
    exit 1
fi

if [ -f "src/renderer/index.html" ]; then
    echo "   ✓ 渲染进程文件存在"
else
    echo "   ✗ src/renderer/index.html 不存在"
    exit 1
fi

echo ""

# 检查构建资源（可选）
echo "5. 检查构建资源..."
if [ -d "build" ]; then
    echo "   ✓ build 目录存在"
    
    if [ -f "build/icon.ico" ]; then
        echo "   ✓ Windows 图标存在"
    else
        echo "   ⚠ build/icon.ico 不存在（Windows 构建可能需要）"
    fi
    
    if [ -f "build/icon.icns" ]; then
        echo "   ✓ macOS 图标存在"
    else
        echo "   ⚠ build/icon.icns 不存在（macOS 构建可能需要）"
    fi
    
    if [ -f "build/icon.png" ]; then
        echo "   ✓ Linux 图标存在"
    else
        echo "   ⚠ build/icon.png 不存在（Linux 构建可能需要）"
    fi
else
    echo "   ⚠ build 目录不存在（图标文件可选）"
fi

echo ""

# 检查配置文件
echo "6. 检查配置文件..."
if [ -f "package.json" ]; then
    echo "   ✓ package.json 存在"
else
    echo "   ✗ package.json 不存在"
    exit 1
fi

if [ -f "electron.vite.config.ts" ]; then
    echo "   ✓ electron.vite.config.ts 存在"
else
    echo "   ✗ electron.vite.config.ts 不存在"
    exit 1
fi

if [ -f "electron-builder.json" ]; then
    echo "   ✓ electron-builder.json 存在"
else
    echo "   ✗ electron-builder.json 不存在"
    exit 1
fi

echo ""

# 检查输出目录
echo "7. 检查输出目录..."
if [ -d "out" ]; then
    echo "   ✓ out 目录存在"
    file_count=$(find out -type f 2>/dev/null | wc -l | tr -d ' ')
    if [ "$file_count" -gt 0 ]; then
        echo "   ✓ out 目录包含 $file_count 个文件"
    else
        echo "   ⚠ out 目录为空，需要运行: npm run build"
    fi
else
    echo "   ⚠ out 目录不存在，需要运行: npm run build"
fi

echo ""

# 总结
echo "=== 检查完成 ==="
echo ""
echo "如果所有检查都通过，可以运行:"
echo "  npm run build:win   # 构建 Windows 版本"
echo "  npm run build:mac   # 构建 macOS 版本"
echo "  npm run build:linux # 构建 Linux 版本"
echo ""
