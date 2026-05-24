import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '../views/Dashboard.vue'
import ShareView from '../views/ShareView.vue' // 🎯 引入新拆分出的匿名提取视图

const routes = [
    {
        path: '/',
        name: 'Dashboard',
        component: Dashboard,
        meta: { requiresAuth: true } // 需要登录鉴权的主舱大厅
    },
    {
        path: '/s/:shortLink',
        name: 'ShareView',
        component: ShareView,
        meta: { requiresAuth: false } // 🟢 刚性放行：匿名过桥公开路由
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

// 路由守卫拦截大闸
router.beforeEach((to, from, next) => {
    const token = localStorage.getItem('token')
    if (to.meta.requiresAuth && !token) {
        next('/login') // 无凭证强制断流至登录
    } else {
        next() // 公共路由直接放行
    }
})

export default router