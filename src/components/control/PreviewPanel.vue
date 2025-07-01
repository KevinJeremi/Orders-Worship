<script setup>
import { computed, onMounted, onUnmounted } from 'vue'
import { usePresentationStore } from '../../stores/presentationStore.js'

const store = usePresentationStore()

const currentContent = computed(() => store.currentSlideContent)
const currentSong = computed(() => store.getCurrentSong)

const sendLineToPresentation = (line, index) => {
  // REFACTORED: Only update store, let ControlWindow handle IPC
  // Set transition type based on direction
  const currentIndex = store.currentLineIndex
  if (index > currentIndex) {
    store.setTransition('slide-left')
  } else if (index < currentIndex) {
    store.setTransition('slide-right')
  } else {
    store.setTransition('fade')
  }
  
  // Update the store - ControlWindow will handle the rest
  store.goToLine(index)
}

// REFACTORED: Remove sendCurrentSlide function - no longer needed
// ControlWindow watcher will handle all IPC communication

const clearPresentation = () => {
  // REFACTORED: Only update store, let ControlWindow handle IPC
  store.clearDisplay()
}

const nextLine = () => {
  // REFACTORED: Only update store, let ControlWindow handle IPC
  store.setTransition('slide-left')
  return store.nextLine()
}

const previousLine = () => {
  // REFACTORED: Only update store, let ControlWindow handle IPC
  store.setTransition('slide-right')
  return store.previousLine()
}

const toggleBlankScreen = () => {
  // REFACTORED: Only update store, let ControlWindow handle IPC
  store.toggleBlank()
}

// Keyboard shortcuts for control window
const handleKeyboardShortcuts = (event) => {
  // Only process when panel is focused
  if (!document.activeElement.closest('.preview-panel')) {
    return
  }
  
  switch (event.key) {
    case 'ArrowRight':
    case ' ':
      nextLine()
      event.preventDefault()
      break
    case 'ArrowLeft':
      previousLine()
      event.preventDefault()
      break
    case 'b':
    case 'B':
      toggleBlankScreen()
      event.preventDefault()
      break
  }
}

// Add keyboard listeners
onMounted(() => {
  document.addEventListener('keydown', handleKeyboardShortcuts)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyboardShortcuts)
})
</script>

<template>
  <div class="preview-panel">
    <header class="panel-header">
      <h2>Preview & Control</h2>
      <div class="control-buttons">
        <!-- REFACTORED: Removed "Send to Display" button - automatic sync via ControlWindow -->
        <button 
          class="btn btn-secondary"
          @click="toggleBlankScreen"
        >
          {{ currentContent.type === 'blank' && store.lastContentBeforeBlank ? 'Show Content' : 'Blank Screen' }}
        </button>
        <button 
          class="btn btn-danger" 
          @click="clearPresentation"
        >
          Clear
        </button>
      </div>
    </header>

    <div class="panel-content">
      <!-- Current content info -->
      <div v-if="currentContent.metadata" class="content-info">
        <div class="content-type">{{ currentContent.type.toUpperCase() }}</div>
        <div class="content-metadata">{{ currentContent.metadata }}</div>
      </div>

      <!-- Navigation controls for songs/multi-line content -->
      <div v-if="currentContent.lines.length > 1" class="navigation-controls">
        <button 
          class="btn btn-secondary" 
          @click="previousLine"
          :disabled="store.currentLineIndex === 0"
        >
          ← Previous
        </button>
        
        <span class="line-indicator">
          {{ store.currentLineIndex + 1 }} / {{ currentContent.lines.length }}
        </span>
        
        <button 
          class="btn btn-secondary" 
          @click="nextLine"
          :disabled="store.currentLineIndex >= currentContent.lines.length - 1"
        >
          Next →
        </button>
      </div>

      <!-- Current line display -->
      <div v-if="currentContent.text" class="current-line">
        <div class="current-line-label">Currently Displaying:</div>
        <div class="current-line-text">{{ currentContent.text }}</div>
      </div>

      <!-- Content lines (clickable for songs/verses) -->
      <div v-if="currentContent.lines.length" class="content-lines">
        <div class="lines-header">
          <span>Content Lines (click to display):</span>
        </div>
        
        <div class="lines-container">
          <div 
            v-for="(line, index) in currentContent.lines" 
            :key="index"
            class="content-line"
            :class="{ 
              active: index === store.currentLineIndex,
              clickable: true
            }"
            @click="sendLineToPresentation(line, index)"
          >
            <div class="line-number">{{ index + 1 }}</div>
            <div class="line-text">{{ line }}</div>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="!currentContent.text && !currentContent.lines.length" class="empty-state">
        <div class="empty-icon">📄</div>
        <div class="empty-title">No Content Selected</div>
        <div class="empty-description">
          Select a song from the Songs tab or search for Bible verses to begin.
        </div>
      </div>

      <!-- Keyboard shortcuts -->
      <div class="keyboard-shortcuts">
        <h3>Keyboard Shortcuts</h3>
        <div class="shortcut-list">
          <div class="shortcut-item">
            <span class="shortcut-key">→</span>
            <span class="shortcut-desc">Next line</span>
          </div>
          <div class="shortcut-item">
            <span class="shortcut-key">←</span>
            <span class="shortcut-desc">Previous line</span>
          </div>
          <div class="shortcut-item">
            <span class="shortcut-key">Space</span>
            <span class="shortcut-desc">Next line</span>
          </div>
          <div class="shortcut-item">
            <span class="shortcut-key">B</span>
            <span class="shortcut-desc">Blank screen</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.preview-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #3a3a3a;
}

.panel-header h2 {
  color: #ffffff;
  font-size: 16px;
  font-weight: 600;
  margin: 0;
}

.control-buttons {
  display: flex;
  gap: 8px;
}

.panel-content {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

/* Content info */
.content-info {
  background-color: #2a2a2a;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 16px;
  border-left: 4px solid #007acc;
}

.content-type {
  font-size: 12px;
  font-weight: 600;
  color: #007acc;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 4px;
}

.content-metadata {
  color: #ffffff;
  font-weight: 500;
}

/* Navigation controls */
.navigation-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-bottom: 16px;
  padding: 12px;
  background-color: #2a2a2a;
  border-radius: 6px;
}

.line-indicator {
  color: #cccccc;
  font-size: 14px;
  min-width: 60px;
  text-align: center;
}

/* Current line display */
.current-line {
  margin-bottom: 20px;
  padding: 16px;
  background-color: #1a3a1a;
  border: 1px solid #28a745;
  border-radius: 6px;
}

.current-line-label {
  font-size: 12px;
  color: #28a745;
  font-weight: 600;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.current-line-text {
  color: #ffffff;
  font-size: 16px;
  line-height: 1.5;
  font-weight: 500;
}

/* Content lines */
.content-lines {
  margin-top: 16px;
}

.lines-header {
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #3a3a3a;
}

.lines-header span {
  color: #cccccc;
  font-size: 13px;
  font-weight: 500;
}

.lines-container {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.content-line {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 10px;
  border-radius: 4px;
  background-color: #2a2a2a;
  border: 2px solid transparent;
  transition: all 0.2s;
}

.content-line.clickable {
  cursor: pointer;
}

.content-line.clickable:hover {
  background-color: #3a3a3a;
  border-color: #4a4a4a;
}

.content-line.active {
  background-color: #264f78;
  border-color: #3794ff;
  position: relative;
}

.content-line.active::before {
  content: '➤';
  position: absolute;
  left: -5px;
  color: #3794ff;
  transform: translateX(-100%);
}

/* Keyboard shortcuts */
.keyboard-shortcuts {
  margin-top: 20px;
  padding: 12px;
  background-color: #2a2a2a;
  border-radius: 6px;
}

.keyboard-shortcuts h3 {
  margin-top: 0;
  margin-bottom: 10px;
  font-size: 14px;
  color: #aaaaaa;
}

.shortcut-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 8px;
}

.shortcut-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.shortcut-key {
  background-color: #3a3a3a;
  border-radius: 4px;
  padding: 2px 6px;
  color: #ffffff;
  font-size: 12px;
  font-family: monospace;
  font-weight: bold;
}

.shortcut-desc {
  font-size: 12px;
  color: #cccccc;
}

.content-line.active {
  background-color: rgba(0, 122, 204, 0.1);
  border-color: #007acc;
}

.line-number {
  min-width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #3a3a3a;
  color: #cccccc;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.content-line.active .line-number {
  background-color: #007acc;
  color: white;
}

.line-text {
  color: #ffffff;
  line-height: 1.4;
  flex: 1;
}

/* Empty state */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 40px 20px;
  color: #666666;
  height: 100%;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
}

.empty-description {
  font-size: 14px;
  line-height: 1.5;
  max-width: 300px;
}
</style>
