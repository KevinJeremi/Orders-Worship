import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'

// Set global CSS variables for font size
document.documentElement.style.setProperty('--font-size', '48px');
document.documentElement.style.setProperty('--global-font-size', '48px');

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.mount('#app')
