<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
    <div
        class="max-w-4xl w-full rounded-2xl border border-slate-800 bg-slate-900/90 backdrop-blur-box overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">

      <div class="p-4 border-b border-slate-800/80 flex items-center justify-between">
        <h3 class="text-sm font-black text-indigo-400 truncate pr-6 flex items-center gap-1.5">
          <component :is="headerIconInfo.icon" :class="['h-4.5 w-4.5', headerIconInfo.colorClass]"/>
          CloudSphere: {{ file.name }}
        </h3>
        <button @click="$emit('onCloseTheater')"
                class="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white">
          <X class="h-4 w-4"/>
        </button>
      </div>

      <div class="flex-1 bg-black p-2 flex items-center justify-center min-h-[400px]">
        <video v-if="resolvedType === 'video'" :src="authenticatedUrl" controls autoplay
               class="max-h-[60vh] w-full object-contain"></video>
        <audio v-else-if="resolvedType === 'audio'" :src="authenticatedUrl" controls autoplay class="w-full max-w-lg"/>
        <img v-else-if="resolvedType === 'image'" :src="authenticatedUrl"
             class="max-h-[60vh] object-contain rounded-lg shadow-2xl"/>

        <DocumentViewer v-else-if="resolvedType === 'office'" :file="file" :token="token"/>

        <div v-else-if="resolvedType === 'markdown'"
             class="w-full h-[65vh] overflow-y-auto px-8 py-6 bg-slate-950/60 rounded-xl text-left">
          <div v-if="loading" class="flex flex-col items-center justify-center h-full gap-2">
            <div class="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent"></div>
            <span class="text-xs text-slate-500">正在解析 Markdown...</span>
          </div>
          <div v-else class="max-w-3xl mx-auto select-text markdown-body-custom" v-html="markdownHtml"></div>
        </div>

        <div v-else-if="resolvedType === 'text'"
             class="w-full max-h-[65vh] flex flex-col bg-slate-950 rounded-xl overflow-hidden text-left border border-slate-800">
          <div class="flex items-center justify-between px-4 py-2 bg-slate-900/50 border-b border-slate-800">
            <span class="text-xs font-mono text-slate-400 flex items-center gap-1"><FileCode class="h-3.5 w-3.5"/> 源码浏览器</span>
            <button @click="copyTextToClipboard(textContent)"
                    class="text-[10px] font-bold text-slate-300 hover:text-white bg-slate-800 px-3 py-1.5 rounded-lg">复制
            </button>
          </div>
          <pre class="flex-1 overflow-auto p-4 font-mono text-xs text-slate-300">{{ textContent }}</pre>
        </div>

        <div v-else class="text-center p-8">
          <HelpCircle class="h-12 w-12 text-slate-700 mb-3"/>
          <p class="text-sm font-bold text-slate-300">该格式暂不支持在线预览</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import {ref, onMounted, computed, defineProps, defineEmits} from 'vue'
import axios from 'axios'
import {
  X,
  FileCode,
  FileVideo,
  FileAudio,
  FileImage,
  FileText,
  FileSpreadsheet,
  FileArchive,
  ShieldAlert,
  File,
  HelpCircle
} from 'lucide-vue-next'
import DocumentViewer from './DocumentViewer.vue'

const props = defineProps({
  file: {type: Object, required: true},
  token: {type: String, required: true}
})

const emit = defineEmits(['onCloseTheater'])

const loading = ref(false)
const textContent = ref('')
const markdownHtml = ref('')

const authenticatedUrl = computed(() => {
  if (!props.file.url) return ''
  return `${props.file.url}${props.file.url.includes('?') ? '&' : '?'}token=${props.token}`
})

const resolvedType = computed(() => {
  const ext = props.file.name.split('.').pop().toLowerCase()
  if (ext === 'md') return 'markdown'
  if (['mp4', 'mkv', 'mov'].includes(ext)) return 'video'
  if (['mp3', 'wav'].includes(ext)) return 'audio'
  if (['png', 'jpg', 'jpeg'].includes(ext)) return 'image'
  if (['doc', 'docx'].includes(ext)) return 'office'
  if (['txt', 'json', 'log'].includes(ext)) return 'text'
  return 'other'
})

const headerIconInfo = computed(() => {
  const ext = props.file.name.split('.').pop().toLowerCase()
  if (['mp4', 'mkv'].includes(ext)) return {icon: FileVideo, colorClass: 'text-rose-400'}
  if (['md'].includes(ext)) return {icon: FileCode, colorClass: 'text-indigo-400'}
  return {icon: File, colorClass: 'text-slate-400'}
})

const loadTextContent = async () => {
  loading.value = true
  try {
    const res = await axios.get(props.file.url, {
      headers: {'Authorization': `Bearer ${props.token}`}
    })
    textContent.value = typeof res.data === 'object' ? JSON.stringify(res.data) : res.data
    if (resolvedType.value === 'markdown' && window.marked) {
      markdownHtml.value = window.marked.parse(textContent.value)
    }
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  if (resolvedType.value === 'markdown' || resolvedType.value === 'text') loadTextContent()
})
</script>

<style scoped>
/* 保持原有的 markdown-body-custom 样式不变 */
</style>