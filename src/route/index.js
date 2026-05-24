import { createRouter, createWebHistory } from 'vue-router'

const routes = [
    {
        path: '/',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue')
    },
    {
        path: '/login',
        name: 'LoginView',
        component: () => import('@/views/LoginView.vue')
    },
    {
        // 🎯 刚性对齐后端第 96 行的 "/s/" 规则，动态捕获 8 位短链特征码
        path: '/s/:shortLink',
        name: 'ShareView',
        component: () => import('@/views/ShareView.vue')
    }
]

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes
})

export default router