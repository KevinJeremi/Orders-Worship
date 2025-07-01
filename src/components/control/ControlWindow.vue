<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import LibraryPanel from './LibraryPanel.vue'
import PreviewPanel from './PreviewPanel.vue'
import MediaPanel from './MediaPanel.vue'
import { usePresentationStore } from '../../stores/presentationStore.js'

const store = usePresentationStore()
const isConnected = ref(false)
const availableDisplays = ref([])
const selectedDisplay = ref(0)

// Computed property that combines all relevant presentation data
const presentationState = computed(() => ({
  content: store.currentSlideContent,
  theme: store.currentTheme,
  background: store.currentBackground,
  transition: store.transitionType,
  isBlank: store.currentSlideContent.type === 'blank'
}))

// Centralized function to sync state to presentation window
const syncToPresentation = (state) => {
  if (window.electronAPI) {
    try {
      // Create a plain object (without reactive proxies) for IPC
      const plainData = {
        type: state.content.type,
        content: JSON.parse(JSON.stringify(state.content)),
        background: JSON.parse(JSON.stringify(state.background)),
        theme: JSON.parse(JSON.stringify(state.theme)),
        lineIndex: store.currentLineIndex // Include current line index for progress
      }
      
      window.electronAPI.updatePresentation(plainData)
    } catch (error) {
      console.error('Error syncing to presentation:', error)
    }
  }
}

// Deep watch on presentationState to sync with presentation window
watch(presentationState, (newState) => {
  syncToPresentation(newState)
}, { deep: true })

// Watch presentation toggle state to ensure sync when window is shown
watch(() => store.isPresenting, (isPresenting) => {
  if (isPresenting) {
    syncToPresentation(presentationState.value)
  }
})

onMounted(async () => {
  // Check if we're running in Electron
  isConnected.value = !!window.electronAPI
  
  // Sync initial state on mount
  syncToPresentation(presentationState.value)
  
  if (window.electronAPI) {
    console.log('✅ Ready to control presentation window')
    console.log('📋 Available electronAPI methods:', Object.keys(window.electronAPI))
    
    // Debug function availability
    console.log('🔍 Function availability check:')
    console.log('  - getDisplays:', typeof window.electronAPI.getDisplays)
    console.log('  - movePresentationToDisplay:', typeof window.electronAPI.movePresentationToDisplay)
    console.log('  - togglePresentation:', typeof window.electronAPI.togglePresentation)
    console.log('  - togglePreview:', typeof window.electronAPI.togglePreview)
    console.log('  - closePreview:', typeof window.electronAPI.closePreview)
    
    // Check if getDisplays function exists
    if (typeof window.electronAPI.getDisplays !== 'function') {
      console.error('❌ getDisplays function not available in electronAPI')
      console.log('Available functions:', Object.keys(window.electronAPI))
      return
    }
    
    // Get available displays
    try {
      const result = await window.electronAPI.getDisplays()
      if (result.success) {
        availableDisplays.value = result.data
        console.log('🖥️ Available displays:', result.data)
        
        // Set default to second display if available
        if (result.data.length > 1) {
          selectedDisplay.value = result.data[1].id
          console.log('🎯 Default to display 2 for presentation')
        } else {
          selectedDisplay.value = result.data[0]?.id || 0
        }
      } else {
        console.error('❌ Failed to get displays:', result.error)
      }
    } catch (error) {
      console.error('❌ Error calling getDisplays:', error)
      console.log('This might indicate preload.js needs to be refreshed')
    }
  } else {
    console.log('⚠️ Running in browser mode - presentation window not available')
  }
})

const togglePresentation = async () => {
  if (window.electronAPI) {
    try {
      // Check if movePresentationToDisplay function is available before using it
      if (selectedDisplay.value !== availableDisplays.value[0]?.id && 
          typeof window.electronAPI.movePresentationToDisplay === 'function') {
        console.log('🖥️ Moving presentation to display:', selectedDisplay.value)
        const result = await window.electronAPI.movePresentationToDisplay(selectedDisplay.value)
        console.log('🖥️ Display move result:', result)
      } else if (selectedDisplay.value !== availableDisplays.value[0]?.id) {
        console.warn('⚠️ movePresentationToDisplay function not available - presentation will show on current display')
      }
      
      window.electronAPI.togglePresentation()
      store.togglePresentation()
      console.log('🎬 Presentation window toggled:', store.isPresenting ? 'Shown' : 'Hidden')
      console.log('🖥️ Using display:', selectedDisplay.value)
    } catch (error) {
      console.error('❌ Error toggling presentation:', error)
    }
  } else {
    console.warn('⚠️ Electron API not available - cannot toggle presentation window')
  }
}

const closePresentation = () => {
  if (window.electronAPI) {
    window.electronAPI.closePresentation()
    store.isPresenting = false
    console.log('🚫 Presentation window closed')
  } else {
    console.warn('⚠️ Electron API not available - cannot close presentation window')
  }
}

const togglePreview = () => {
  if (window.electronAPI && typeof window.electronAPI.togglePreview === 'function') {
    try {
      window.electronAPI.togglePreview()
      console.log('🔹 Preview window toggled')
    } catch (error) {
      console.error('❌ Error toggling preview:', error)
    }
  } else {
    console.warn('⚠️ Electron API not available or togglePreview function missing')
    console.log('Available functions:', window.electronAPI ? Object.keys(window.electronAPI) : 'electronAPI not available')
  }
}

const closePreview = () => {
  if (window.electronAPI && typeof window.electronAPI.closePreview === 'function') {
    try {
      window.electronAPI.closePreview()
      console.log('🔸 Preview window closed')
    } catch (error) {
      console.error('❌ Error closing preview:', error)
    }
  } else {
    console.warn('⚠️ Electron API not available or closePreview function missing')
    console.log('Available functions:', window.electronAPI ? Object.keys(window.electronAPI) : 'electronAPI not available')
  }
}

const moveToDisplay = async (displayId) => {
  if (window.electronAPI && typeof window.electronAPI.movePresentationToDisplay === 'function') {
    try {
      selectedDisplay.value = displayId
      const result = await window.electronAPI.movePresentationToDisplay(displayId)
      console.log(`🖥️ Moved presentation to display ${displayId}:`, result)
    } catch (error) {
      console.error(`❌ Failed to move presentation to display ${displayId}:`, error)
    }
  } else {
    console.warn('⚠️ movePresentationToDisplay function not available')
    console.log('Available functions:', window.electronAPI ? Object.keys(window.electronAPI) : 'electronAPI not available')
    // Still update the selectedDisplay for UI purposes
    selectedDisplay.value = displayId
  }
}

const checkDisplays = async () => {
  if (window.electronAPI && typeof window.electronAPI.getDisplays === 'function') {
    try {
      const result = await window.electronAPI.getDisplays()
      if (result.success) {
        availableDisplays.value = result.data
        console.log('🖥️ Refreshed displays:', result.data)
        
        // Set default to second display if available
        if (result.data.length > 1) {
          selectedDisplay.value = result.data[1].id
          console.log('🎯 Default to display 2 for presentation')
        } else {
          selectedDisplay.value = result.data[0]?.id || 0
        }
      } else {
        console.error('❌ Failed to refresh displays:', result.error)
      }
    } catch (error) {
      console.error('❌ Error refreshing displays:', error)
    }
  }
}
</script>

<template>
  <div class="control-window">
    <!-- Header with presentation controls -->
    <header class="control-header">
      <div class="header-left">
        <h1>Worship Control</h1>
        <div class="connection-status" :class="{ connected: isConnected }">
          <div class="status-dot"></div>
          {{ isConnected ? 'Connected' : 'Disconnected' }}
        </div>
        
        <!-- Display info -->
        <div class="display-info" v-if="isConnected && availableDisplays.length > 0">
          <small>
            {{ availableDisplays.length }} display{{ availableDisplays.length > 1 ? 's' : '' }} detected
          </small>
        </div>
      </div>
      
      <div class="header-controls">
        <!-- Debug info for display selector -->
        <div class="debug-info" v-if="isConnected && availableDisplays.length > 0">
          <small style="color: #888; margin-right: 10px;">
            Debug: {{ availableDisplays.length }} displays | Selected: {{ selectedDisplay }}
          </small>
        </div>
        
        <!-- Display selection - always show if more than 1 display -->
        <div class="display-selector" v-if="availableDisplays.length > 1">
          <label for="display-select">Display:</label>
          <select 
            id="display-select" 
            v-model="selectedDisplay" 
            @change="moveToDisplay(selectedDisplay)"
            class="display-select"
          >
            <option 
              v-for="(display, index) in availableDisplays" 
              :key="display.id" 
              :value="display.id"
            >
              {{ display.primary ? 'Primary' : `Display ${index + 1}` }} 
              ({{ display.bounds.width }}x{{ display.bounds.height }})
            </option>
          </select>
        </div>
        
        <!-- Manual display selector for testing -->
        <div class="display-selector-test" v-if="isConnected && availableDisplays.length === 0">
          <label>No displays detected</label>
          <button class="btn btn-warning" @click="checkDisplays">🔄 Refresh Displays</button>
        </div>
        
        <button 
          class="btn btn-success" 
          @click="togglePresentation"
          :disabled="!isConnected"
          :title="isConnected ? 'Toggle presentation window' : 'Not connected to Electron'"
        >
          {{ store.isPresenting ? '🔴 Hide' : '🎬 Show' }} Presentation
        </button>
        <button 
          class="btn btn-secondary" 
          @click="closePresentation"
          :disabled="!isConnected || !store.isPresenting"
          title="Close presentation window"
        >
          🚫 Close
        </button>
        
        <!-- Preview window controls -->
        <button 
          class="btn btn-info" 
          @click="togglePreview"
          :disabled="!isConnected"
          :title="isConnected ? 'Toggle live preview window' : 'Not connected to Electron'"
        >
          🔹 Preview
        </button>
        <button 
          class="btn btn-secondary" 
          @click="closePreview"
          :disabled="!isConnected"
          title="Close preview window"
        >
          🔸 Close Preview
        </button>
        
        <!-- Preview window indicator -->
        <div class="preview-indicator" v-if="isConnected">
          <small style="color: #17a2b8;">
            Live Preview Available 🔹
          </small>
        </div>
        
        <!-- Status info -->
        <div class="presentation-status" v-if="isConnected">
          <small>
            Presentation: {{ store.isPresenting ? 'Active' : 'Hidden' }}
            <span v-if="availableDisplays.length > 1 && store.isPresenting">
              on {{ availableDisplays.find(d => d.id === selectedDisplay)?.primary ? 'Primary' : `Display` }}
            </span>
          </small>
        </div>
      </div>
    </header>

    <!-- Main content area with three panels -->
    <main class="control-main">
      <!-- Left Panel: Song/Bible Library -->
      <section class="panel library-panel">
        <LibraryPanel />
      </section>

      <!-- Center Panel: Preview/Current Content -->
      <section class="panel preview-panel">
        <PreviewPanel />
      </section>

      <!-- Right Panel: Media/Background -->
      <section class="panel media-panel">
        <MediaPanel />
      </section>
    </main>
  </div>
</template>

<style scoped>
.control-window {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #1a1a1a;
}

/* Header */
.control-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background-color: #2a2a2a;
  border-bottom: 1px solid #3a3a3a;
  min-height: 60px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 20px;
}

.header-left h1 {
  color: #ffffff;
  font-size: 20px;
  font-weight: 600;
  margin: 0;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 12px;
  background-color: #3a3a3a;
  font-size: 12px;
  color: #cccccc;
}

.connection-status.connected {
  background-color: rgba(40, 167, 69, 0.2);
  color: #28a745;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #dc3545;
}

.connection-status.connected .status-dot {
  background-color: #28a745;
}

.display-info {
  padding: 2px 6px;
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
  font-size: 11px;
  color: #888888;
}

.header-controls {
  display: flex;
  gap: 8px;
  align-items: center;
}

.header-controls .btn {
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
}

.display-selector {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  font-size: 12px;
  color: #cccccc;
}

.display-selector label {
  font-weight: 500;
  color: #ffffff;
}

.display-select {
  padding: 2px 6px;
  background-color: #3a3a3a;
  color: #ffffff;
  border: 1px solid #555555;
  border-radius: 3px;
  font-size: 12px;
  min-width: 140px;
}

.display-select:focus {
  outline: none;
  border-color: #007acc;
}

.presentation-status {
  margin-left: 8px;
  padding: 4px 8px;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  font-size: 12px;
  color: #cccccc;
}

/* Main content */
.control-main {
  display: grid;
  grid-template-columns: 280px 1fr 260px;
  height: calc(100vh - 60px);
  overflow: hidden;
}

.panel {
  border-right: 1px solid #3a3a3a;
  background-color: #1e1e1e;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.panel:last-child {
  border-right: none;
}

.library-panel {
  min-width: 260px;
}

.preview-panel {
  min-width: 400px;
}

.media-panel {
  min-width: 240px;
  max-width: 260px;
  height: 100%;
  flex-shrink: 0;
}

/* Responsive design */
@media (max-width: 1400px) {
  .control-main {
    grid-template-columns: 260px 1fr 240px;
  }
}

@media (max-width: 1200px) {
  .control-main {
    grid-template-columns: 240px 1fr 220px;
  }
}

@media (max-width: 900px) {
  .control-main {
    grid-template-columns: 1fr;
    grid-template-rows: 280px 1fr 200px;
  }
  
  .panel {
    border-right: none;
    border-bottom: 1px solid #3a3a3a;
  }
  
  .panel:last-child {
    border-bottom: none;
  }
}
</style>
