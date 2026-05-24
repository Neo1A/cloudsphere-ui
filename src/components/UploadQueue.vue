<template>
  <div class="w-full lg:w-80 shrink-0 flex flex-col gap-6">
    <div class="rounded-2xl border border-slate-800 bg-slate-900/20 backdrop-blur-box p-6 shadow-2xl flex flex-col">
      <div class="flex items-center justify-between pb-4 border-b border-slate-800/60 mb-4">
        <h3 class="text-sm font-black flex items-center gap-2"><ArrowLeftRight class="text-indigo-400 h-4 w-4" />写流控队列</h3>
      </div>

      <div @click="fileInputRef.click()" class="group mb-4 p-5 rounded-xl border border-dashed border-slate-800 hover:border-indigo-500/50 text-center cursor-pointer flex flex-col items-center justify-center gap-1">
        <UploadCloud class="h-6 w-6 text-slate-500 group-hover:text-indigo-400" />
        <span class="text-[10px] font-bold text-slate-400">点击上传文件资源资产</span>
        <input type="file" multiple ref="fileInputRef" @change="handleFileSelect" class="hidden" />
      </div>

      <div v-if="queue.length === 0" class="py-12 text-center text-xs text-slate-600 flex flex-col items-center justify-center">
        <Activity class="h-7 w-7 mb-2 animate-pulse" />空载队列
      </div>
      <div v-else class="space-y-4 max-h-[350px] overflow-y-auto">
        <div v-for="item in queue" :key="item.id" class="p-3 rounded-xl bg-slate-950/60 border border-slate-800 relative overflow-hidden">
          <div class="absolute top-0 bottom-0 left-0 bg-indigo-500/5" :style="{ width: item.progress + '%' }"></div>
          <div class="flex items-start justify-between gap-2 relative z-10 text-xs">
            <h5 class="font-bold truncate max-w-[140px]">{{ item.fileName }}</h5>
            <span class="text-[9px] font-bold bg-indigo-950 px-1 py-0.5 rounded text-indigo-400">{{ item.statusText }}</span>
          </div>
          <div class="flex items-center justify-between text-[10px] text-slate-400 mt-2 relative z-10">
            <span>{{ item.speed }}</span><span>{{ item.progress }}%</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import axios from 'axios'
import SparkMD5 from 'spark-md5'
import { ArrowLeftRight, UploadCloud, Activity } from 'lucide-vue-next'

const props = defineProps({ apiBase: String, token: String, currentFolderId: Number })
const emit = defineEmits(['onUploadFinished'])

const uploadHeaders = computed(() => ({ 'Authorization': `Bearer ${props.token}` }))
const queue = ref([])
const fileInputRef = ref(null)
const CHUNK_SIZE = 512000 // 500KB 精细刚性分片

const computeHash = (file) => {
  return new Promise((resolve) => {
    const chunks = Math.ceil(file.size / CHUNK_SIZE), spark = new SparkMD5.ArrayBuffer(), reader = new FileReader()
    let current = 0
    reader.onload = (e) => {
      spark.append(e.target.result); current++
      if (current < chunks) loadNext()
      else resolve(spark.end())
    }
    const loadNext = () => {
      const start = current * CHUNK_SIZE, end = start + CHUNK_SIZE >= file.size ? file.size : start + CHUNK_SIZE
      reader.readAsArrayBuffer(file.slice(start, end))
    }
    loadNext()
  })
}

const handleFileSelect = async (e) => {
  const files = Array.from(e.target.files)
  for (const file of files) {
    const id = Date.now() + Math.random().toString(36).substring(2,5)
    const item = ref({ id, fileName: file.name, size: file.size, progress: 0, speed: '提取指纹中...', statusText: '计算哈希' })
    queue.value.unshift(item.value)

    const md5 = await computeHash(file)
    item.value.statusText = '初始化安全握手'

    if (file.size < 5 * 1024 * 1024) {
      const form = new FormData(); form.append('file', file); form.append('sha256', md5); form.append('parentId', props.currentFolderId); form.append('fileName', file.name)
      await axios.post(`${props.apiBase}/file/upload`, form, { headers: { ...uploadHeaders.value, 'Content-Type': 'multipart/form-data' } })
      item.value.progress = 100; item.value.statusText = '落盘成功'; item.value.speed = '传输已闭环'
      emit('onUploadFinished')
    } else {
      const chunks = Math.ceil(file.size / CHUNK_SIZE)
      const init = await axios.post(`${props.apiBase}/file/chunk/init`, { identifier: md5, fileName: file.name, totalChunks: chunks, totalSize: file.size }, { headers: uploadHeaders.value })
      const done = new Set(init.data.data || [])

      if (done.size === chunks) {
        item.value.progress = 100; item.value.statusText = '秒传成功'; item.value.speed = '⚡ 秒传大闸激活'
        emit('onUploadFinished'); return
      }

      item.value.statusText = '物理写流'
      let uploaded = done.size
      for (let i = 1; i <= chunks; i++) {
        if (done.has(i)) continue
        const form = new FormData(); form.append('file', file.slice((i-1)*CHUNK_SIZE, Math.min(file.size, i*CHUNK_SIZE))); form.append('identifier', md5); form.append('chunkNumber', i)
        await axios.post(`${props.apiBase}/file/chunk/upload`, form, { headers: { ...uploadHeaders.value, 'Content-Type': 'multipart/form-data' } })
        uploaded++
        item.value.progress = Math.round(uploaded * 100 / chunks)
        item.value.speed = `文件上传中 ${i}/${chunks}`
      }

      item.value.statusText = '追加大合并'
      const merge = await axios.post(`${props.apiBase}/file/chunk/merge`, { identifier: md5, fileName: file.name, parentId: props.currentFolderId }, { headers: uploadHeaders.value })
      if (merge.data.code === 200) {
        item.value.progress = 100; item.value.statusText = '落盘成功'; item.value.speed = '资源上传完成'
        emit('onUploadFinished')
      }
    }
  }
  e.target.value = ''
}
</script>