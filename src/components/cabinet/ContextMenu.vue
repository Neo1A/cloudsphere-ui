<template>
  <Teleport to="body">
    <div
        v-if="show"
        :style="{ top: y + 'px', left: x + 'px' }"
        @click.stop
        class="fixed z-50 bg-slate-900/95 border border-slate-800 rounded-xl shadow-2xl py-1.5 min-w-[160px] text-xs font-semibold backdrop-blur-md text-slate-100 select-none"
    >
      <template v-if="!file.folder">
        <button v-if="selectedSize <= 1" @click="$emit('onPreview', file)" class="w-full text-left px-4 py-2.5 hover:bg-indigo-600 hover:text-white text-slate-300 flex items-center gap-2 transition-all">
          <Eye class="h-3.5 w-3.5 text-indigo-400" /> 在线预览
        </button>

        <button v-if="selectedSize <= 1" @click="$emit('onOpenShare', file)" class="w-full text-left px-4 py-2.5 hover:bg-indigo-600 hover:text-white text-slate-300 flex items-center gap-2 transition-all">
          <Share2 class="h-3.5 w-3.5 text-orange-400" /> 创建分享
        </button>

        <button @click="$emit('onDownloadPhysical')" class="w-full text-left px-4 py-2.5 hover:bg-indigo-600 hover:text-white text-slate-300 flex items-center gap-2 transition-all">
          <Download class="h-3.5 w-3.5 text-emerald-400" />
          {{ selectedSize > 1 ? `批量下载 (${selectedSize}项)` : '高效下载' }}
        </button>
      </template>

      <template v-else>
        <button @click="$emit('onEnterFolder', file)" class="w-full text-left px-4 py-2.5 hover:bg-indigo-600 hover:text-white text-slate-300 flex items-center gap-2 transition-all">
          <FolderOpen class="h-3.5 w-3.5 text-indigo-400" /> 进入目录
        </button>

        <button @click="$emit('onOpenShare', file)" class="w-full text-left px-4 py-2.5 hover:bg-indigo-600 hover:text-white text-slate-300 flex items-center gap-2 transition-all">
          <Share2 class="h-3.5 w-3.5 text-orange-400" /> 创建分享
        </button>

        <button @click="$emit('onDownloadFolder', file)" class="w-full text-left px-4 py-2.5 hover:bg-indigo-600 hover:text-white text-slate-300 flex items-center gap-2 transition-all">
          <Download class="h-3.5 w-3.5 text-amber-400" /> 打包下载目录
        </button>
      </template>

      <div class="h-px bg-slate-800/80 my-1"></div>

      <button @click="$emit('onDeleteSelected')" class="w-full text-left px-4 py-2.5 hover:bg-rose-600 hover:text-white text-rose-400 flex items-center gap-2 transition-all">
        <Trash2 class="h-3.5 w-3.5" />
        {{ selectedSize > 1 ? '批量彻底粉碎' : '彻底粉碎' }}
      </button>
    </div>
  </Teleport>
</template>

<script setup>
import { Eye, Share2, Download, FolderOpen, Trash2 } from 'lucide-vue-next'

defineProps({
  show: Boolean, x: Number, y: Number, file: Object, selectedSize: Number
})
defineEmits(['onPreview', 'onOpenShare', 'onDownloadPhysical', 'onEnterFolder', 'onDownloadFolder', 'onDeleteSelected'])
</script>