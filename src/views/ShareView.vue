<template>
  <div class="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4">
    <div class="max-w-4xl w-full bg-white p-8 rounded-xl shadow-md space-y-6">

      <div class="border-b pb-4 flex justify-between items-center">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">
            {{ fileInfo.fileName || '极光网盘 · 共享文件提取' }}
          </h1>
          <p class="text-sm text-gray-500 mt-1">
            分享者 ID: {{ fileInfo.userId || '未知' }} | 失效时间: {{ fileInfo.expireTime }}
          </p>
        </div>
        <span class="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
          安全加密网关
        </span>
      </div>

      <div v-if="hasVerified" class="space-y-4">
        <h3 class="text-lg font-medium text-gray-700">📋 允许下载的资产</h3>
        <div class="border rounded-lg p-4 flex justify-between items-center bg-gray-50">
          <div class="flex items-center space-x-3">
            <span class="text-2xl">📄</span>
            <div>
              <p class="font-medium text-gray-800">{{ fileInfo.fileName }}</p>
              <p class="text-xs text-gray-400">大小: {{ fileInfo.fileSize || '未知' }}</p>
            </div>
          </div>
          <button @click="downloadFile" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
            立即下载
          </button>
        </div>
      </div>

      <div v-else-if="loading" class="text-center py-12 text-gray-500">
        正在穿透网关查询分享状态...
      </div>

      <div v-else class="text-center py-12 text-gray-400">
        🔒 该资源受安全协议保护，需在弹窗中校验提取口令。
      </div>
    </div>

    <ShareModal
        :visible="isModalVisible"
        :shortLink="shortLink"
        @verify-success="handleVerifySuccess"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'
import ShareModal from '@/components/ShareModal.vue'

const route = useRoute()
// 🎯 提取路由中的短链特征码
const shortLink = route.params.shortLink

const loading = ref(true)
const isModalVisible = ref(false)
const hasVerified = ref(false)
const fileInfo = ref({ expireTime: '计算中...' })

onMounted(async () => {
  try {
    // 📡 调用后端接口：根据短链获取该分享的基本配置（比如是否需要密码、是否过期）
    const res = await axios.get(`/shares/info/${shortLink}`)

    // 对应你的持久化 FileShare 结构：判断 extractionCode 是否存在
    if (res.data.hasExtractionCode) {
      isModalVisible.value = true // 需要口令，刚性拉起弹窗！
    } else {
      // 没口令，说明是公开分享，直接展示文件
      fileInfo.value = res.data
      hasVerified.value = true
    }
  } catch (error) {
    console.error('穿透网关失败，可能后端 8080 挂了:', error)
    // 🛡️ 防御性降级：接口挂了也强行弹窗，绝不让页面死白
    isModalVisible.value = true
  } finally {
    loading.value = false
  }
})

// 处理口令校验通过的回调
const handleVerifySuccess = (backedFileInfo) => {
  isModalVisible.value = false
  hasVerified.value = true
  if (backedFileInfo) {
    fileInfo.value = backedFileInfo
  }
}

const downloadFile = () => {
  // 执行具体的物理下载逻辑，比如 window.open 或 axios blob 下载
  alert('开始下载资产: ' + fileInfo.value.fileName)
}
</script>