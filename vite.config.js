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
      '/file': {
        target: 'http://localhost:8080',
        changeOrigin: true
      },
      '/user': {
        target: 'http://localhost:8080',
        changeOrigin: true
      },
      // 🎯 核心修复：刚性补齐 /shares 路由的跨域反向代理规则
      // 否则前端向本地 3000 端口发送 /shares 请求时，会直接报 404 从而引发“网关异常”
      '/shares': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  }
})