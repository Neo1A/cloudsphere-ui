<template>
  <div class="flex-1 flex items-center justify-center p-4">
    <div
        class="max-w-md w-full rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-box p-8 shadow-2xl relative overflow-hidden">
      <div class="text-center mb-8">
        <h2 class="text-2xl font-black bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
          极光多租户加密空间</h2>
        <p class="text-xs text-slate-400 mt-2">安全沙盒防暴力破解防御机制</p>
      </div>

      <div class="flex border-b border-slate-800 mb-6">
        <button @click="authMode = 'login'; errorMsg = ''; successMsg = '';"
                class="flex-1 pb-3 text-sm font-bold border-b-2 transition-all"
                :class="authMode === 'login' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'">
          登 录
        </button>
        <button @click="authMode = 'register'; errorMsg = ''; successMsg = '';"
                class="flex-1 pb-3 text-sm font-bold border-b-2 transition-all"
                :class="authMode === 'register' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'">
          注 册
        </button>
      </div>

      <form @submit.prevent="handleAuth" class="space-y-4">
        <div v-if="errorMsg"
             class="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold">
          {{ errorMsg }}
        </div>
        <div v-if="successMsg"
             class="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
          {{ successMsg }}
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-400 mb-1.5">唯一租户标识</label>
          <input type="text" required v-model="username"
                 class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 outline-none focus:border-indigo-500"
                 placeholder="请输入用户名"/>
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-400 mb-1.5">核心混淆密码</label>
          <input type="password" required v-model="password"
                 class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 outline-none focus:border-indigo-500"
                 placeholder="请输入密码"/>
        </div>
        <button type="submit"
                class="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 font-bold text-sm shadow-xl text-white">
          {{ authMode === 'login' ? '开启极光之门' : '下发新租户许可' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

const router = useRouter()
const authMode = ref('login')
const username = ref('')
const password = ref('')
const errorMsg = ref('')
const successMsg = ref('')

const handleAuth = async () => {
  errorMsg.value = '';
  successMsg.value = '';
  try {
    const endpoint = authMode.value === 'login' ? '/user/login' : '/user/register'
    const res = await axios.post(endpoint, { username: username.value, password: password.value })

    if (res.data && res.data.code === 200) {
      if (authMode.value === 'login') {
        // 1. 锁死极光网盘安全物权凭证 Token
        localStorage.setItem('cs_token', res.data.data)

        // 2. 顺手将当前输入的用户名存入本地，配合右上角勋章双保险渲染（消灭未知租户）
        localStorage.setItem('cs_username', username.value)

        window.dispatchEvent(new CustomEvent('auth-success'))

        // ==================== 🎯【核心修复：原路召回大闸】====================
        // 3. 探针扫描：前往 sessionStorage 提取分享页此前派发的召回暗号
        const redirectBackUrl = sessionStorage.getItem('cs_redirect_back')

        if (redirectBackUrl) {
          // 🧼 刚性动作：打捞成功后立刻擦除缓存，防止后续逻辑跨域串流污染
          sessionStorage.removeItem('cs_redirect_back')

          // ✈️ 拦截盲飞：精准将用户定向回刚刚点击转存的那个加密分享大厅！
          router.push(redirectBackUrl)
        } else {
          // 🪐 常规放行：没有暗号，说明是主动登录，平稳推入网盘主控制台
          router.push('/')
        }
        // ===================================================================

      } else {
        successMsg.value = '账户数据空间就绪，已自动切回登录。'
        authMode.value = 'login'
        password.value = ''
      }
    } else {
      errorMsg.value = res.data.message || '网关拒绝了您的凭证请求'
    }
  } catch (err) {
    errorMsg.value = err.response?.data?.message || '宿主机网关拒绝连接'
  }
}
</script>