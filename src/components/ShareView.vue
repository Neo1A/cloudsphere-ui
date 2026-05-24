<template>
  <div class="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden select-none">
    <div class="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none"></div>

    <div class="max-w-md w-full rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-md p-6 shadow-2xl relative z-10 text-slate-200">

      <div class="text-center mb-6">
        <h2 class="text-lg font-black text-indigo-400 tracking-wider flex items-center justify-center gap-2">
          <CloudDownload class="h-6 w-6" /> CloudSphere 极光共享
        </h2>
        <p class="text-[11px] text-slate-500 mt-1">工业级物理隔离防外溢资产提取网关</p>
      </div>

      <div v-if="!isUnlocked" class="space-y-4">
        <div class="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/80 text-center">
          <p class="text-xs font-semibold text-slate-400">该安全共享链接受提取码保护</p>
          <p class="text-[10px] text-slate-600 mt-0.5">请输入文件创建者下发的 4 位数字口令</p>
        </div>

        <div class="space-y-2">
          <input
              type="text"
              maxlength="4"
              v-model="extractionCode"
              @keyup.enter="handleVerifyCode"
              class="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-center font-mono font-bold tracking-[1em] text-lg text-slate-100 outline-none transition-colors"
              placeholder="••••"
          />
        </div>

        <button
            @click="handleVerifyCode"
            :disabled="verifying"
            class="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold text-xs text-white transition-all flex items-center justify-center gap-1.5"
        >
          <span v-if="verifying" class="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent"></span>
          {{ verifying ? '正在校验物权密令...' : '验证口令并提取资产' }}
        </button>
      </div>

      <div v-else class="space-y-5">
        <div class="flex items-start gap-4 p-4 rounded-xl bg-slate-950/50 border border-slate-800/80">
          <div :class="['p-3 rounded-xl shrink-0', fileIconInfo.bgClass, fileIconInfo.colorClass]">
            <component :is="fileIconInfo.icon" class="h-6 w-6" />
          </div>
          <div class="flex-1 min-w-0">
            <h4 class="text-sm font-bold text-slate-100 truncate" :title="shareMetadata.fileName">
              {{ shareMetadata.fileName }}
            </h4>
            <p class="text-[10px] text-slate-500 mt-1">
              文件体积: {{ shareMetadata.folder ? '文件夹' : formatSize(shareMetadata.fileSize) }}
            </p>
          </div>
        </div>

        <div class="text-[11px] text-slate-500 space-y-1 px-1">
          <p>创造属主：<span class="text-slate-400 font-medium">{{ shareMetadata.ownerName }}</span></p>
          <p>到期熔断：<span class="text-rose-400 font-medium">{{ shareMetadata.expireTime || '永久有效' }}</span></p>
        </div>

        <button
            @click="handleDownloadSharedFile"
            :disabled="downloading"
            class="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-xs text-white transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/10"
        >
          <Download class="h-4 w-4" />
          {{ downloading ? '流控数据打包对灌中...' : '高速安全下载' }}
        </button>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, reactive } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'
import {
  CloudDownload, Folder, FileVideo, FileAudio, FileImage, FileText,
  FileSpreadsheet, FileArchive, ShieldAlert, File, Download
} from 'lucide-vue-next'

const route = useRoute()
const shortLink = route.params.shortLink // 捕获 8 位短链特征码

const extractionCode = ref('')
const isUnlocked = ref(false)
const verifying = ref(false)
const downloading = ref(false)

// 共享文件的核心元数据载体
const shareMetadata = reactive({
  fileId: null,
  fileName: '',
  fileSize: 0,
  folder: false,
  ownerName: '',
  expireTime: ''
})

// 🚀 1. 页面挂载时前置探测：该分享链接是否需要提取码，不需要则直接解锁
const checkShareStatus = async () => {
  try {
    const apiBase = window.location.origin === 'http://localhost:5173' ? 'http://localhost:8080' : ''
    const res = await axios.get(`${apiBase}/public/shares/info/${shortLink}`)
    if (res.data.code === 200) {
      const data = res.data.data
      if (!data.needCode) {
        // 如果后端判定该分享不需要提取码，直接越过输入状态
        Object.assign(shareMetadata, data)
        isUnlocked.value = true
      }
    }
  } catch {
    toast('该共享链接已过时或已被物理粉碎', 'error')
  }
}

// 🚀 2. 提取口令异步验证
const handleVerifyCode = async () => {
  if (extractionCode.value.length !== 4) {
    toast('请输入完整的4位凭证密令', 'error')
    return
  }
  verifying.value = true
  try {
    const apiBase = window.location.origin === 'http://localhost:5173' ? 'http://localhost:8080' : ''
    const res = await axios.post(`${apiBase}/public/shares/verify/${shortLink}`, {
      code: extractionCode.value
    })
    if (res.data.code === 200) {
      Object.assign(shareMetadata, res.data.data)
      isUnlocked.value = true
      toast('口令核验成功，物理资产提取就绪', 'success')
    } else {
      toast(res.data.message || '口令错误', 'error')
    }
  } catch {
    toast('密令验证失败，请校检准确性', 'error')
  } finally {
    verifying.value = false
  }
}

// 🚀 3. 扣动后端流控管道进行匿名下载
const handleDownloadSharedFile = () => {
  downloading.value = true
  const apiBase = window.location.origin === 'http://localhost:5173' ? 'http://localhost:8080' : ''

  // 针对文件夹下载和单文件下载，走不同的公共路由分支
  const downloadUrl = shareMetadata.folder
      ? `${apiBase}/public/shares/download/folder/${shortLink}?code=${extractionCode.value}`
      : `${apiBase}/public/shares/download/${shortLink}?code=${extractionCode.value}`

  axios({
    url: downloadUrl,
    method: 'GET',
    responseType: 'blob'
  }).then((response) => {
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    // 如果是文件夹则下载 zip 压缩包，普通文件直接下载原名
    link.setAttribute('download', shareMetadata.folder ? `${shareMetadata.fileName}.zip` : shareMetadata.fileName)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  }).catch(() => {
    toast('流通道读取失败，文件可能已触发定时失效熔断', 'error')
  }).finally(() => {
    downloading.value = false
  })
}

// 动态色彩及图标自适应计算
const fileIconInfo = computed(() => {
  if (shareMetadata.folder) return { icon: Folder, colorClass: 'text-indigo-400', bgClass: 'bg-indigo-500/10' }
  const ext = shareMetadata.fileName.split('.').pop().toLowerCase()
  if (['mp4', 'mkv', 'mov'].includes(ext)) return { icon: FileVideo, colorClass: 'text-rose-400', bgClass: 'bg-rose-500/10' }
  if (['mp3', 'wav'].includes(ext)) return { icon: FileAudio, colorClass: 'text-emerald-400', bgClass: 'bg-emerald-500/10' }
  if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) return { icon: FileImage, colorClass: 'text-blue-400', bgClass: 'bg-blue-500/10' }
  if (['zip', 'rar', '7z'].includes(ext)) return { icon: FileArchive, colorClass: 'text-amber-400', bgClass: 'bg-amber-500/10' }
  return { icon: File, colorClass: 'text-slate-400', bgClass: 'bg-slate-500/10' }
})

const formatSize = (bytes) => {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const toast = (msg, type) => {
  window.dispatchEvent(new CustomEvent('toast', { detail: { msg, type } }))
}

onMounted(() => {
  checkShareStatus()
})
</script>