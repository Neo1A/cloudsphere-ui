<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
    <div class="max-w-md w-full rounded-2xl border border-slate-800 bg-slate-900/95 p-6 shadow-2xl text-slate-100">
      <h3 class="text-sm font-black mb-4 flex items-center gap-1.5 text-indigo-400">
        <Share2 class="h-4.5 w-4.5" /> 创建安全分享项
      </h3>

      <!-- 阶段 1：参数配置 -->
      <div v-if="!shareResult" class="space-y-4">
        <div>
          <p class="text-[11px] text-slate-500 font-bold mb-1">被分享资源名称</p>
          <p class="text-xs font-semibold text-slate-200 truncate bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
            {{ file?.name }}
          </p>
        </div>

        <!-- 时效选择 -->
        <div>
          <label class="block text-[11px] text-slate-500 font-bold mb-1.5">定时失效时限 (过期时间)</label>
          <select
              v-model="form.expireType"
              class="w-full bg-slate-950 border border-slate-800/80 rounded-xl px-4 py-2.5 text-xs text-slate-200 outline-none focus:border-indigo-500 transition-colors"
          >
            <option value="DAY_1">1 天后失效 (24小时临界安全销毁)</option>
            <option value="DAY_7">7 天后失效 (周度临时分享)</option>
            <option value="CUSTOM">📅 自定义失效时长 (选择精确截止时间)</option>
            <option value="PERMANENT">永久有效 (无限制常驻共享)</option>
          </select>
        </div>

        <!-- 当选择 CUSTOM 时，动态展开时间选择器 -->
        <div v-if="form.expireType === 'CUSTOM'" class="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/20 space-y-1.5 animate-slideDown">
          <label class="block text-[10px] text-indigo-400 font-black flex items-center gap-1">
            设定自定义截止绝对时间
          </label>
          <input
              type="datetime-local"
              v-model="form.customExpireTime"
              :min="minDateTime"
              class="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500 appearance-none color-scheme-dark"
          />
          <p class="text-[9px] text-slate-500 italic">请点击日历图标或输入具体时分</p>
        </div>

        <div class="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-800/60">
          <div class="flex flex-col gap-0.5">
            <span class="text-xs font-bold text-slate-200">提取码安全保护</span>
            <span class="text-[10px] text-slate-500">开启后生成随机 4 位提取口令</span>
          </div>
          <input type="checkbox" v-model="form.needCode" class="h-4.5 w-4.5 rounded-lg border-slate-800 bg-slate-950 text-indigo-600 cursor-pointer" />
        </div>

        <div class="flex gap-3 pt-4 border-t border-slate-800/60">
          <button @click="handleCreate" :disabled="submitting" class="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold text-xs text-white disabled:opacity-50 flex items-center justify-center gap-1">
            <span v-if="submitting" class="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent"></span>
            立即生成分享链接
          </button>
          <button @click="$emit('onClose')" class="px-5 py-2.5 rounded-xl border border-slate-700 text-xs font-bold text-slate-400 hover:text-white">取消</button>
        </div>
      </div>

      <!-- 阶段 2：结果展示 -->
      <div v-else class="space-y-4">
        <div class="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">✓ 宿主机已成功创建时效性保护节点</div>
        <div class="space-y-3">
          <div>
            <label class="block text-[10px] text-slate-500 font-bold mb-1">匿名获取链接</label>
            <input type="text" readonly :value="fullShareUrl" class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-300 outline-none font-mono text-[11px]" />
          </div>
          <div v-if="shareResult.extractionCode">
            <label class="block text-[10px] text-slate-500 font-bold mb-1">4位保护提取口令</label>
            <input type="text" readonly :value="shareResult.extractionCode" class="w-24 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-center text-slate-200 font-mono font-bold text-sm tracking-widest" />
          </div>
        </div>
        <div class="text-[10px] text-slate-500 italic px-0.5">
          * 分享失效时间: {{ shareResult.expireTime || '永久有效' }}
        </div>
        <div class="flex gap-3 pt-4 border-t border-slate-800/60">
          <button @click="copyShare" class="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold text-xs text-white">一键复制分享卡片</button>
          <button @click="$emit('onClose')" class="px-5 py-2.5 rounded-xl border border-slate-700 text-xs font-bold text-slate-400 text-white">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import axios from 'axios'
import { Share2 } from 'lucide-vue-next'

const props = defineProps({ isOpen: Boolean, file: Object, apiBase: String, headers: Object })
const emit = defineEmits(['onClose', 'onToast'])

const submitting = ref(false)
const shareResult = ref(null)

const form = reactive({
  expireType: 'DAY_7',
  needCode: true,
  customExpireTime: ''
})

const minDateTime = computed(() => {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60000
  return new Date(now.getTime() - offset).toISOString().slice(0, 16)
})

const fullShareUrl = computed(() => shareResult.value ? `${window.location.origin}${shareResult.value.shareUrl}` : '')

const handleCreate = async () => {
  if (form.expireType === 'CUSTOM' && !form.customExpireTime) {
    emit('onToast', { msg: '请选择自定义失效截止时间', type: 'error' })
    return
  }

  // 格式化时间为后端兼容的 yyyy-MM-dd HH:mm:ss 格式
  let formattedTime = null;
  if (form.expireType === 'CUSTOM' && form.customExpireTime) {
    formattedTime = form.customExpireTime.replace('T', ' ') + ':00';
  }

  submitting.value = true
  try {
    const res = await axios.post(`${props.apiBase}/shares`, {
      userFileId: props.file.id,
      expireType: form.expireType,
      needCode: form.needCode,
      customExpireTime: formattedTime
    }, { headers: props.headers })

    if (res.data.code === 200) {
      shareResult.value = res.data.data
      emit('onToast', { msg: '极光资产分享链生成成功', type: 'success' })
    } else {
      emit('onToast', { msg: res.data.message || '生成失败', type: 'error' })
    }
  } catch (err) {
    console.error('【极光分享网关发生物理通信故障】:', err)
    const errDetail = err.response?.data?.message || err.message || '未知连接问题'
    emit('onToast', { msg: `分享网关异常: ${errDetail}`, type: 'error' })
  } finally {
    submitting.value = false
  }
}

const copyShare = () => {
  let text = `【极光网盘安全共享】\n文件: ${props.file.name}\n下载链: ${fullShareUrl.value}`
  if (shareResult.value.extractionCode) text += `\n4位提取密令: ${shareResult.value.extractionCode}`
  text += `\n有效期至: ${shareResult.value.expireTime || '永久有效'}`

  const textArea = document.createElement("textarea"); textArea.value = text; textArea.style.position = "fixed"
  document.body.appendChild(textArea); textArea.focus(); textArea.select()
  document.execCommand('copy'); document.body.removeChild(textArea)
  emit('onToast', { msg: '分享文案已成功捕获', type: 'success' })
}
</script>

<style scoped>
.color-scheme-dark {
  color-scheme: dark;
}
@keyframes slideDown {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-slideDown {
  animation: slideDown 0.25s ease-out forwards;
}
</style>