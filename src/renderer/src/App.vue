<template>
  <div class="mac-changer-app">
    <!-- 调试信息 -->
    <div v-if="showDebug" style="position: fixed; top: 0; left: 0; right: 0; background: yellow; padding: 10px; z-index: 9999; font-size: 12px;">
      <p><strong>Vue 应用已加载</strong></p>
      <p>electronAPI: {{ electronAPIAvailable ? '可用' : '不可用' }}</p>
      <p>网卡数量: {{ adapters.length }}</p>
      <button @click="showDebug = false" style="margin-top: 5px;">关闭调试信息</button>
    </div>
    <el-container>
      <el-header class="app-header">
        <h1>Windows MAC 地址修改器</h1>
      </el-header>

      <el-main class="app-main">
        <el-card shadow="hover">
          <!-- 网卡选择 -->
          <div class="form-section">
            <h3>选择网络适配器</h3>
            <el-select
              v-model="selectedAdapter"
              placeholder="请选择网络适配器"
              @change="onAdapterChange"
              style="width: 100%"
            >
              <el-option
                v-for="adapter in adapters"
                :key="adapter.name"
                :label="`${adapter.name} - ${adapter.description}`"
                :value="adapter.name"
              >
                <span style="float: left">{{ adapter.name }}</span>
                <span style="float: right; color: #8492a6; font-size: 13px">
                  {{ adapter.macAddress }}
                </span>
              </el-option>
            </el-select>

            <el-button
              type="primary"
              @click="refreshAdapters"
              :loading="loading"
              style="margin-top: 10px"
            >
              刷新网卡列表
            </el-button>
          </div>

          <el-divider />

          <!-- 当前 MAC 地址 -->
          <div class="form-section" v-if="currentAdapter">
            <h3>当前信息</h3>
            <el-descriptions :column="1" border>
              <el-descriptions-item label="网卡名称">
                {{ currentAdapter.name }}
              </el-descriptions-item>
              <el-descriptions-item label="描述">
                {{ currentAdapter.description }}
              </el-descriptions-item>
              <el-descriptions-item label="当前 MAC">
                {{ currentAdapter.macAddress }}
              </el-descriptions-item>
              <el-descriptions-item label="状态">
                <el-tag :type="currentAdapter.status === 'Up' ? 'success' : 'info'">
                  {{ currentAdapter.status === 'Up' ? '已连接' : '已断开' }}
                </el-tag>
              </el-descriptions-item>
            </el-descriptions>
          </div>

          <el-divider />

          <!-- MAC 地址输入 -->
          <div class="form-section">
            <h3>修改 MAC 地址</h3>
            <el-input
              v-model="newMacAddress"
              placeholder="请输入新的 MAC 地址 (例如: 00:11:22:33:44:55)"
              clearable
            >
              <template #append>
                <el-button @click="generateRandomMac">随机生成</el-button>
              </template>
            </el-input>

            <div class="button-group">
              <el-button
                type="primary"
                @click="changeMac"
                :disabled="!selectedAdapter || !newMacAddress"
                :loading="changing"
                size="large"
              >
                修改 MAC 地址
              </el-button>

              <el-button
                @click="restoreOriginalMac"
                :disabled="!selectedAdapter || !originalMac"
                :loading="restoring"
                size="large"
              >
                恢复原始 MAC
              </el-button>
            </div>
          </div>

          <el-divider />

          <!-- 操作日志 -->
          <div class="form-section">
            <h3>操作日志</h3>
            <el-alert
              v-for="(log, index) in logs"
              :key="index"
              :title="log.message"
              :type="log.type"
              :closable="false"
              style="margin-bottom: 10px"
            >
              <template #default>
                <span style="font-size: 12px; color: #909399">[{{ log.time }}]</span>
                {{ log.message }}
              </template>
            </el-alert>
            <el-empty v-if="logs.length === 0" description="暂无日志" />
          </div>
        </el-card>
      </el-main>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onErrorCaptured } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

interface NetworkAdapter {
  name: string
  description: string
  macAddress: string
  status: string
}

interface Log {
  time: string
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
}

const adapters = ref<NetworkAdapter[]>([])
const selectedAdapter = ref<string>('')
const newMacAddress = ref<string>('')
const originalMac = ref<string>('')
const loading = ref<boolean>(false)
const changing = ref<boolean>(false)
const restoring = ref<boolean>(false)
const logs = ref<Log[]>([])
const showDebug = ref<boolean>(true) // 开发模式下显示调试信息
const electronAPIAvailable = ref<boolean>(false)

const currentAdapter = computed(() => {
  return adapters.value.find(a => a.name === selectedAdapter.value)
})

// 获取网卡列表
const refreshAdapters = async () => {
  loading.value = true
  try {
    const result = await window.electronAPI.getAdapters()
    if (result.success && result.data) {
      adapters.value = result.data
      addLog('网卡列表已刷新', 'success')
    } else {
      addLog(`获取网卡列表失败: ${result.error}`, 'error')
    }
  } catch (error: any) {
    addLog(`获取网卡列表失败: ${error.message}`, 'error')
  } finally {
    loading.value = false
  }
}

// 选择网卡
const onAdapterChange = () => {
  const adapter = currentAdapter.value
  if (adapter) {
    originalMac.value = adapter.macAddress
    addLog(`已选择网卡: ${adapter.name}`, 'info')
  }
}

// 修改 MAC 地址
const changeMac = async () => {
  if (!selectedAdapter.value || !newMacAddress.value) {
    ElMessage.warning('请选择网卡并输入新的 MAC 地址')
    return
  }

  // 验证 MAC 地址格式
  const validation = await window.electronAPI.validateMac(newMacAddress.value)
  if (!validation.valid) {
    ElMessage.error(validation.message)
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要将网卡 "${selectedAdapter.value}" 的 MAC 地址修改为 "${newMacAddress.value}" 吗？`,
      '确认修改',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    changing.value = true
    const result = await window.electronAPI.changeMac(selectedAdapter.value, newMacAddress.value)

    if (result.success) {
      addLog(result.message, 'success')
      ElMessage.success('MAC 地址修改成功！')
      // 刷新网卡列表
      await refreshAdapters()
    } else {
      addLog(result.message, 'error')
      ElMessage.error(result.message)
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      addLog(`修改失败: ${error.message}`, 'error')
    }
  } finally {
    changing.value = false
  }
}

// 恢复原始 MAC
const restoreOriginalMac = async () => {
  if (!selectedAdapter.value || !originalMac.value) {
    ElMessage.warning('没有可恢复的原始 MAC 地址')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要将网卡 "${selectedAdapter.value}" 恢复为原始 MAC 地址 "${originalMac.value}" 吗？`,
      '确认恢复',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    restoring.value = true
    const result = await window.electronAPI.restoreMac(selectedAdapter.value, originalMac.value)

    if (result.success) {
      addLog(result.message, 'success')
      ElMessage.success('MAC 地址已恢复！')
      // 刷新网卡列表
      await refreshAdapters()
    } else {
      addLog(result.message, 'error')
      ElMessage.error(result.message)
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      addLog(`恢复失败: ${error.message}`, 'error')
    }
  } finally {
    restoring.value = false
  }
}

// 生成随机 MAC
const generateRandomMac = async () => {
  const randomMac = await window.electronAPI.generateRandomMac()
  newMacAddress.value = randomMac
  addLog(`已生成随机 MAC: ${randomMac}`, 'info')
}

// 添加日志
const addLog = (message: string, type: Log['type']) => {
  const now = new Date()
  const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
  logs.value.unshift({ time, message, type })
  // 只保留最近 20 条日志
  if (logs.value.length > 20) {
    logs.value = logs.value.slice(0, 20)
  }
}

// 错误捕获
onErrorCaptured((err, _instance, info) => {
  console.error("组件错误:", err, info);
  addLog(`发生错误: ${err.message}`, "error");
  return false;
});

onMounted(() => {
  console.log("App.vue onMounted 被调用");
  
  // 检查 electronAPI 是否可用
  if (window.electronAPI) {
    electronAPIAvailable.value = true;
    console.log("electronAPI 可用");
    console.log("应用已启动，开始加载网卡列表");
    refreshAdapters();
    addLog("应用已启动", "info");
  } else {
    electronAPIAvailable.value = false;
    console.error("electronAPI 未定义");
    addLog("electronAPI 未定义，请检查 preload 脚本", "error");
  }
  
  // 3秒后隐藏调试信息
  setTimeout(() => {
    showDebug.value = false;
  }, 3000);
});
</script>

<style scoped>
.mac-changer-app {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.app-header {
  background-color: rgba(255, 255, 255, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.app-header h1 {
  margin: 0;
  color: #333;
  font-size: 24px;
}

.app-main {
  padding: 20px;
  max-width: 900px;
  margin: 0 auto;
}

.form-section {
  margin-bottom: 20px;
}

.form-section h3 {
  margin-bottom: 15px;
  color: #333;
  font-size: 16px;
  font-weight: 600;
}

.button-group {
  margin-top: 20px;
  display: flex;
  gap: 10px;
}

.button-group .el-button {
  flex: 1;
}
</style>

<style>
body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu',
    'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
}

#app {
  min-height: 100vh;
}
</style>
