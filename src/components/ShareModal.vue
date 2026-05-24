<template>
  <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 backdrop-blur-sm">
    <div class="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 mx-4">

      <div class="text-center">
        <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 text-blue-600 mb-4 text-xl">
          🔑
        </div>
        <h3 class="text-xl font-bold text-gray-900">请输入提取码</h3>
        <p class="text-sm text-gray-500 mt-1">请输入 4 位数字口令以穿透物权隔离层</p>
      </div>

      <div class="mt-6 space-y-4">
        <input
            v-model="extractionCode"
            type="text"
            maxlength="4"
            placeholder="四位提取码"
            class="w-full text-center tracking-widest text-lg font-bold border-2 border-gray-300 focus:border-blue-500 focus:outline-none p-3 rounded-lg bg-gray-50"
            @keyup.enter="submitCode"
        />

        <p v-if="errorMsg" class="text-sm text-red-600 text-center font-medium">
          ❌ {{ errorMsg }}
        </p>

        <button
            :disabled="submitting"
            @click="submitCode"
            class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium p-3 rounded-lg transition-colors disabled:bg-blue-400"
        >
          {{ submitting ? '正在校验口令...' : '确 认 提 取' }}
        </button>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import axios from 'axios'

// 🎯 满足 Vue 3 编译器宏标准，纯裸奔声明，消灭全部 compiler-sfc 警告
const props = defineProps({
  visible: Boolean,
  shortLink: String
})

const emit = defineEmits(['verify-success'])

const extractionCode = ref('')
const errorMsg = ref('')
const submitting = ref(false)

const submitCode = async () => {
  if (extractionCode.value.trim().length !== 4) {
    errorMsg.value = '请输入完整的 4 位提取码'
    return
  }

  errorMsg.value = ''
  submitting.value = true

  try {
    // 📡 呼叫后端校验接口
    const res = await axios.post('/shares/verify', {
      shortLink: props.shortLink,
      extractionCode: extractionCode.value
    })

    if (res.data.success) {
      // 验证成功，把后端返回的真实实体数据扔给父页面渲染
      emit('verify-success', res.data.fileInfo)
    } else {
      errorMsg.value = res.data.message || '口令验证失败，请重新核对'
    }
  } catch (error) {
    console.error('后端验证服务熔断:', error)
    errorMsg.value = '网关连接拒绝，请确保后端服务正常运行'

    // 💡 本地离线开发降级暗号：后端没开时，在前台输密码 "0000" 也能硬闯进去看效果
    if (extractionCode.value === '0000') {
      emit('verify-success', {
        fileName: '离线测试模拟文件.zip',
        userId: 999,
        expireTime: '永久有效',
        fileSize: '45.2 MB'
      })
    }
  } finally {
    submitting.value = false
  }
}
</script>