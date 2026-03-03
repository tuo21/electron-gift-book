import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { pinia } from './stores'
import './api/init'

createApp(App)
  .use(pinia)
  .mount('#app')
