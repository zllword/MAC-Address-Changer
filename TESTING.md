# 测试文档

本文档描述了 MAC 地址修改器项目的测试策略、结构和运行方式。

## 测试类型

### 1. 单元测试

单元测试测试独立的函数和模块，不依赖外部系统。

**覆盖范围：**
- MAC 地址验证功能
- MAC 地址生成功能
- MAC 地址格式化功能
- 平台检测逻辑

**运行方式：**
```bash
# 运行所有单元测试
npm run test:unit

# 监听模式（开发时使用）
npm run test:watch

# 生成覆盖率报告
npm run test:coverage
```

**测试文件位置：**
- `src/main/ipc/handlers/__tests__/validate.test.ts`
- `src/main/ipc/handlers-cjs/__tests__/validate.test.cjs`

### 2. 功能测试

功能测试测试模块间的交互和业务逻辑。

**覆盖范围：**
- 网卡列表获取（Windows 和 macOS）
- MAC 地址修改流程
- 原始 MAC 地址恢复
- 错误处理和边界情况

**运行方式：**
```bash
npm run test
```

**测试文件位置：**
- `src/main/__tests__/platform.test.ts`
- `src/main/__tests__/mac-address.test.ts`

### 3. E2E 测试

端到端测试模拟真实用户操作，验证整个应用的集成。

**覆盖范围：**
- 应用启动和界面加载
- 网卡选择和显示
- MAC 地址修改完整流程
- UI 交互和响应
- 错误场景处理

**运行方式：**
```bash
# 首先需要启动应用
npm run dev

# 然后在另一个终端运行 E2E 测试
npm run test:e2e
```

**测试文件位置：**
- `tests/e2e/mac-changer.spec.ts`

## 测试结构

```
mac-address-changer/
├── src/
│   ├── main/
│   │   ├── __tests__/              # 主进程功能测试
│   │   │   ├── platform.test.ts
│   │   │   └── mac-address.test.ts
│   │   └── ipc/
│   │       ├── handlers/
│   │       │   ├── __tests__/      # 单元测试
│   │       │   │   └── validate.test.ts
│   │       │   └── handlers-cjs/
│   │       │       └── __tests__/
│   │       │           └── validate.test.cjs
├── tests/
│   └── e2e/                       # E2E 测试
│       └── mac-changer.spec.ts
├── jest.config.js                  # Jest 配置
├── playwright.config.ts            # Playwright 配置
└── TESTING.md                      # 本文档
```

## 测试覆盖率目标

| 模块 | 目标覆盖率 | 当前状态 |
|------|-----------|---------|
| MAC 地址验证器 | 100% | ✅ |
| MAC 地址生成器 | 100% | ✅ |
| 平台检测逻辑 | 90% | ✅ |
| 网卡列表获取 | 80% | ⚠️ 需要真实环境 |
| MAC 地址修改 | 75% | ⚠️ 需要管理员权限 |
| IPC 处理器 | 85% | ✅ |
| UI 组件 | 70% | 📝 待添加 |

## Mock 策略

由于部分功能需要系统级权限或特定平台，测试中使用了 Mock：

### 单元测试和功能测试
- **child_process**: Mock `exec` 和 `execSync` 来模拟命令执行
- **process.platform**: 动态切换来测试不同平台逻辑

### E2E 测试
- **真实环境**: 在真实的 Electron 环境中运行
- **用户交互**: 模拟真实用户操作

## 运行测试的注意事项

### Windows 环境
```bash
# 以管理员身份运行
npm run test
npm run test:e2e
```

### macOS 环境
```bash
# 需要 sudo 权限
sudo npm run test
sudo npm run test:e2e
```

### CI/CD 环境
在 CI 环境中，需要配置：
1. 安装必要的依赖
2. 设置正确的权限
3. 配置测试环境变量

## 持续集成

测试在以下情况下自动运行：
- 每次 Pull Request
- 每次合并到主分支
- 定期夜间构建

## 添加新测试

### 添加单元测试

1. 在相应目录创建 `*.test.ts` 文件
2. 导入要测试的模块
3. 使用 Jest 的 `describe` 和 `test` API
4. 运行测试验证

示例：
```typescript
import { myFunction } from '../myModule';

describe('myFunction', () => {
  test('应该返回正确的结果', () => {
    const result = myFunction('input');
    expect(result).toBe('expected output');
  });
});
```

### 添加 E2E 测试

1. 在 `tests/e2e/` 目录创建测试文件
2. 使用 Playwright 的 Page API
3. 包含完整的用户流程

示例：
```typescript
test('用户流程测试', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await page.click('.button');
  await expect(page.locator('.result')).toBeVisible();
});
```

## 故障排除

### 问题：单元测试失败

**解决方案：**
- 检查 Mock 是否正确配置
- 验证导入路径是否正确
- 查看错误消息和堆栈跟踪

### 问题：E2E 测试超时

**解决方案：**
- 确保应用正在运行（`npm run dev`）
- 检查端口是否正确（默认 5173）
- 增加超时时间

### 问题：权限错误

**解决方案：**
- Windows: 以管理员身份运行
- macOS: 使用 `sudo` 运行
- Linux: 配置 sudoers 文件

## 测试最佳实践

1. **独立性**: 每个测试应该独立运行，不依赖其他测试
2. **可重复性**: 测试结果应该是可重复的
3. **快速**: 单元测试应该快速执行（< 100ms）
4. **清晰**: 测试名称应该清楚说明测试的内容
5. **维护性**: 使用辅助函数减少重复代码

## 相关文档

- [Jest 官方文档](https://jestjs.io/)
- [Playwright 官方文档](https://playwright.dev/)
- [Vue Test Utils 文档](https://test-utils.vuejs.org/)
