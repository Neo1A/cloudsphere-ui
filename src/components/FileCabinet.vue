<template>
  <div
      ref="cabinetContainerRef"
      @mousedown="handleContainerMouseDown"
      class="flex-1 rounded-2xl border border-slate-800 bg-slate-900/20 backdrop-blur-box p-6 flex flex-col shadow-2xl relative select-none overflow-y-auto"
  >
    <BreadcrumbNav
        :breadcrumbs="breadcrumbs"
        @onBreadcrumbClick="handleBreadcrumbClick"
        @onTriggerCreateFolder="isCreateFolderOpen = true"
    />

    <div ref="dragAreaRef" class="flex-1 py-4 min-h-[400px] relative">
      <div v-if="loading" class="h-[400px] flex flex-col items-center justify-center gap-3">
        <div class="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent"></div>
        <span class="text-xs text-slate-500 font-semibold">正在提取资产列表...</span>
      </div>
      <div v-else-if="fileList.length === 0" class="h-[400px] flex flex-col items-center justify-center text-center p-6 border border-dashed border-slate-800/80 rounded-xl bg-slate-900/10">
        <CloudOff class="h-8 w-8 text-slate-600 mb-4" />
        <h3 class="text-sm font-bold text-slate-300">当前目录没有存储资产</h3>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" ref="gridRef">
        <div
            v-for="file in fileList" :key="file.id" :data-file-id="file.id"
            @click.stop="toggleSelectFile(file, $event)"
            @dblclick="file.folder ? handleFolderClick(file) : handlePreview(file)"
            @contextmenu.prevent="openContextMenu($event, file)"
            :class="['group p-4 rounded-xl border relative overflow-hidden transition-all duration-300 flex items-start gap-4 cursor-pointer', selectedFileIds.has(file.id) ? 'border-indigo-500 bg-indigo-500/10 shadow-lg' : 'border-slate-800 bg-slate-900/10 hover:bg-slate-900/40']"
        >
          <div :class="['absolute top-0 left-0 bottom-0 w-1', file.folder ? 'bg-indigo-500 opacity-60' : 'bg-purple-500 opacity-20']"></div>
          <div :class="['p-2.5 rounded-xl shrink-0', getFileIconInfo(file).bgClass, getFileIconInfo(file).colorClass]">
            <component :is="getFileIconInfo(file).icon" class="h-5 w-5" />
          </div>
          <div class="flex-1 min-w-0">
            <h4 class="text-sm font-bold text-slate-200 truncate group-hover:text-indigo-300 transition-colors">{{ file.name }}</h4>
            <p class="text-[10px] text-slate-500 mt-1">{{ file.folder ? '虚拟文件夹' : formatSize(file.size) }} • {{ file.updateTime.split(' ')[0] }}</p>
          </div>
        </div>
      </div>

      <div v-if="dragBox.active" :style="{ left: dragBox.left + 'px', top: dragBox.top + 'px', width: dragBox.width + 'px', height: dragBox.height + 'px' }" class="absolute border border-indigo-500/60 bg-indigo-500/10 pointer-events-none rounded rounded-sm z-40"></div>
    </div>

    <ContextMenu
        :show="menuState.show" :x="menuState.x" :y="menuState.y" :file="menuState.file" :selectedSize="selectedFileIds.size"
        @onPreview="handlePreview" @onEnterFolder="handleFolderClick" @onOpenShare="openShareLinkGate"
        @onDownloadPhysical="triggerPhysicalDownload" @onDownloadFolder="triggerFolderDownload" @onDeleteSelected="handleDeleteSelected"
    />

    <ShareModal
        :isOpen="isShareModalOpen" :file="sharingFile" :apiBase="apiBase" :headers="cabinetHeaders"
        @onClose="isShareModalOpen = false" @onToast="triggerRelayToast"
    />

    <div v-if="isCreateFolderOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div class="max-w-md w-full rounded-2xl border border-slate-800 bg-slate-900/95 p-6 shadow-2xl">
        <h3 class="text-sm font-bold mb-4">创建子目录</h3>
        <input type="text" required v-model="newFolderName" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm outline-none text-slate-200 focus:border-indigo-500" placeholder="请输入文件夹名称" />
        <div class="flex gap-3 pt-4">
          <button @click="handleCreateFolder" class="flex-1 py-2 rounded-xl bg-indigo-600 font-bold text-xs text-white">确认创建</button>
          <button @click="isCreateFolderOpen = false" class="px-4 py-2 rounded-xl border border-slate-700 text-xs text-slate-400">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch, reactive } from 'vue'
import axios from 'axios'
import { CloudOff, Folder, FileVideo, FileAudio, FileImage, FileText, FileSpreadsheet, FileCode, FileArchive, ShieldAlert, File } from 'lucide-vue-next'

// ⚡ 刚性引入拆分出的原子组件
import BreadcrumbNav from './cabinet/BreadcrumbNav.vue'
import ContextMenu from './cabinet/ContextMenu.vue'
import ShareModal from './cabinet/ShareModal.vue'

const props = defineProps({ apiBase: { type: String, required: true }, token: { type: String, required: true } })
const emit = defineEmits(['onTriggerPreview', 'onFolderChanged'])

const cabinetHeaders = computed(() => ({ 'Authorization': `Bearer ${props.token}` }))
const currentFolderId = ref(0)
const breadcrumbs = ref([{ id: 0, name: '根目录' }])
const fileList = ref([])
const loading = ref(false)
const isCreateFolderOpen = ref(false)
const newFolderName = ref('')

const selectedFileIds = ref(new Set())
const cabinetContainerRef = ref(null)
const dragAreaRef = ref(null)
const gridRef = ref(null)

const dragBox = reactive({ active: false, startX: 0, startY: 0, left: 0, top: 0, width: 0, height: 0 })
const menuState = reactive({ show: false, x: 0, y: 0, file: {} })

// 分享模块内部联动状态
const isShareModalOpen = ref(false)
const sharingFile = ref(null)

const fetchList = async (folderId) => {
  loading.value = true; selectedFileIds.value.clear()
  try {
    const res = await axios.get(`${props.apiBase}/file/list?parentId=${folderId}`, { headers: cabinetHeaders.value })
    if (res.data.code === 200) fileList.value = res.data.data || []
  } catch { toast('拉取资产目录失败', 'error') } finally { loading.value = false }
}

// 🎯 高精度跟手框选几何逻辑保持不动
const handleContainerMouseDown = (e) => {
  if (e.button !== 0 || isCreateFolderOpen.value || isShareModalOpen.value || menuState.show) return
  if (e.target.closest('.grid > div')) return
  selectedFileIds.value.clear()
  const area = dragAreaRef.value; if (!area) return
  const areaRect = area.getBoundingClientRect()
  dragBox.active = true
  dragBox.startX = e.clientX - areaRect.left; dragBox.startY = e.clientY - areaRect.top
  dragBox.left = dragBox.startX; dragBox.top = dragBox.startY; dragBox.width = 0; dragBox.height = 0
  window.addEventListener('mousemove', handleContainerMouseMove)
  window.addEventListener('mouseup', handleContainerMouseUp)
}

const handleContainerMouseMove = (e) => {
  if (!dragBox.active) return
  const area = dragAreaRef.value; if (!area) return
  const areaRect = area.getBoundingClientRect()
  const currentX = e.clientX - areaRect.left; const currentY = e.clientY - areaRect.top
  dragBox.left = Math.min(dragBox.startX, currentX); dragBox.top = Math.min(dragBox.startY, currentY)
  dragBox.width = Math.abs(currentX - dragBox.startX); dragBox.height = Math.abs(currentY - dragBox.startY)

  if (gridRef.value) {
    const boxLeft = dragBox.left + areaRect.left; const boxTop = dragBox.top + areaRect.top
    const boxRight = boxLeft + dragBox.width; const boxBottom = boxTop + dragBox.height
    for (let el of gridRef.value.children) {
      const fileId = LongRefCast(el.getAttribute('data-file-id')); if (!fileId) continue
      const elRect = el.getBoundingClientRect()
      const isIntersect = !(elRect.right < boxLeft || elRect.left > boxRight || elRect.bottom < boxTop || elRect.top > boxBottom)
      if (isIntersect) selectedFileIds.value.add(fileId); else selectedFileIds.value.delete(fileId)
    }
  }
}

const handleContainerMouseUp = () => {
  dragBox.active = false
  window.removeEventListener('mousemove', handleContainerMouseMove)
  window.removeEventListener('mouseup', handleContainerMouseUp)
}

const toggleSelectFile = (file, e) => {
  if (e.ctrlKey) {
    if (selectedFileIds.value.has(file.id)) selectedFileIds.value.delete(file.id); else selectedFileIds.value.add(file.id)
  } else {
    selectedFileIds.value.clear(); selectedFileIds.value.add(file.id)
  }
}

const openContextMenu = (e, file) => {
  if (!selectedFileIds.value.has(file.id)) { selectedFileIds.value.clear(); selectedFileIds.value.add(file.id) }
  menuState.show = true; menuState.x = e.clientX + 2; menuState.y = e.clientY + 2; menuState.file = file
}
const closeContextMenu = () => { menuState.show = false }

const openShareLinkGate = (file) => { sharingFile.value = file; isShareModalOpen.value = true; closeContextMenu() }
const triggerRelayToast = (payload) => { toast(payload.msg, payload.type) }

const triggerPhysicalDownload = () => {
  if (selectedFileIds.value.size === 0) return
  toast('已成功挂载流控读管道...', 'info'); closeContextMenu()
  selectedFileIds.value.forEach((id) => {
    const file = fileList.value.find(f => f.id === id); if (!file || file.folder) return
    axios({ url: `${props.apiBase}/file/download/${file.id}`, method: 'GET', headers: cabinetHeaders.value, responseType: 'blob' }).then((res) => {
      const url = window.URL.createObjectURL(new Blob([res.data])); const link = document.createElement('a')
      link.href = url; link.setAttribute('download', file.name); link.click(); link.remove(); window.URL.revokeObjectURL(url)
    })
  })
}

const handleDeleteSelected = async () => {
  closeContextMenu()
  if (selectedFileIds.value.size === 0) return
  if (!confirm(`确定要粉碎选中的 ${selectedFileIds.value.size} 个资产吗？`)) return
  try {
    const promises = Array.from(selectedFileIds.value).map(id => axios.post(`${props.apiBase}/file/deleteFile/${id}`, {}, { headers: cabinetHeaders.value }))
    await Promise.all(promises); toast('资产清理粉碎完毕', 'success'); fetchList(currentFolderId.value)
  } catch { toast('物理粉碎发生异常', 'error') }
}

const triggerFolderDownload = (file) => {
  toast('宿主机开始动态压缩打包...', 'info'); closeContextMenu()
  axios({ url: `${props.apiBase}/file/download/folder/${file.id}`, method: 'GET', headers: cabinetHeaders.value, responseType: 'blob' }).then((res) => {
    const url = window.URL.createObjectURL(new Blob([res.data])); const link = document.createElement('a')
    link.href = url; link.setAttribute('download', `${file.name}.zip`); link.click(); link.remove(); window.URL.revokeObjectURL(url)
  })
}

const handleFolderClick = (folder) => { currentFolderId.value = folder.id; breadcrumbs.value.push({ id: folder.id, name: folder.name }); emit('onFolderChanged', folder.id); closeContextMenu() }
const handleBreadcrumbClick = (crumb, index) => { currentFolderId.value = crumb.id; breadcrumbs.value = breadcrumbs.value.slice(0, index + 1); emit('onFolderChanged', crumb.id) }
const handlePreview = (file) => { emit('onTriggerPreview', { id: file.id, name: file.name, url: `${props.apiBase}/file/download/${file.id}` }); closeContextMenu() }

const handleCreateFolder = async () => {
  if (!newFolderName.value.trim()) return
  try {
    const res = await axios.post(`${props.apiBase}/file/createFolder`, { name: newFolderName.value, parentId: currentFolderId.value }, { headers: cabinetHeaders.value })
    if (res.data.code === 200) { toast(`目录 [${newFolderName.value}] 新增成功`, 'success'); newFolderName.value = ''; isCreateFolderOpen.value = false; fetchList(currentFolderId.value) }
  } catch { toast('新建文件夹失败', 'error') }
}

const getFileIconInfo = (file) => {
  if (file.folder) return { icon: Folder, colorClass: 'text-indigo-400', bgClass: 'bg-indigo-500/10' }
  const ext = file.name.split('.').pop().toLowerCase()
  if (['mp4', 'mkv', 'webm'].includes(ext)) return { icon: FileVideo, colorClass: 'text-rose-400', bgClass: 'bg-rose-500/10' }
  if (['mp3', 'wav'].includes(ext)) return { icon: FileAudio, colorClass: 'text-emerald-400', bgClass: 'bg-emerald-500/10' }
  if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) return { icon: FileImage, colorClass: 'text-blue-400', bgClass: 'bg-blue-500/10' }
  if (['zip', 'rar', '7z'].includes(ext)) return { icon: FileArchive, colorClass: 'text-amber-400', bgClass: 'bg-amber-500/10' }
  if (['exe', 'bat', 'sh'].includes(ext)) return { icon: ShieldAlert, colorClass: 'text-rose-500 animate-pulse', bgClass: 'bg-rose-500/10' }
  return { icon: File, colorClass: 'text-slate-400', bgClass: 'bg-slate-500/10' }
}

const LongRefCast = (val) => val ? parseInt(val, 10) : null
const formatSize = (bytes) => { if (bytes === 0) return '0 B'; const k = 1024; const sizes = ['B', 'KB', 'MB', 'GB', 'TB']; const i = Math.floor(Math.log(bytes) / Math.log(k)); return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i] }
const toast = (msg, type) => { window.dispatchEvent(new CustomEvent('toast', { detail: { msg, type } })) }

const refresh = () => { fetchList(currentFolderId.value) }; defineExpose({ refresh })
watch(currentFolderId, (newId) => { fetchList(newId) })
onMounted(() => { fetchList(currentFolderId.value); window.addEventListener('click', closeContextMenu) })
onUnmounted(() => { window.removeEventListener('click', closeContextMenu) })
</script>