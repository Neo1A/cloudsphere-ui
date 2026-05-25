<template>
  <div v-if="visible"
       class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 backdrop-blur-sm">
    <div class="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 mx-4">

      <div class="text-center">
        <div
            class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 text-blue-600 mb-4 text-xl">
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
            class="w-full text-center tracking-widest text-lg font-bold border-2 border-gray-300 focus:border-blue-500 focus:outline-none p-3 rounded-lg bg-gray-50 text-black"
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

// 🎯 满足 Vue 3 编译器宏标准，消灭全部 compiler-sfc 警告
const props = defineProps({
  visible: Boolean,
  shortLink: String
})

const emit = defineEmits(['verify-success'])

const extractionCode = ref('')
const errorMsg = ref('')
const submitting = ref(false)

const submitCode = async () => {
  const codeValue = extractionCode.value.trim()

  if (codeValue.length !== 4) {
    errorMsg.value = '请输入完整的 4 位提取码'
    return
  }

  errorMsg.value = ''
  submitting.value = true

  try {
    // 📡 1. 刚性对齐后端最正规的 /file/share/verify 统一网关大闸
    const res = await axios.post('/file/share/verify', {
      shortLink: props.shortLink,
      extractionCode: codeValue
    })

    // 🎯 2. 精准适配后端的 ApiResponse 规范，以 code === 200 作为安全通关判定
    if (res.data && res.data.code === 200) {

      // 💾 【极其重要】：在此处将验证通过的提取口令无感写入 sessionStorage 缓存！
      // 这样外层落脚页 ShareView.vue 在点击下载时，才能顺利捞出该参数追加到 URL 尾部，彻底消灭 400 拦截！
      sessionStorage.setItem(`verified_${props.shortLink}`, codeValue)

      // 3. 从 ApiResponse 的 data 核心域中平稳提出真实的文件资产元数据包，扔给父组件渲染
      emit('verify-success', res.data.data)
    } else {
      errorMsg.value = res.data?.message || '口令验证失败，请重新核对'
    }
  } catch (error) {
    console.error('后端验证服务熔断:', error)

    // 💡 本地离线开发降级暗号维持不变：后端没开时，输密码 "0000" 可直接模拟硬闯成功
    if (codeValue === '0000') {
      sessionStorage.setItem(`verified_${props.shortLink}`, '0000')
      emit('verify-success', {
        fileName: '极光高防沙盒模拟资产.zip',
        userId: 999,
        expireTime: '永久有效',
        fileSize: 47395635 // 以真实字节表示
      })
      return
    }

    errorMsg.value = error.response?.data?.message || '网关连接拒绝，请确保后端服务正常运行'
  } finally {
    submitting.value = false
  }
}
</script>