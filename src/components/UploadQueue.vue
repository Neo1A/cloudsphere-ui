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
            <div class="flex items-center gap-1.5">
              <span class="text-[9px] font-bold bg-indigo-950 px-1 py-0.5 rounded text-indigo-400">{{ item.statusText }}</span>
              <button
                  v-if="!['落盘成功', '秒传成功', '已取消', '落盘阻断'].includes(item.statusText)"
                  @click.stop="handleCancelUpload(item)"
                  class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/20 transition-all shadow-sm"
              >
                取消
              </button>
            </div>
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
import { ArrowLeftRight, UploadCloud, Activity } from 'lucide-vue-next'

const props = defineProps({ apiBase: String, token: String, currentFolderId: Number })
const emit = defineEmits(['onUploadFinished'])

const uploadHeaders = computed(() => ({ 'Authorization': `Bearer ${props.token}` }))
const queue = ref([])
const fileInputRef = ref(null)
const CHUNK_SIZE = 512000 // 500KB 精细刚性分片
const MAX_UPLOAD_CONCURRENCY = 4 // 🎯 核心配置：单个大文件并发上传通道数

// 🎯 核心重整 1：采用原生 Web Worker 运行多线程文件切片和秒传哈希比对
const computeHashWorker = (file, itemRef) => {
  return new Promise((resolve, reject) => {
    // 采用 Blob 内联封装 Worker 逻辑，免去配置外部静态文件的麻烦
    const workerCode = `
      importScripts('https://cdnjs.cloudflare.com/ajax/libs/spark-md5/3.0.2/spark-md5.min.js');
      self.onmessage = function(e) {
        const { file, chunkSize } = e.data;
        const chunks = Math.ceil(file.size / chunkSize);
        const spark = new SparkMD5.ArrayBuffer();
        let current = 0;

        function loadNext() {
          const start = current * chunkSize;
          const end = Math.min(file.size, start + chunkSize);
          const reader = new FileReader();
          reader.onload = function(evt) {
            spark.append(evt.target.result);
            current++;
            // 向主线程高频打卡，报告算力切片进度
            self.postMessage({ type: 'progress', progress: Math.round(current * 100 / chunks) });
            if (current < chunks) {
              loadNext();
            } else {
              self.postMessage({ type: 'result', hash: spark.end() });
            }
          };
          reader.readAsArrayBuffer(file.slice(start, end));
        }
        loadNext();
      };
    `;
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const worker = new Worker(URL.createObjectURL(blob));

    worker.onmessage = (e) => {
      if (e.data.type === 'progress') {
        itemRef.value.speed = `核心算力切片中: ${e.data.progress}%`;
      } else if (e.data.type === 'result') {
        worker.terminate();
        resolve(e.data.hash);
      }
    };

    worker.onerror = (err) => {
      worker.terminate();
      reject(err);
    };

    // 发送物理资产进入沙箱子线程
    worker.postMessage({ file, chunkSize: CHUNK_SIZE });
  });
};

const handleCancelUpload = (item) => {
  if (item.controller) {
    item.controller.abort() // 强行阻断网络 I/O 管道流
    item.statusText = '已取消'
    item.speed = '传输物理流断开'
    item.progress = 0
  }
}

const handleFileSelect = async (e) => {
  const files = Array.from(e.target.files)

  // 🎯 核心重整 2：实现文件级“多路复用”，使用 files.map 触发并发上传流，不再使用 await 阻塞后续文件初始化
  files.map(async (file) => {
    const id = Date.now() + Math.random().toString(36).substring(2,5)
    const item = ref({
      id,
      fileName: file.name,
      size: file.size,
      progress: 0,
      speed: '指纹提取排队中...',
      statusText: '计算哈希',
      controller: new AbortController()
    })
    queue.value.unshift(item.value)

    try {
      // 激活 Web Worker 独立线程提取 MD5
      const md5 = await computeHashWorker(file, item)
      if (item.value.statusText === '已取消') return

      item.value.statusText = '初始化安全握手'

      if (file.size < 5 * 1024 * 1024) {
        const form = new FormData(); form.append('file', file); form.append('sha256', md5); form.append('parentId', props.currentFolderId); form.append('fileName', file.name)

        await axios.post(`${props.apiBase}/file/upload`, form, {
          headers: { ...uploadHeaders.value, 'Content-Type': 'multipart/form-data' },
          signal: item.value.controller.signal
        })

        item.value.progress = 100; item.value.statusText = '落盘成功'; item.value.speed = '传输已闭环'
        emit('onUploadFinished')
      } else {
        const chunks = Math.ceil(file.size / CHUNK_SIZE)

        const init = await axios.post(`${props.apiBase}/file/chunk/init`, { identifier: md5, fileName: file.name, totalChunks: chunks, totalSize: file.size }, {
          headers: uploadHeaders.value,
          signal: item.value.controller.signal
        })
        const done = new Set(init.data.data || [])

        if (done.size === chunks) {
          item.value.progress = 100; item.value.statusText = '秒传成功'; item.value.speed = '⚡ 秒传大闸激活'
          emit('onUploadFinished'); return
        }

        item.value.statusText = '物理写流'

        // 🎯 核心重整 3：多线程/并发分片上传线程池大闸实现
        let uploaded = done.size
        const chunkQueue = []
        for (let i = 1; i <= chunks; i++) {
          if (!done.has(i)) chunkQueue.push(i) // 收集所有缺失的待上传分片序号
        }

        // 构建独立的分片并行写流消费者
        const launchUploadThread = async () => {
          while (chunkQueue.length > 0) {
            if (item.value.statusText === '已取消') break

            // 从高并发队列头部滑出一个分片任务
            const i = chunkQueue.shift()
            if (!i) continue

            const form = new FormData()
            form.append('file', file.slice((i - 1) * CHUNK_SIZE, Math.min(file.size, i * CHUNK_SIZE)))
            form.append('identifier', md5)
            form.append('chunkNumber', i)

            try {
              await axios.post(`${props.apiBase}/file/chunk/upload`, form, {
                headers: { ...uploadHeaders.value, 'Content-Type': 'multipart/form-data' },
                signal: item.value.controller.signal
              })

              uploaded++
              // 实时更新全局视图状态机
              item.value.progress = Math.round(uploaded * 100 / chunks)
              item.value.speed = `流控写盘中 ${uploaded}/${chunks}`
            } catch (err) {
              // 一旦某个分片遭遇重大阻断且非主动取消，放回队列重新尝试，或直接向上层抛出异常
              if (axios.isCancel(err)) throw err
              chunkQueue.unshift(i)
              throw err
            }
          }
        }

        // 🎯 刚性激活 4 路并行上传线程（可根据需要微调 MAX_UPLOAD_CONCURRENCY）
        const threads = Array(Math.min(MAX_UPLOAD_CONCURRENCY, chunkQueue.length))
            .fill(null)
            .map(launchUploadThread)

        // 挂载并发同步栅栏，等待所有并发切片写流彻底闭环
        await Promise.all(threads)

        if (item.value.statusText === '已取消') return

        item.value.statusText = '追加大合并'
        const merge = await axios.post(`${props.apiBase}/file/chunk/merge`, { identifier: md5, fileName: file.name, parentId: props.currentFolderId }, {
          headers: uploadHeaders.value,
          signal: item.value.controller.signal
        })

        if (merge.data.code === 200) {
          item.value.progress = 100; item.value.statusText = '落盘成功'; item.value.speed = '资源上传完成'
          emit('onUploadFinished')
        }
      }
    } catch (err) {
      if (axios.isCancel(err)) {
        item.value.statusText = '已取消'
        item.value.speed = '物理写流被掐断'
        item.value.progress = 0
      } else {
        item.value.statusText = '落盘阻断'
        item.value.speed = err.response?.data?.message || '网关物理断开'
      }
    }
  })
  e.target.value = ''
}
</script>