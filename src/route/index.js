import {createRouter, createWebHistory} from 'vue-router'

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

// 🎯 核心整流：挂载极光网盘全局身份路由守卫
router.beforeEach((to, from, next) => {
    // 从本地存储获取租户身份凭证
    const token = localStorage.getItem('cs_token')

    // 定义白名单页面：登录页与分享查看页不需要强制校验身份
    const isWhiteList = to.path === '/login' || to.path.startsWith('/s/')

    if (isWhiteList) {
        // 如果去的是白名单页面，直接放行
        next()
    } else {
        // 如果去的是受保护页面（如系统主页/控制台），必须校验 Token
        if (!token) {
            // 凭证缺失，刚性拦截并重定向到租户登录门禁
            next('/login')
        } else {
            // 凭证存在，放行通过
            next()
        }
    }
})

export default router