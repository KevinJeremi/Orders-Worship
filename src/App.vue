<script setup>
import { onMounted, ref } from 'vue'
import ControlWindow from './components/control/ControlWindow.vue'
import DisplayView from './components/presentation/DisplayView.vue'

const windowType = ref('control')

onMounted(() => {
  // Determine which window type this is based on URL params or electron API
  if (window.electronAPI) {
    const params = window.electronAPI.getUrlParams()
    windowType.value = params.window || 'control'
  } else {
    // Fallback for development
    const urlParams = new URLSearchParams(window.location.search)
    windowType.value = urlParams.get('window') || 'control'
  }
})
</script>

<template>
  <div id="app">
    <!-- Control Window - Main interface for managing the presentation -->
    <ControlWindow v-if="windowType === 'control'" />
    
    <!-- Presentation Window - Display view for the second screen -->
    <DisplayView v-else-if="windowType === 'presentation'" />
    
    <!-- Preview Window - Live preview of what will be shown -->
    <DisplayView v-else-if="windowType === 'preview'" :is-preview="true" />
    
    <!-- Fallback -->
    <div v-else class="error">
      <h1>Unknown window type: {{ windowType }}</h1>
      <p>Please specify ?window=control, ?window=presentation, or ?window=preview</p>
    </div>
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  background-color: #1a1a1a;
  color: #ffffff;
  overflow: hidden;
}

#app {
  width: 100vw;
  height: 100vh;
}

.error {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: #2a2a2a;
  color: #ff6b6b;
}

.error h1 {
  margin-bottom: 1rem;
}

/* Utility classes */
.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.btn-primary {
  background-color: #007acc;
  color: white;
}

.btn-primary:hover {
  background-color: #005a9f;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background-color: #545b62;
}

.btn-success {
  background-color: #28a745;
  color: white;
}

.btn-success:hover {
  background-color: #1e7e34;
}

.btn-danger {
  background-color: #dc3545;
  color: white;
}

.btn-danger:hover {
  background-color: #b02a37;
}
</style>
