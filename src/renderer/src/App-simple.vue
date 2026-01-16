<template>
  <div style="padding: 20px; background: #f5f5f5; min-height: 100vh;">
    <h1 style="color: #333; margin-bottom: 20px;">Windows MAC 地址修改器</h1>
    
    <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
      <h2>测试信息</h2>
      <p>Vue 应用已成功加载！</p>
      <p>electronAPI 状态: {{ electronAPIAvailable ? '可用' : '不可用' }}</p>
      <p>网卡数量: {{ adapters.length }}</p>
    </div>

    <div style="background: white; padding: 20px; border-radius: 8px;">
      <h2>网卡列表</h2>
      <div v-if="adapters.length === 0" style="color: #999;">
        暂无网卡数据，请点击刷新按钮
      </div>
      <div v-else>
        <div v-for="adapter in adapters" :key="adapter.name" style="padding: 10px; border-bottom: 1px solid #eee;">
          <strong>{{ adapter.name }}</strong>
          <p style="color: #666; margin: 5px 0;">{{ adapter.description }}</p>
          <p style="color: #999; font-size: 12px;">MAC: {{ adapter.macAddress }}</p>
        </div>
      </div>
      <button @click="refreshAdapters" :disabled="loading" style="margin-top: 15px; padding: 10px 20px; background: #409eff; color: white; border: none; border-radius: 4px; cursor: pointer;">
        {{ loading ? '加载中...' : '刷新网卡列表' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface NetworkAdapter {
  name: string
  description: string
  macAddress: string
  status: string
}

const adapters = ref<NetworkAdapter[]>([])
const loading = ref<boolean>(false)
const electronAPIAvailable = ref<boolean>(false)

const refreshAdapters = async () => {
  if (!window.electronAPI) {
    alert('electronAPI 不可用')
    return
  }
  
  loading.value = true
  try {
    const result = await window.electronAPI.getAdapters()
    if (result.success && result.data) {
      adapters.value = result.data
    } else {
      alert(`获取失败: ${result.error}`)
    }
  } catch (error: any) {
    alert(`错误: ${error.message}`)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  electronAPIAvailable.value = !!window.electronAPI
  if (window.electronAPI) {
    refreshAdapters()
  }
})
</script>
