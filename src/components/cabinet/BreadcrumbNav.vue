<template>
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/60 select-none">
    <nav class="flex items-center gap-1.5 text-xs font-semibold text-slate-400 overflow-x-auto whitespace-nowrap py-1">
      <FolderOpen class="h-4 w-4 text-indigo-400 shrink-0" />
      <template v-for="(crumb, index) in breadcrumbs" :key="crumb.id">
        <span v-if="index > 0" class="text-slate-600">/</span>
        <button
            @click.stop="$emit('onBreadcrumbClick', crumb, index)"
            class="hover:text-white transition-all"
            :class="index === breadcrumbs.length - 1 ? 'text-indigo-400 font-bold' : ''"
        >
          {{ crumb.name }}
        </button>
      </template>
    </nav>

    <div class="flex items-center gap-3 shrink-0">
      <button
          @click.stop="$emit('onTriggerCreateFolder')"
          class="px-4 py-2.5 rounded-xl border border-slate-700/80 hover:bg-slate-800/50 text-slate-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5"
      >
        <FolderPlus class="h-4 w-4 text-indigo-400" />
        新建目录
      </button>
    </div>
  </div>
</template>

<script setup>
import { FolderOpen, FolderPlus } from 'lucide-vue-next'

defineProps({
  breadcrumbs: { type: Array, required: true }
})
defineEmits(['onBreadcrumbClick', 'onTriggerCreateFolder'])
</script>