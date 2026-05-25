import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      // 🎯 核心整流：刚性将 @ 指向 src 目录的物理绝对路径
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    proxy: {
      // 🎯 极光流控大闸：合并所有文件/分享资产的操作流
      // 只要前端请求以 /file 开头（如 /file/list, /file/share/create），自动丝滑转发
      '/file': {
        target: 'http://localhost:8080',
        changeOrigin: true
      },
      // 租户身份与认证大闸
      '/user': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  }
})