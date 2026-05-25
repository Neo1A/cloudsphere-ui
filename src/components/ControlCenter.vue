<template>
  <div class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col lg:flex-row gap-8">

    <FileCabinet
        ref="cabinetRef"
        :apiBase="apiBase"
        :token="token"
        @onTriggerPreview="handleTriggerPreview"
        @onFolderChanged="handleFolderChanged"
    />

    <UploadQueue
        :apiBase="apiBase"
        :token="token"
        :currentFolderId="activeFolderId"
        @onUploadFinished="refreshCabinet"
    />

    <MediaTheater
        v-if="previewFile && previewFile.type !== 'unsupported'"
        :file="previewFile"
        :token="token"
        @onCloseTheater="previewFile = null"
    />

    <div v-if="isExeModalOpen"
         class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div class="max-w-md w-full rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl relative text-center">

        <div
            class="mx-auto w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mb-4">
          <AlertTriangle class="h-6 w-6"/>
        </div>

        <h3 class="text-base font-black text-slate-100 mb-2">系统安全防护提示</h3>

        <div
            class="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 text-left font-mono text-xs text-slate-400 mb-4 break-all">
          <p class="text-indigo-400 font-bold mb-1">文件名称：</p>
          <p class="mb-2 text-slate-200">{{ exeFileInfo.name }}</p>
          <p class="text-indigo-400 font-bold mb-1">文件属性：</p>
          <p class="text-rose-400 font-bold">Windows 可执行二进制程序 (.exe)</p>
        </div>

        <p class="text-xs text-slate-400 leading-relaxed px-2 mb-6">
          当前宿主机沙盒环境已激活多租户纵向物理隔离。由于安全合规风险，网盘系统**严禁在浏览器端在线反编译或挂载运行可执行程序**。
        </p>

        <div class="flex gap-3">
          <button
              @click="triggerDownload(exeFileInfo)"
              class="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-500/20"
          >
            <Download class="h-3.5 w-3.5"/>
            依旧下载到本地
          </button>
          <button
              @click="isExeModalOpen = false"
              class="px-5 py-2.5 rounded-xl border border-slate-700 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            关闭
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import {ref} from 'vue'
import axios from 'axios'
import {AlertTriangle, Download} from 'lucide-vue-next'
import FileCabinet from './FileCabinet.vue'
import UploadQueue from './UploadQueue.vue'
import MediaTheater from './MediaTheater.vue'

const props = defineProps({
  apiBase: {type: String, required: true},
  token: {type: String, required: true}
})

const activeFolderId = ref(0)
const cabinetRef = ref(null)
const previewFile = ref(null)

// 🎯 Exe 专属非流控通用弹窗状态机
const isExeModalOpen = ref(false)
const exeFileInfo = ref(null)

const handleFolderChanged = (folderId) => {
  activeFolderId.value = folderId
}

const refreshCabinet = () => {
  cabinetRef.value?.refresh()
}

// 🚀 核心逻辑拦截升级
const handleTriggerPreview = (file) => {
  const extension = file.name.split('.').pop().toLowerCase()

  // 🛡️ 升级后的全量安全黑名单 (定义哪些格式严禁预览/运行)
  const blacklist = ['exe', 'msi', 'bat', 'sh', 'com', 'cmd', 'ps1']

  if (blacklist.includes(extension)) {
    exeFileInfo.value = file
    isExeModalOpen.value = true
    return
  }

  // 正常文件流则继续派发
  previewFile.value = file
}

// 独立于放映厅外的普通物理下载直通车
const triggerDownload = (file) => {
  window.dispatchEvent(new CustomEvent('toast', {detail: {msg: '正在拉取程序二进制流...', type: 'info'}}))
  axios({
    url: file.url,
    method: 'GET',
    headers: {'Authorization': `Bearer ${props.token}`},
    responseType: 'blob'
  }).then((res) => {
    const url = window.URL.createObjectURL(new Blob([res.data]))
    const a = document.createElement('a')
    a.href = url
    a.download = file.name
    a.click()
    window.URL.revokeObjectURL(url)
    isExeModalOpen.value = false
  })
}
</script>


