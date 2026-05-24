<template>
  <div class="min-h-screen bg-gradient-to-tr from-slate-950 via-indigo-950 to-slate-950 flex flex-col text-slate-100 relative">

    <header class="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-box">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <CloudLightning class="text-white h-6 w-6" />
          </div>
          <div>
            <span class="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">CloudSphere</span>
            <span class="ml-1 text-[10px] font-bold text-indigo-400 px-1.5 py-0.5 rounded bg-indigo-950/80 border border-indigo-800/40">极光网盘</span>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <template v-if="isLogin">
            <button @click="handleLogout" class="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/20 transition-all shadow-md shadow-rose-950/20">
              安全登出
            </button>
          </template>
        </div>
      </div>
    </header>

    <main class="flex-1 flex flex-col">
      <AuthPortal v-if="!isLogin" :apiBase="apiBase" @onAuthSuccess="handleAuthSuccess" />
      <ControlCenter v-else :apiBase="apiBase" :token="token" />
    </main>

    <MediaTheater
        v-if="previewFile"
        :file="previewFile"
        :token="token"
        @onCloseTheater="previewFile = null"
    />

    <div class="fixed bottom-6 right-6 z-50 space-y-3 pointer-events-none">
      <div v-for="toast in toasts" :key="toast.id" :class="['px-5 py-3 rounded-xl shadow-2xl border transition-all duration-300 pointer-events-auto text-sm font-semibold flex items-center gap-2',
        toast.type === 'success' ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-300' :
        toast.type === 'error' ? 'bg-rose-950/90 border-rose-500/50 text-rose-300' : 'bg-indigo-950/90 border-indigo-500/50 text-indigo-300']">
        <span>{{ toast.msg }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { CloudLightning } from 'lucide-vue-next' // 🟢 已安全移除未使用的 Settings 图标引用
import AuthPortal from './components/AuthPortal.vue'
import ControlCenter from './components/ControlCenter.vue'
import MediaTheater from './components/MediaTheater.vue'

// 🎯 刚性收拢：不再读取用户本地缓存，强制默认锁定当前宿主机的物理同源网关（与 Vite 代理、生产同源环境 100% 贴合）
const apiBase = ref(`${window.location.protocol}//${window.location.host}`)
const token = ref(localStorage.getItem('cs_token') || '')
const isLogin = ref(!!token.value)
const toasts = ref([])
const previewFile = ref(null)

const handleAuthSuccess = (jwtToken) => {
  token.value = jwtToken
  localStorage.setItem('cs_token', jwtToken)
  isLogin.value = true
}

const handleLogout = () => {
  localStorage.removeItem('cs_token')
  token.value = ''
  isLogin.value = false
  previewFile.value = null
  pushToast('身份凭证已安全注销', 'info')
}

const pushToast = (msg, type = 'info') => {
  const id = Date.now()
  toasts.value.push({ id, msg, type })
  setTimeout(() => { toasts.value = toasts.value.filter(t => t.id !== id) }, 3500)
}

onMounted(() => {
  window.addEventListener('toast', (e) => pushToast(e.detail.msg, e.detail.type))

  // 挂载全局物理流安全下载大闸
  window.addEventListener('fallback-download', (e) => {
    const file = e.detail
    pushToast(`正在开启物理读通道下载: ${file.name}...`, 'info')
    axios({
      url: `${apiBase.value}/file/download/${file.id}`,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token.value}` },
      responseType: 'blob'
    }).then((res) => {
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url; a.download = file.name; a.click(); window.URL.revokeObjectURL(url)
      pushToast(`[${file.name}] 下载成功`, 'success')
    }).catch(() => { pushToast('下载失败，请校检物权', 'error') })
  })
})
</script>