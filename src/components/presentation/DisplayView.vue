<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { usePresentationStore } from '../../stores/presentationStore.js'

// Props to detect if this is preview mode
const props = defineProps({
  isPreview: {
    type: Boolean,
    default: false
  }
})

const store = usePresentationStore()

// Local state for animation and controls only
const videoElement = ref(null)
const currentSlideAnimation = ref('fade-in')
const isTransitioning = ref(false)
const showControls = ref(false)
const isDevelopment = ref(process.env.NODE_ENV === 'development')

// Local state to store presentation data from IPC - DO NOT UPDATE STORE
const presentationData = ref({
  content: {
    type: 'default',
    text: 'Selamat datang di Worship Presentation',
    metadata: 'Ready to Display',
    lines: ['Selamat datang di Worship Presentation']
  },
  theme: {
    fontFamily: 'Arial, sans-serif',
    fontSize: 48,
    color: '#ffffff',
    textAlign: 'center',
    textShadow: '3px 3px 8px rgba(0,0,0,0.9)',
    lineHeight: 1.5,
    padding: 60,
    fontWeight: '600',
    letterSpacing: '0.5px'
  },
  background: {
    type: 'color',
    value: '#1a1a2e'
  },
  currentLineIndex: 0,  // Track line progression locally
  isInitialized: false  // Track if we received IPC data
})

// Computed styles with enhanced theming - REACTIVE TO LOCAL PRESENTATION DATA
const textStyles = computed(() => {
  // Use local presentation data to ensure exact sync with IPC messages
  const currentTheme = presentationData.value.theme;
  const alignment = currentTheme.textAlign || 'center';
  
  // Log alignment changes for debugging
  console.log('DisplayView: Computing textStyles with alignment:', alignment);
  
  return {
    fontFamily: currentTheme.fontFamily || 'Arial, sans-serif',
    fontSize: `${currentTheme.fontSize || 48}px`,
    color: currentTheme.color || '#ffffff',
    // Use the alignment from theme settings
    textAlign: alignment,
    textShadow: currentTheme.textShadow || '3px 3px 8px rgba(0,0,0,0.9)',
    lineHeight: currentTheme.lineHeight || 1.5,
    // Remove padding from textStyles to better control layout
    fontWeight: currentTheme.fontWeight || '600',
    letterSpacing: currentTheme.letterSpacing || '0.5px',
    wordBreak: 'break-word',
    width: '100%',
    maxWidth: '100%',
    margin: '0 auto',
    boxSizing: 'border-box'
  }
})

const backgroundStyles = computed(() => {
  // Use local presentation data to ensure exact sync with IPC messages
  const bg = presentationData.value.background || { type: 'color', value: '#000000' }
  
  switch (bg.type) {
    case 'color':
      const color = bg.value || '#000000'
      
      // Use solid color instead of gradient for better color visibility
      const solidColor = color
      
      return {
        backgroundColor: solidColor,
        background: solidColor, // Ensure both properties are set
        backgroundImage: 'none'
      }
    case 'image':
      return {
        backgroundColor: '#000000',
        backgroundImage: bg.value ? `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), url("${bg.value}")` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }
    case 'video':
      // For videos, we use a plain black background as the actual video element is separate
      return {
        backgroundColor: '#000000'
      }
    default:
      return {
        backgroundColor: '#1a1a2e',
        background: '#1a1a2e',
        backgroundImage: 'none'
      }
  }
})

// Helper function to adjust color brightness
const adjustBrightness = (color, amount) => {
  const usePound = color[0] === '#'
  const col = usePound ? color.slice(1) : color
  const num = parseInt(col, 16)
  let r = (num >> 16) + amount
  let g = ((num >> 8) & 0x00FF) + amount
  let b = (num & 0x0000FF) + amount
  
  r = r > 255 ? 255 : r < 0 ? 0 : r
  g = g > 255 ? 255 : g < 0 ? 0 : g
  b = b > 255 ? 255 : b < 0 ? 0 : b
  
  return (usePound ? '#' : '') + (r << 16 | g << 8 | b).toString(16).padStart(6, '0')
}

// Enhanced text processing for better display - USING LOCAL PRESENTATION DATA
const processedText = computed(() => {
  // Use local presentation data to ensure exact sync with IPC messages
  const content = presentationData.value.content
  
  if (content && content.text) {
    // Process text the same way as Live Preview for accurate sync
    const words = content.text.split(' ')
    const maxWordsPerLine = 8
    const lines = []
    
    for (let i = 0; i < words.length; i += maxWordsPerLine) {
      lines.push(words.slice(i, i + maxWordsPerLine).join(' '))
    }
    
    return lines.join('\n')
  }
  
  return 'No content selected'
})

// Video source from local data
const currentVideoSource = computed(() => {
  const bg = presentationData.value.background
  if (bg.type === 'video') {
    return bg.value
  }
  return null
})

// Watch for video source changes
watch(currentVideoSource, (newSource, oldSource) => {
  if (newSource !== oldSource && videoElement.value && newSource) {
    videoElement.value.src = newSource
  }
}, { immediate: true })

// Initialize with store data and then listen for IPC updates
const initializePresentationData = () => {
  // Use store data if available, otherwise keep default data
  if (store.currentSlideContent && store.currentSlideContent.text) {
    presentationData.value.content = { ...store.currentSlideContent }
  } else {
    // Ensure we have default content
    presentationData.value.content = {
      type: 'default',
      text: 'Selamat datang di Worship Presentation',
      metadata: 'Ready to Display',
      lines: ['Selamat datang di Worship Presentation']
    }
  }
  
  // Use store theme if available
  if (store.currentTheme && store.currentTheme.fontFamily) {
    presentationData.value.theme = { ...store.currentTheme }
  }
  
  // Use store background if available
  if (store.currentBackground && store.currentBackground.type) {
    presentationData.value.background = { ...store.currentBackground }
  }
  
  presentationData.value.currentLineIndex = store.currentLineIndex || 0
  presentationData.value.isInitialized = true
}

// Watch for changes in the store and update local presentation data
watch(() => store.currentTheme, (newTheme) => {
  if (newTheme) {
    console.log('DisplayView: Theme updated from store:', JSON.stringify(newTheme));
    console.log('DisplayView: Text alignment is now:', newTheme.textAlign);
    
    // Create a new object with explicit alignment to force reactivity
    presentationData.value.theme = { 
      ...newTheme,
      textAlign: newTheme.textAlign || 'center' // Explicitly set alignment
    };
    
    // Double check the value was applied
    console.log('DisplayView: Updated presentationData theme:', JSON.stringify(presentationData.value.theme));
    console.log('DisplayView: Computed textStyles alignment:', textStyles.value.textAlign);
  }
}, { deep: true });

watch(() => store.currentSlideContent, (newContent) => {
  if (newContent) {
    presentationData.value.content = { ...newContent };
  }
}, { deep: true });

watch(() => store.currentBackground, (newBackground) => {
  if (newBackground) {
    presentationData.value.background = { ...newBackground };
  }
}, { deep: true });

// Handle IPC messages from control window with smooth transitions
const handleDisplayUpdate = (data) => {
  // Trigger transition animation
  isTransitioning.value = true
  
  setTimeout(() => {
    // Update LOCAL presentation data - DO NOT UPDATE STORE to avoid conflicts
    if (data.content) {
      presentationData.value.content = { ...data.content }
      // Also update line index if provided
      if (typeof data.lineIndex === 'number') {
        presentationData.value.currentLineIndex = data.lineIndex
      }
      presentationData.value.isInitialized = true
    }
    
    if (data.theme) {
      presentationData.value.theme = { ...data.theme }
      presentationData.value.isInitialized = true
    }
    
    if (data.background) {
      presentationData.value.background = { ...data.background }
      presentationData.value.isInitialized = true
      
      // Handle video background
      if (data.background.type === 'video' && videoElement.value) {
        const videoPath = data.background.value
        
        try {
          videoElement.value.src = videoPath
          videoElement.value.load()
          videoElement.value.play().catch(error => {
            console.error('Video playback failed:', error)
          })
        } catch (error) {
          console.error('Error setting video src:', error)
        }
      }
    }
    
    // Complete transition
    setTimeout(() => {
      isTransitioning.value = false
    }, 100)
  }, 150)
}

// Watch for background changes to trigger transitions
watch(() => presentationData.value.background, (newBackground, oldBackground) => {
  // Force re-render by triggering a brief transition
  if (oldBackground?.value !== newBackground?.value) {
    isTransitioning.value = true
    setTimeout(() => {
      isTransitioning.value = false
    }, 100)
  }
}, { deep: true, immediate: true })

// Lifecycle
onMounted(() => {
  // Initialize with store data first
  initializePresentationData()
  
  // Set up IPC listener for display updates
  if (window.electronAPI) {
    window.electronAPI.onDisplayUpdate(handleDisplayUpdate)
  }
  
  // Add event listeners
  document.addEventListener('keydown', handleKeydown)
  document.addEventListener('mousemove', handleMouseMove)
  
  // Auto-enter fullscreen after a delay
  setTimeout(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(console.error)
    }
  }, 1000)
})

onUnmounted(() => {
  // Clean up IPC listeners
  if (window.electronAPI) {
    window.electronAPI.removeAllListeners('update-display')
  }
  
  // Remove event listeners
  document.removeEventListener('keydown', handleKeydown)
  document.removeEventListener('mousemove', handleMouseMove)
  
  // Clear timeouts
  clearTimeout(cursorTimeout)
  
  // Exit fullscreen
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(console.error)
  }
})



// Keyboard navigation for presentation control
const handleKeydown = (event) => {
  switch (event.key) {
    case 'ArrowRight':
    case 'Space':
    case 'PageDown':
      // Next slide/line
      if (presentationData.value.currentLineIndex < presentationData.value.content.lines.length - 1) {
        presentationData.value.currentLineIndex++
        const newText = presentationData.value.content.lines[presentationData.value.currentLineIndex]
        presentationData.value.content.text = newText
        currentSlideAnimation.value = 'slide-left'
      }
      event.preventDefault()
      break
    case 'ArrowLeft':
    case 'PageUp':
      // Previous slide/line
      if (presentationData.value.currentLineIndex > 0) {
        presentationData.value.currentLineIndex--
        const newText = presentationData.value.content.lines[presentationData.value.currentLineIndex]
        presentationData.value.content.text = newText
        currentSlideAnimation.value = 'slide-right'
      }
      event.preventDefault()
      break
    case 'Home':
      // Go to first line
      if (presentationData.value.content.lines.length > 0) {
        presentationData.value.currentLineIndex = 0
        presentationData.value.content.text = presentationData.value.content.lines[0]
      }
      event.preventDefault()
      break
    case 'End':
      // Go to last line
      if (presentationData.value.content.lines.length > 0) {
        presentationData.value.currentLineIndex = presentationData.value.content.lines.length - 1
        presentationData.value.content.text = presentationData.value.content.lines[presentationData.value.currentLineIndex]
      }
      event.preventDefault()
      break
    case 'Escape':
      // Hide presentation
      if (window.electronAPI) {
        window.electronAPI.closePresentation()
      }
      event.preventDefault()
      break
    case 'b':
    case 'B':
      // Toggle blank screen
      if (presentationData.value.content.type !== 'blank') {
        // Show blank screen locally
        presentationData.value.content = { type: 'blank', text: '', metadata: '', lines: [] }
      }
      event.preventDefault()
      break
    case 'f':
    case 'F':
    case 'F11':
      // Toggle fullscreen
      if (document.fullscreenElement) {
        document.exitFullscreen()
      } else {
        document.documentElement.requestFullscreen()
      }
      event.preventDefault()
      break
    case 'h':
    case 'H':
    case '?':
      // Toggle help overlay
      showControls.value = !showControls.value
      event.preventDefault()
      break
  }
}

// Auto-hide cursor after inactivity
const cursorVisible = ref(false)
let cursorTimeout = null

const showCursor = () => {
  cursorVisible.value = true
  clearTimeout(cursorTimeout)
  cursorTimeout = setTimeout(() => {
    cursorVisible.value = false
  }, 3000)
}

const handleMouseMove = () => {
  showCursor()
}

// Add video handling functions
const handleVideoError = (e) => {
  console.error('Video playback error:', e)
  // Fallback to a solid background color if video fails to load
  if (presentationData.value.background && presentationData.value.background.type === 'video') {
    console.warn('Falling back to default background due to video error')
  }
}

const handleVideoLoaded = () => {
  console.log('Video loaded successfully')
  // Ensure video plays after loading
  if (videoElement.value) {
    videoElement.value.play().catch(err => {
      console.error('Failed to play video:', err)
    })
  }
}
</script>

<template>
  <div 
    class="display-view"
    :class="{ 'cursor-hidden': !cursorVisible, 'transitioning': isTransitioning }"
    :style="backgroundStyles"
  >
    <!-- Video Background -->
    <video 
      v-if="presentationData.background && presentationData.background.type === 'video'"
      ref="videoElement"
      class="video-background"
      :src="presentationData.background.value"
      autoplay
      muted
      loop
      playsinline
      @error="handleVideoError"
      @loadedmetadata="handleVideoLoaded"
    />
    
    <!-- Background Overlay for better text readability -->
    <div 
      v-if="presentationData.content.text && presentationData.background.type !== 'color'"
      class="background-overlay"
    />
    
    <!-- Main Content Area -->
    <div class="content-container">
      <!-- Text Display with enhanced animation -->
      <Transition :name="currentSlideAnimation" mode="out-in">
        <div 
          v-if="presentationData.content.text && presentationData.content.type !== 'blank'"
          :key="presentationData.content.text"
          class="display-text"
          :style="textStyles"
        >
          <div class="text-content-wrapper">
            <div class="text-inner" :style="{ textAlign: textStyles.textAlign }">
              {{ processedText }}
            </div>
          </div>
        </div>
      </Transition>
      
      <!-- Always show blank/default content when no text or type is blank -->
      <div 
        v-if="!presentationData.content.text || presentationData.content.type === 'blank'"
        class="blank-state"
      >
        <div class="blank-content">
          <div class="logo-container">
            <div class="logo">🎵</div>
            <h2>Worship Presentation</h2>
            <p>Ready to display content</p>
            <small>{{ presentationData.content.text ? 'Blank mode' : 'No content selected' }}</small>
          </div>
        </div>
      </div>
      
      <!-- Metadata Display with slide-up animation -->
      <Transition name="slide-up" mode="out-in">
        <div 
          v-if="presentationData.content.metadata && presentationData.content.type !== 'blank'"
          :key="presentationData.content.metadata"
          class="metadata"
        >
          <div class="metadata-content">
            <i class="metadata-icon">♪</i>
            {{ presentationData.content.metadata }}
          </div>
        </div>
      </Transition>
      
      <!-- Progress Indicator -->
      <div 
        v-if="presentationData.content.lines && presentationData.content.lines.length > 1"
        class="progress-indicator"
      >
        <div 
          class="progress-bar"
          :style="{ 
            width: `${((presentationData.currentLineIndex + 1) / presentationData.content.lines.length) * 100}%`
          }"
        ></div>
        <div class="progress-text">
          {{ presentationData.currentLineIndex + 1 }} / {{ presentationData.content.lines.length }}
        </div>
      </div>
    </div>
    
    <!-- Controls Help Overlay -->
    <Transition name="fade">
      <div v-if="showControls" class="controls-overlay">
        <div class="controls-content">
          <h3>Presentation Controls</h3>
          <div class="control-item">
            <kbd>Space</kbd> / <kbd>→</kbd> Next slide
          </div>
          <div class="control-item">
            <kbd>←</kbd> Previous slide
          </div>
          <div class="control-item">
            <kbd>B</kbd> Toggle blank screen
          </div>
          <div class="control-item">
            <kbd>F</kbd> / <kbd>F11</kbd> Toggle fullscreen
          </div>
          <div class="control-item">
            <kbd>Esc</kbd> Exit presentation
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>



<style scoped>
/* Main container */
.display-view {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #000000;
  transition: background-color 0.8s ease;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  /* Pastikan tidak ada margin/padding di body/html yang mempengaruhi */
  /* Tambahkan ini untuk mencegah pergeseran */
  position: fixed;
  top: 0;
  left: 0;
}

.display-view.cursor-hidden {
  cursor: none;
}

.display-view.transitioning {
  filter: blur(3px);
  transition: filter 0.2s ease;
}

/* Video Background */
.video-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 1;
}

/* Background Overlay */
.background-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.6) 100%);
  z-index: 2;
}

/* Content Container */
.content-container {
  position: relative;
  z-index: 3;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 40px;
  box-sizing: border-box;
  /* Remove hardcoded text-align to allow dynamic alignment from theme */
  overflow: hidden; /* Prevent content from going outside viewport */
  /* Hapus left dan right yang mungkin menyebabkan pergeseran */
  /* left: 0; 
  right: 0; */
  /* Pastikan margin kiri dan kanan sama untuk centering sempurna */
  margin: 0 auto; /* Center horizontally */
}

/* Text Display */
.display-text {
  max-width: 90%;
  width: 100%;
  word-wrap: break-word;
  hyphens: auto;
  /* Remove hardcoded text-align to use computed value from textStyles */
  line-height: 1.5;
  perspective: 1000px;
  margin: 0 auto; /* Center horizontally */
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  position: relative;
}

.text-inner {
  background-color: rgba(0, 0, 0, 0.2);
  padding: 20px;
  border-radius: 8px;
  backdrop-filter: blur(5px);
  white-space: pre-wrap;
  /* Remove hardcoded text-align to use computed value from textStyles */
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  margin: 0 auto; /* Center the text container */
  display: block; /* Changed from inline-block for better centering */
}

/* Metadata */
.metadata {
  position: absolute;
  bottom: 60px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 24px;
  opacity: 0.8;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
  background-color: rgba(0, 0, 0, 0.3);
  padding: 10px 25px;
  border-radius: 30px;
  backdrop-filter: blur(5px);
  width: auto;
  max-width: 80%;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  /* Use theme colors from store using computed properties */
  color: v-bind('textStyles.color');
  font-family: v-bind('textStyles.fontFamily');
}

.metadata-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.metadata-icon {
  font-style: normal;
  font-size: 130%;
  opacity: 0.8;
}

/* Progress Indicator */
.progress-indicator {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  width: 50%;
  max-width: 600px;
  min-width: 200px;
  height: 6px;
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(to right, rgba(149, 176, 255, 0.8), rgba(255, 119, 168, 0.8));
  border-radius: 3px;
  transition: width 0.3s ease-out;
}

.progress-text {
  position: absolute;
  bottom: -25px;
  left: 50%;
  transform: translateX(-50%);
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  white-space: nowrap;
}

/* Blank State */
.blank-state {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.blank-content {
  text-align: center;
  color: rgba(255, 255, 255, 0.4);
}

.logo-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.logo {
  font-size: 80px;
  margin-bottom: 20px;
  animation: pulse 2s infinite ease-in-out;
}

@keyframes pulse {
  0% { transform: scale(1); opacity: 0.7; }
  50% { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(1); opacity: 0.7; }
}

.blank-content h2 {
  margin: 0;
  font-size: 36px;
  font-weight: 300;
}

.blank-content p {
  margin: 10px 0 0;
  font-size: 18px;
  opacity: 0.7;
}

/* Controls Overlay */
.controls-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.controls-content {
  background-color: rgba(30, 30, 40, 0.95);
  border-radius: 8px;
  padding: 30px;
  box-shadow: 0 0 30px rgba(0, 0, 0, 0.5);
  width: 400px;
  max-width: 90%;
}

.controls-content h3 {
  margin-top: 0;
  font-size: 24px;
  color: #fff;
  margin-bottom: 20px;
  text-align: center;
}

.control-item {
  margin: 15px 0;
  display: flex;
  align-items: center;
  font-size: 16px;
}

kbd {
  background-color: #333;
  border-radius: 4px;
  border: 1px solid #555;
  box-shadow: 0 2px 0 1px #222;
  color: #ffffff;
  display: inline-block;
  font-family: monospace;
  font-size: 14px;
  line-height: 1;
  margin: 0 5px;
  padding: 5px 8px;
  white-space: nowrap;
}

/* Debug Info */
.debug-info {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 10;
  background-color: rgba(0, 0, 0, 0.7);
  color: #ffffff;
  padding: 8px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
  line-height: 1.3;
}

/* Animations */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Slide animations */
.fade-in-enter-active,
.fade-in-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-in-enter-from,
.fade-in-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
  transition: all 0.3s ease;
}

.slide-left-enter-from {
  transform: translateX(40px);
  opacity: 0;
}

.slide-left-leave-to {
  transform: translateX(-40px);
  opacity: 0;
}

.slide-right-enter-from {
  transform: translateX(-40px);
  opacity: 0;
}

.slide-right-leave-to {
  transform: translateX(40px);
  opacity: 0;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from {
  transform: translateY(30px) translateX(-50%);
  opacity: 0;
}

.slide-up-leave-to {
  transform: translateY(30px) translateX(-50%);
  opacity: 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Responsive font sizing and layout */
@media (max-width: 1920px) {
  .display-text {
    font-size: calc(var(--font-size, 48px) * 0.9) !important;
    max-width: 85%;
    padding: 0 40px;
  }
  
  .text-inner {
    padding: 18px;
  }
}

@media (max-width: 1280px) {
  .display-text {
    font-size: calc(var(--font-size, 48px) * 0.8) !important;
    max-width: 90%;
    padding: 0 30px;
  }
  
  .text-inner {
    padding: 15px;
  }
  
  .content-container {
    padding: 40px 20px;
  }
}

@media (max-width: 800px) {
  .display-text {
    font-size: calc(var(--font-size, 48px) * 0.6) !important;
    max-width: 95%;
    padding: 0 15px;
  }
  
  .text-inner {
    padding: 12px;
  }
  
  .content-container {
    padding: 20px 10px;
  }
  
  .metadata {
    font-size: 18px;
    bottom: 40px;
    padding: 8px 20px;
    max-width: 90%;
  }
  
  .progress-indicator {
    width: 80%;
    bottom: 15px;
  }
}

/* Extra small screens */
@media (max-width: 480px) {
  .display-text {
    font-size: calc(var(--font-size, 48px) * 0.5) !important;
    max-width: 98%;
    padding: 0;
  }
  
  .text-inner {
    padding: 8px;
  }
  
  .content-container {
    padding: 15px 0;
    width: 100%;
    margin: 0 auto;
  }
  
  /* Pastikan tidak ada pergeseran di layar kecil */
  .display-view {
    width: 100vw;
    margin: 0;
    left: 0;
    right: 0;
  }
}

/* Print styles (if needed) */
@media print {
  .debug-info,
  .controls-overlay,
  .progress-indicator {
    display: none;
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .background-overlay {
    background-color: rgba(0, 0, 0, 0.8);
  }
  
  .display-text {
    text-shadow: 3px 3px 6px rgba(0,0,0,1);
  }
  
  .text-inner {
    background-color: rgba(0, 0, 0, 0.5);
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .display-text,
  .metadata,
  .fade-in-enter-active,
  .fade-in-leave-active,
  .slide-left-enter-active,
  .slide-left-leave-active,
  .slide-right-enter-active,
  .slide-right-leave-active,
  .slide-up-enter-active,
  .slide-up-leave-active,
  .logo {
    animation: none;
    transition: opacity 0.1s linear;
  }
}
</style>
