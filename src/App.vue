<template>
  <div
      class="min-h-screen bg-gradient-to-tr from-slate-950 via-indigo-950 to-slate-950 flex flex-col text-slate-100 relative antialiased">

    <header v-if="showHeader" class="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md select-none">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div
              class="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <span class="text-white text-xl font-bold">⚡</span>
          </div>
          <div>
            <span
                class="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">CloudSphere</span>
            <span
                class="ml-1 text-[10px] font-bold text-indigo-400 px-1.5 py-0.5 rounded bg-indigo-950/80 border border-indigo-800/40">主控制台</span>
          </div>
        </div>

        <div class="flex items-center gap-3 relative">
          <div v-if="isLogin" class="relative">
            <button @click.stop="toggleDropdown"
                    class="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-slate-700 transition-all shadow-md flex items-center gap-2 cursor-pointer">
              <span class="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              用户: <span class="text-indigo-400 font-extrabold">{{ currentUsername }}</span>
              <span class="text-[10px] opacity-60 transition-transform duration-200" :class="{'rotate-180': dropdownOpen}">▼</span>
            </button>

            <div v-if="dropdownOpen"
                 class="absolute right-0 mt-2 w-40 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-1.5 z-50 text-xs font-bold animate-fade-in">
              <button @click="handleSwitchUser"
                      class="w-full text-left px-4 py-2.5 text-slate-300 hover:bg-indigo-500/10 hover:text-indigo-400 transition-colors flex items-center gap-2 cursor-pointer">
                🔄 切换用户
              </button>
              <div class="border-t border-slate-800/60 my-1"></div>
              <button @click="handleLogout"
                      class="w-full text-left px-4 py-2.5 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors flex items-center gap-2 cursor-pointer">
                🚪 安全登出
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>

    <main class="flex-1 flex flex-col">
      <router-view/>
    </main>

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
import { ref, onMounted, computed, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import axios from 'axios'

const router = useRouter()
const route = useRoute()

const token = ref(localStorage.getItem('cs_token') || '')
const isLogin = ref(!!token.value)
const currentUsername = ref(localStorage.getItem('cs_username') || '未知租户')
const toasts = ref([])

// 🎯 下拉菜单控制开关
const dropdownOpen = ref(false)
const toggleDropdown = () => { dropdownOpen.value = !dropdownOpen.value }
const closeDropdown = () => { dropdownOpen.value = false }

// 动态判定 Header 显隐大闸
const showHeader = computed(() => {
  return route.path !== '/login' && !route.path.startsWith('/s/')
})

// 🚪 退出登录大闸：擦除一切状态，打回登录界面
const handleLogout = () => {
  closeDropdown()
  localStorage.removeItem('cs_token')
  localStorage.removeItem('cs_username')
  sessionStorage.removeItem('cs_redirect_back') // 擦除可能有过的回跳暗号
  token.value = ''
  isLogin.value = false
  currentUsername.value = '未知租户'
  pushToast('极光物权身份已安全注销', 'info')
  router.push('/login')
}

// 🔄 一键平滑切换用户
const handleSwitchUser = () => {
  closeDropdown()
  // 🧠 核心机制：如果是切账号，我们记录当前所在的页面路径，方便新账号登录后一键闪现原位召回！
  sessionStorage.setItem('cs_redirect_back', route.fullPath)

  localStorage.removeItem('cs_token')
  localStorage.removeItem('cs_username')
  token.value = ''
  isLogin.value = false
  pushToast('准备换舱，请核验新租户凭证', 'info')
  router.push('/login')
}

const pushToast = (msg, type = 'info') => {
  const id = Date.now()
  toasts.value.push({id, msg, type})
  setTimeout(() => {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }, 3500)
}

onMounted(() => {
  window.addEventListener('toast', (e) => pushToast(e.detail.msg, e.detail.type))
  // 💡 监听全局点击事件，实现点击空白处自动收起下拉面板
  window.addEventListener('click', closeDropdown)

  // 监听凭证校验事件更新本地登录状态
  window.addEventListener('auth-success', () => {
    token.value = localStorage.getItem('cs_token') || ''
    isLogin.value = !!token.value
    currentUsername.value = localStorage.getItem('cs_username') || '未知租户'
  })

  // 挂载全局物理流安全下载大闸
  window.addEventListener('fallback-download', (e) => {
    const file = e.detail
    pushToast(`正在开启物理读通道下载: ${file.name}...`, 'info')
    axios({
      url: `/file/download/${file.id}`,
      method: 'GET',
      headers: {'Authorization': `Bearer ${token.value}`},
      responseType: 'blob'
    }).then((res) => {
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url;
      a.download = file.name;
      a.click();
      window.URL.revokeObjectURL(url)
      pushToast(`[${file.name}] 下载成功`, 'success')
    }).catch(() => {
      pushToast('下载失败，请校检物权', 'error')
    })
  })
})

onBeforeUnmount(() => {
  window.removeEventListener('click', closeDropdown)
})
</script>