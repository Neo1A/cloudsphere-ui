import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './route/index.js' // 🎯 核心整流：刚性注入路由管道

const app = createApp(App)
app.use(router) // 🟢 激活全局路由守卫与视图锚点
app.mount('#app')