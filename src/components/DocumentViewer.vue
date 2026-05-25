<template>
  <div class="flex-1 flex flex-col bg-slate-900 rounded-xl overflow-hidden border border-slate-800 h-[70vh]">
    <div v-if="rendering" class="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400 text-xs">
      <div class="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent"></div>
      <span>极光引擎正在解码物理二进制流...</span>
    </div>

    <div
        v-show="!rendering && fileType === 'docx'"
        ref="docxContainer"
        class="flex-1 overflow-y-auto p-4 bg-white text-black docx-view-window"
    ></div>

    <div
        v-show="!rendering && fileType === 'xlsx'"
        class="flex-1 overflow-auto p-4 bg-slate-950 text-slate-200 text-xs"
    >
      <div v-if="excelSheets.length > 1" class="flex gap-2 mb-3 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
            v-for="(sheetName, idx) in excelSheets"
            :key="idx"
            @click="activeSheetIdx = idx"
            :class="['px-3 py-1.5 rounded-lg font-bold transition-all', activeSheetIdx === idx ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-slate-200']"
        >
          {{ sheetName }}
        </button>
      </div>
      <div class="overflow-x-auto border border-slate-800 rounded-xl bg-slate-900/50">
        <table class="w-full text-left border-collapse">
          <thead>
          <tr class="bg-slate-800/80 text-slate-300">
            <th v-for="(cell, cIdx) in currentSheetData[0]" :key="cIdx" class="p-2.5 border border-slate-800 font-bold">
              {{ String.fromCharCode(65 + cIdx) }}
            </th>
          </tr>
          </thead>
          <tbody>
          <tr v-for="(row, rIdx) in currentSheetData" :key="rIdx" class="hover:bg-slate-800/30 transition-colors">
            <td v-for="(cell, cIdx) in row" :key="cIdx"
                class="p-2.5 border border-slate-800 text-slate-400 truncate max-w-[200px]" :title="cell">
              {{ cell }}
            </td>
          </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="!rendering && ['ppt', 'pptx', 'doc', 'xls'].includes(fileType)"
         class="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <div class="p-4 rounded-full bg-indigo-500/10 text-indigo-400 mb-4 animate-pulse">
        <FileBarChart2 class="h-10 w-10"/>
      </div>
      <h4 class="text-sm font-bold text-slate-200">[{{ file.name }}] 处于受控全量锁定状态</h4>
      <p class="text-xs text-slate-500 max-w-sm mt-2 leading-relaxed">
        由于大厂旧版私有化格式限制，本地局域网沙盒环境无法直接提取该矢量图层。建议点击下方按钮通过宿主机高效网络直接下载查看。
      </p>
      <button
          @click="downloadFallback"
          class="mt-5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all flex items-center gap-1.5 shadow-lg shadow-indigo-500/20"
      >
        <Download class="h-3.5 w-3.5"/>
        立即拉取原始文档
      </button>
    </div>
  </div>
</template>

<script setup>
import {ref, onMounted, computed} from 'vue'
import axios from 'axios'
import {renderAsync} from 'docx-preview'
import * as XLSX from 'xlsx'
import {FileBarChart2, Download} from 'lucide-vue-next'

const props = defineProps({
  file: Object, // { id, name, url }
  token: String
})

const rendering = ref(true)
const docxContainer = ref(null)

// Excel 独占解析状态
const excelSheets = ref([])
const excelWorkbookData = ref({})
const activeSheetIdx = ref(0)

const fileType = computed(() => {
  return props.file.name.split('.').pop().toLowerCase()
})

const currentSheetData = computed(() => {
  const currentSheetName = excelSheets.value[activeSheetIdx.value]
  return excelWorkbookData.value[currentSheetName] || []
})

const loadDocumentStream = async () => {
  rendering.value = true
  try {
    // 🎯 核心写流控对接：通过 Axios 强行以 arraybuffer 接收后端的物理文件流
    const response = await axios.get(props.file.url, {
      headers: {'Authorization': `Bearer ${props.token}`},
      responseType: 'arraybuffer'
    })

    const buffer = response.data

    if (fileType.value === 'docx') {
      // 🚀 激活纯前端 Word 解码
      await renderAsync(buffer, docxContainer.value, null, {
        className: "docx-document",
        inWrapper: false
      })
    } else if (fileType.value === 'xlsx') {
      // 🚀 激活纯前端 Excel 解码
      const workbook = XLSX.read(buffer, {type: 'array'})
      excelSheets.value = workbook.SheetNames

      workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName]
        // 转化为二维数组，方便 Tailwind CSS 高保真表格输出
        excelWorkbookData.value[sheetName] = XLSX.utils.sheet_to_json(worksheet, {header: 1})
      })
    }
  } catch (err) {
    window.dispatchEvent(new CustomEvent('toast', {detail: {msg: 'Office 组件读取或解码流发生破裂', type: 'error'}}))
  } finally {
    rendering.value = false
  }
}

const downloadFallback = () => {
  window.dispatchEvent(new CustomEvent('fallback-download', {detail: props.file}))
}

onMounted(() => {
  loadDocumentStream()
})
</script>

<style>
/* Word 预览白板样式修正，防止暗黑主题文字冲突 */
.docx-view-window .docx-document {
  background: white !important;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3) !important;
  margin: 0 auto !important;
  padding: 2rem !important;
  max-width: 800px !important;
  min-height: 100% !important;
}

.docx-view-window p {
  color: #1e293b !important;
}
</style>