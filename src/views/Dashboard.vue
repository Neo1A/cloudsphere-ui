<template>
  <ControlCenter :apiBase="apiBase" :token="token" />
</template>

<script setup>
import { ref } from 'vue'
import ControlCenter from '../components/ControlCenter.vue'

const apiBase = ref(`${window.location.protocol}//${window.location.host}`)
const token = ref(localStorage.getItem('cs_token') || '')
</script>