<template>
  <div class="min-h-screen bg-gradient-to-tr from-slate-950 via-indigo-950 to-slate-950 flex flex-col text-slate-100 relative antialiased">

    <header class="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md select-none">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <span class="text-white text-xl font-bold">⚡</span>
          </div>
          <div>
            <span class="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">CloudSphere</span>
            <span class="ml-1 text-[10px] font-bold text-indigo-400 px-1.5 py-0.5 rounded bg-indigo-950/80 border border-indigo-800/40">共享提取大厅</span>
          </div>
        </div>

        <div class="flex items-center gap-2 relative">
          <div v-if="currentViewerName" class="relative">
            <button @click.stop="toggleDropdown"
                    class="px-3 py-1 bg-slate-900/80 text-slate-300 text-xs font-bold rounded-lg border border-slate-800 hover:border-slate-700 flex items-center gap-1.5 shadow-md cursor-pointer select-none">
              <span class="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              操作者: <span class="text-indigo-400 font-extrabold">{{ currentViewerName }}</span>
              <span class="text-[9px] opacity-60 transition-transform duration-200" :class="{'rotate-180': dropdownOpen}">▼</span>
            </button>

            <div v-if="dropdownOpen"
                 class="absolute right-0 mt-2 w-40 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-1.5 z-50 text-xs font-bold animate-fade-in text-left">
              <button @click="handleSwitchUser"
                      class="w-full text-left px-4 py-2.5 text-slate-300 hover:bg-indigo-500/10 hover:text-indigo-400 transition-colors flex items-center gap-2 cursor-pointer">
                🔄 切换用户
              </button>
              <div class="border-t border-slate-800/60 my-1"></div>
              <button @click="handleLogout"
                      class="w-full text-left px-4 py-2.5 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors flex items-center gap-2 cursor-pointer">
                🚪 安全退出
              </button>
            </div>
          </div>

          <span class="px-3 py-1 bg-indigo-500/10 text-indigo-400 text-xs font-semibold rounded-full border border-indigo-500/20">
            安全加密网关
          </span>
        </div>
      </div>
    </header>

    <main class="flex-1 flex flex-col items-center justify-center py-12 px-4">
      <div class="max-w-4xl w-full bg-slate-900/40 backdrop-blur-xl p-8 rounded-2xl border border-slate-800/80 shadow-2xl space-y-8">

        <div class="border-b border-slate-800/80 pb-6">
          <h1 class="text-2xl font-extrabold text-white tracking-wide">
            {{ fileInfo.fileName || '极光加密资产提取舱' }}
          </h1>
          <div class="flex flex-wrap gap-y-2 items-center text-xs text-slate-400 mt-2 space-x-4">
            <p>分享者 ID: <span class="font-semibold text-slate-200">{{ fileInfo.userId || '匿名租户' }}</span></p>
            <p class="hidden sm:block text-slate-700">|</p>
            <p>失效时间: <span class="text-indigo-400 font-medium">{{ fileInfo.expireTime }}</span></p>
          </div>
        </div>

        <div v-if="hasVerified" class="space-y-4 animate-fade-in">
          <h3 class="text-sm font-semibold text-indigo-400 uppercase tracking-wider">📋 校验通过 · 允许提取的物理资产</h3>
          <div class="border border-slate-800 bg-slate-950/40 rounded-xl p-5 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div class="flex items-center space-x-4 w-full sm:w-auto">
              <div class="h-12 w-12 bg-indigo-950/50 border border-indigo-500/30 rounded-xl flex items-center justify-center text-2xl shadow-inner">
                📄
              </div>
              <div>
                <p class="font-bold text-slate-100 text-lg tracking-wide">{{ fileInfo.fileName }}</p>
                <p class="text-xs text-slate-500 mt-0.5">文件大小: <span class="text-slate-300 font-medium">{{ formatSize(fileInfo.fileSize) }}</span></p>
              </div>
            </div>

            <div class="flex space-x-3 w-full sm:w-auto">
              <button @click="triggerSaveModal"
                      class="flex-1 sm:flex-none border border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/20 text-indigo-300 hover:text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5">
                📂 保存到我的云盘
              </button>
              <button @click="downloadFile"
                      class="flex-1 sm:flex-none bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-500/20">
                立即极速下载
              </button>
            </div>
          </div>
        </div>

        <div v-else-if="loading" class="text-center py-16 text-slate-500 text-sm font-medium tracking-widest animate-pulse">
          🚀 正在穿透安全隔离层，拉取分享状态...
        </div>

        <div v-else class="text-center py-16 text-slate-500 border border-dashed border-slate-800 rounded-xl bg-slate-950/20">
          🔒 该资源受极光协议保护，需在中央密码箱中校验提取口令。
        </div>
      </div>
    </main>

    <ShareModal
        :visible="isModalVisible"
        :shortLink="shortLink"
        @verify-success="handleVerifySuccess"
    />

    <div v-if="customModal.visible"
         class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md transition-all">
      <div class="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 mx-4 transform scale-100 transition-all text-slate-100">

        <div class="text-center">
          <div class="mx-auto flex items-center justify-center h-14 w-14 rounded-full mb-4 text-3xl"
               :class="modalIconClass">
            {{ customModal.icon }}
          </div>
          <h3 class="text-xl font-extrabold text-white tracking-wide">{{ customModal.title }}</h3>
          <p class="text-sm text-slate-400 mt-3 whitespace-pre-line leading-relaxed">{{ customModal.message }}</p>
        </div>

        <div class="mt-6 flex space-x-3">
          <button @click="closeCustomModal"
                  class="flex-1 border border-slate-800 bg-slate-950/40 hover:bg-slate-800 text-slate-400 hover:text-white font-bold p-3 rounded-xl text-xs transition-colors tracking-widest">
            {{ customModal.status === 'confirm' ? '取 消 撤 回' : '确 定 闭 环' }}
          </button>

          <button v-if="customModal.status === 'confirm'"
                  :disabled="customModal.submitting"
                  @click="executeSaveToMyDrive"
                  class="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-bold p-3 rounded-xl text-xs transition-colors disabled:opacity-50 shadow-md shadow-indigo-500/20">
            {{ customModal.submitting ? '穿透挂载中...' : '确 认 转 存' }}
          </button>

          <button v-if="customModal.showLoginBtn"
                  @click="goToLogin"
                  class="flex-1 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-400 hover:to-rose-500 text-white font-bold p-3 rounded-xl text-xs transition-colors shadow-md shadow-rose-500/20">
            立 即 登 录
          </button>
        </div>

      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, computed, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import ShareModal from '@/components/ShareModal.vue'

const route = useRoute()
const router = useRouter()
const shortLink = route.params.shortLink

const loading = ref(true)
const isModalVisible = ref(false)
const hasVerified = ref(false)
const fileInfo = ref({ expireTime: '计算中...', userId: '', fileSize: 0, fileName: '' })
const currentViewerName = ref('')

// 🎯 下拉菜单显隐大闸
const dropdownOpen = ref(false)
const toggleDropdown = () => { dropdownOpen.value = !dropdownOpen.value }
const closeDropdown = () => { dropdownOpen.value = false }

// 🚪 安全退出（在分享页执行）
const handleLogout = () => {
  closeDropdown()
  localStorage.removeItem('cs_token')
  localStorage.removeItem('cs_username')
  currentViewerName.value = ''
  // 刷新当前页面，使其无感退回到匿名状态
  window.location.reload()
}

// 🔄 切换用户（在分享页一键触发）
const handleSwitchUser = () => {
  closeDropdown()
  // 🧠 锁死当前的分享链全路径，这样新用户登录成功后还会被带回来！
  sessionStorage.setItem('cs_redirect_back', route.fullPath)
  localStorage.removeItem('cs_token')
  localStorage.removeItem('cs_username')
  router.push('/login')
}

// 中央弹窗集电器
const customModal = ref({
  visible: false,
  status: 'confirm',
  title: '',
  message: '',
  icon: '📂',
  submitting: false,
  showLoginBtn: false
})

const modalIconClass = computed(() => {
  if (customModal.value.status === 'success') return 'bg-emerald-950/80 border border-emerald-500/30 text-emerald-400'
  if (customModal.value.status === 'warning') return 'bg-rose-950/80 border border-rose-500/30 text-rose-400'
  return 'bg-indigo-950/80 border border-indigo-500/30 text-indigo-400'
})

const getUsernameFromToken = (token) => {
  if (!token) return ''
  try {
    const pureToken = token.replace('Bearer ', '').trim()
    const parts = pureToken.split('.')
    if (parts.length !== 3) return ''
    const base64Url = parts[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''))
    const payload = JSON.parse(jsonPayload)
    return payload.username || payload.sub || payload.user_file || payload.user_name || payload.name || ''
  } catch (e) {
    return ''
  }
}

const openCustomModal = (status, title, message, icon) => {
  customModal.value.status = status
  customModal.value.title = title
  customModal.value.message = message
  customModal.value.icon = icon
  customModal.value.showLoginBtn = false
  customModal.value.visible = true
}

const closeCustomModal = () => {
  customModal.value.visible = false
  customModal.value.submitting = false
}

const goToLogin = () => {
  sessionStorage.setItem('cs_redirect_back', route.fullPath)
  router.push('/login')
}

const formatSize = (bytes) => {
  if (bytes === undefined || bytes === null || bytes === '') return '未知'
  if (isNaN(bytes)) return bytes
  const n = parseInt(bytes, 10)
  if (n === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(n) / Math.log(k))
  return parseFloat((n / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const triggerSaveModal = () => {
  const token = localStorage.getItem('cs_token') || sessionStorage.getItem('cs_token')
  if (!token) {
    openCustomModal('warning', '身份鉴权阻断', '您当前处于外网匿名提取状态。\n请先登录您的极光网盘主站账户后再执行无损转存。', '⚠️')
    customModal.value.showLoginBtn = true
    return
  }
  openCustomModal('confirm', '确认转存物理资产吗？', `准备将资产「${fileInfo.value.fileName}」\n秒级同步挂载至租户 [ ${currentViewerName.value} ] 的个人云盘根目录下。`, '📂')
}

const executeSaveToMyDrive = async () => {
  customModal.value.submitting = true
  const token = localStorage.getItem('cs_token') || sessionStorage.getItem('cs_token')
  const code = sessionStorage.getItem(`verified_${shortLink}`) || ''

  try {
    const res = await axios.post('/file/share/save', {
      shortLink: shortLink,
      extractionCode: code,
      targetParentId: 0
    }, {
      headers: { 'Authorization': `Bearer ${token}` }
    })

    if (res.data && res.data.code === 200) {
      openCustomModal('success', '秒级转存通关', `虚拟物权映射挂载完毕！\n资产已成功推入 [ ${currentViewerName.value} ] 的存储大厅。`, '✅')
    } else {
      openCustomModal('warning', '挂载受限', res.data.message || '网关拒绝了本次转存申请', '❌')
    }
  } catch (error) {
    openCustomModal('warning', '网关暴雷', '物理通道遭遇网络抖动断开', '❌')
  }
}

const handleVerifySuccess = (backedFileInfo) => {
  isModalVisible.value = false
  hasVerified.value = true
  if (backedFileInfo) {
    fileInfo.value = {
      fileName: backedFileInfo.fileName || backedFileInfo.file_name || '未命名资产.zip',
      userId: backedFileInfo.userId || backedFileInfo.user_id || '极光租户',
      expireTime: backedFileInfo.expireTime || backedFileInfo.expire_time || '永久有效',
      fileSize: backedFileInfo.fileSize !== undefined ? backedFileInfo.fileSize : (backedFileInfo.file_size || 0)
    }
  }
}

onMounted(async () => {
  const savedUsername = localStorage.getItem('cs_username') || sessionStorage.getItem('cs_username')
  const token = localStorage.getItem('cs_token') || sessionStorage.getItem('cs_token')

  if (token) {
    currentViewerName.value = savedUsername || getUsernameFromToken(token) || '已认证租户'
  }

  // 💡 监听全局点击事件，实现点击空白处自动收起面板
  window.addEventListener('click', closeDropdown)

  try {
    const res = await axios.get(`/file/share/info/${shortLink}`)
    if (res.data && res.data.code === 200) {
      const sharePayload = res.data.data
      fileInfo.value = {
        fileName: sharePayload.fileName || '共享资产',
        userId: sharePayload.userId || '极光租户',
        expireTime: sharePayload.expireTime || '永久有效',
        fileSize: sharePayload.fileSize !== undefined ? sharePayload.fileSize : 0
      }
      if (sharePayload && sharePayload.needCode) {
        isModalVisible.value = true
      } else {
        hasVerified.value = true
      }
    } else {
      isModalVisible.value = true
    }
  } catch (error) {
    isModalVisible.value = true
  } finally {
    loading.value = false
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('click', closeDropdown)
})
</script>