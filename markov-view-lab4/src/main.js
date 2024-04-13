// import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import VueMathjax  from 'vue-mathjax-next'
import 'bootstrap/dist/css/bootstrap.css'

createApp(App).use(VueMathjax).mount('#app')
