<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { usePresentationStore } from '../../stores/presentationStore.js'

const store = usePresentationStore()
const mediaFiles = ref([])
const isLoading = ref(false)
const selectedMediaFile = ref(null)
const lastError = ref(null)
const isConnectedToElectron = ref(!!window.electronAPI)
const activeTab = ref('preview') // Tab management for compact layout

// Theme controls - reactive to store changes
const themeSettings = ref({
  fontFamily: store.currentTheme.fontFamily,
  fontSize: Number(store.currentTheme.fontSize),
  color: store.currentTheme.color,
  textAlign: store.currentTheme.textAlign
})

// Background controls - reactive to store changes
const backgroundSettings = ref({
  type: store.currentBackground.type,
  color: store.currentBackground.type === 'color' ? store.currentBackground.value : '#000000',
  selectedFile: null
})

// Watch store changes to keep UI in sync
watch(() => store.currentTheme, (newTheme) => {
  themeSettings.value = { 
    ...newTheme,
    fontSize: Number(newTheme.fontSize)
  }
  // REFACTORED: Let ControlWindow handle the presentation window update
}, { deep: true })

watch(() => store.currentBackground, (newBackground) => {
  backgroundSettings.value.type = newBackground.type
  if (newBackground.type === 'color') {
    backgroundSettings.value.color = newBackground.value
  }
  // REFACTORED: Let ControlWindow handle the presentation window update
}, { deep: true })

// Watch for slide content changes to ensure preview is always synced
watch(() => store.currentSlideContent, (newContent) => {
  // REFACTORED: Let ControlWindow handle the presentation window update
}, { deep: true })

// Watch theme settings changes from UI controls - Direct update to store
// Disabled to prevent recursive updates - using explicit handler functions instead
// watch(themeSettings, (newSettings) => {
//   // Update store directly - store watcher will handle sending the update
//   store.updateTheme({ ...newSettings })
// }, { deep: true })

// Watch background settings changes from UI controls - Direct update to store  
watch(backgroundSettings, (newSettings) => {
  if (newSettings.type === 'color') {
    store.setBackground({
      type: 'color',
      value: newSettings.color
    })
  }
}, { deep: true })

onMounted(() => {
  console.log('📱 MediaPanel mounted')
  console.log('🌐 Is connected to Electron:', isConnectedToElectron.value)
  
  // Set default tab based on context
  if (mediaFiles.value.length > 0) {
    activeTab.value = 'media'
  } else {
    activeTab.value = 'preview'
  }
  
  if (window.electronAPI) {
    console.log('📋 Available electronAPI methods in MediaPanel:', Object.keys(window.electronAPI))
    console.log('📤 Has uploadMediaFile:', !!window.electronAPI.uploadMediaFile)
    console.log('📥 Has getMediaFiles:', !!window.electronAPI.getMediaFiles)
    console.log('�️ Has deleteMediaFile:', !!window.electronAPI.deleteMediaFile)
    console.log('�📤 uploadMediaFile function type:', typeof window.electronAPI.uploadMediaFile)
  } else {
    console.error('❌ window.electronAPI is not available!')
  }
  
  loadMediaFiles()
  
  // Force initial theme settings sync
  themeSettings.value = {
    fontFamily: store.currentTheme.fontFamily,
    fontSize: Number(store.currentTheme.fontSize),
    color: store.currentTheme.color,
    textAlign: store.currentTheme.textAlign
  }
  
  // Force initial background settings sync
  backgroundSettings.value = {
    type: store.currentBackground.type,
    color: store.currentBackground.type === 'color' ? store.currentBackground.value : '#000000',
    selectedFile: store.currentBackground.type !== 'color' ? store.currentBackground.value : null
  }
})

const loadMediaFiles = async () => {
  if (!window.electronAPI) {
    console.warn('Electron API not available')
    return
  }

  console.log('Loading media files...')
  isLoading.value = true
  
  try {
    const result = await window.electronAPI.getMediaFiles()
    console.log('Media files API result:', result)
    
    if (result.success) {
      mediaFiles.value = result.data
      console.log('Media files loaded successfully:', mediaFiles.value)
      
      if (mediaFiles.value.length === 0) {
        console.log('No media files found, media folder might be empty')
      }
    } else {
      console.error('Failed to load media files:', result.error)
      mediaFiles.value = []
    }
  } catch (error) {
    console.error('Error loading media files:', error)
    mediaFiles.value = []
  } finally {
    isLoading.value = false
  }
}

// New function for uploading media files
const uploadFile = ref(null)
const isUploading = ref(false)
const uploadStatus = ref('')
const uploadProgress = ref(0)

const handleFileUpload = async (event) => {
  const file = event.target.files[0]
  if (!file) return
  
  console.log('🔄 Starting file upload process for:', file.name)
  
  if (!window.electronAPI) {
    console.error('❌ Electron API not available')
    uploadStatus.value = 'Error: Electron API not available'
    return
  }
  
  console.log('✅ Electron API is available')
  console.log('📋 Available methods:', Object.keys(window.electronAPI))
  
  if (!window.electronAPI.uploadMediaFile) {
    console.error('❌ uploadMediaFile function not found in electronAPI')
    console.log('📤 uploadMediaFile type:', typeof window.electronAPI.uploadMediaFile)
    uploadStatus.value = 'Error: Upload function not available. Please restart the application.'
    return
  }
  
  console.log('✅ uploadMediaFile function is available')
  
  // Check file type
  const fileExt = file.name.split('.').pop().toLowerCase()
  const allowedTypes = ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'webm', 'mov']
  
  if (!allowedTypes.includes(fileExt)) {
    uploadStatus.value = 'Error: Unsupported file format. Please upload images (JPG, PNG, GIF) or videos (MP4, WebM, MOV).'
    return
  }
  
  // Check file size (limit to 20MB)
  const maxSize = 20 * 1024 * 1024 // 20MB in bytes
  if (file.size > maxSize) {
    uploadStatus.value = 'Error: File too large. Maximum size is 20MB.'
    return
  }
  
  isUploading.value = true
  uploadStatus.value = 'Uploading...'
  uploadProgress.value = 0
  
  try {
    console.log('📁 Reading file as ArrayBuffer...')
    // Read the file
    const arrayBuffer = await file.arrayBuffer()
    console.log('✅ File read successfully, size:', arrayBuffer.byteLength, 'bytes')
    
    // Convert ArrayBuffer to regular array for IPC transfer
    const fileBuffer = Array.from(new Uint8Array(arrayBuffer))
    console.log('✅ File buffer created, length:', fileBuffer.length)
    
    console.log('📤 Calling uploadMediaFile...')
    // Upload the file
    const result = await window.electronAPI.uploadMediaFile({
      fileName: file.name,
      fileBuffer: fileBuffer
    })
    
    console.log('📥 Upload result:', result)
    
    if (result.success) {
      uploadStatus.value = 'Upload successful!'
      uploadFile.value = null // Reset file input
      
      // Reload media files to show the new file
      await loadMediaFiles()
      
      // Auto-select the newly uploaded file
      selectMediaFile(result.filePath)
    } else {
      uploadStatus.value = `Error: ${result.error}`
    }
  } catch (error) {
    console.error('Upload error:', error)
    uploadStatus.value = `Error: ${error.message}`
  } finally {
    isUploading.value = false
    uploadProgress.value = 0
    
    // Clear status message after 3 seconds
    setTimeout(() => {
      uploadStatus.value = ''
    }, 3000)
  }
}

const deleteMediaFile = async (filename) => {
  if (!window.electronAPI) {
    console.warn('Electron API not available')
    uploadStatus.value = 'Error: Electron API not available'
    return
  }

  // Confirm deletion
  if (!confirm(`Are you sure you want to delete "${filename}"?`)) {
    return
  }

  uploadStatus.value = 'Deleting file...'

  try {
    console.log('🗑️ Deleting media file:', filename)
    const result = await window.electronAPI.deleteMediaFile(filename)
    
    if (result.success) {
      console.log('✅ File deleted successfully:', result.message)
      uploadStatus.value = 'File deleted successfully!'
      
      // If the deleted file was selected, clear selection
      if (selectedMediaFile.value === filename) {
        selectedMediaFile.value = null
        backgroundSettings.value.selectedFile = null
        
        // Reset background to color if deleted file was being used
        if (store.currentBackground.type !== 'color') {
          backgroundSettings.value.type = 'color'
          store.setBackground({ type: 'color', value: backgroundSettings.value.color })
        }
      }
      
      // Reload media files to update the list
      await loadMediaFiles()
      
      // Clear status after delay
      setTimeout(() => {
        uploadStatus.value = ''
      }, 2000)
    } else {
      console.error('❌ Failed to delete file:', result.error)
      uploadStatus.value = `Error: ${result.error}`
    }
  } catch (error) {
    console.error('❌ Error deleting file:', error)
    uploadStatus.value = `Error: ${error.message}`
  }
}

// Computed properties for debugging
const debugInfo = computed(() => {
  return {
    isConnectedToElectron: isConnectedToElectron.value,
    mediaFilesCount: mediaFiles.value.length,
    selectedFile: selectedMediaFile.value,
    uploadStatus: uploadStatus.value,
    isUploading: isUploading.value,
    backgroundType: backgroundSettings.value.type,
  }
})

const toggleDebug = () => {
  showDebugInfo.value = !showDebugInfo.value
}

const showDebugInfo = ref(false)

const selectMediaFile = async (filename) => {
  console.log('🎯 selectMediaFile called with:', filename)
  selectedMediaFile.value = filename
  backgroundSettings.value.selectedFile = filename
  backgroundSettings.value.type = filename.match(/\.(mp4|webm|mov)$/i) ? 'video' : 'image'
  
  // Update UI first for better user feedback
  uploadStatus.value = 'Applying media as background...'
  
  try {
    console.log('🎯 Calling store.setMedia with:', filename)
    // Update store - this will handle presentation sync via the store's setMedia method
    await store.setMedia(filename)
    
    console.log('🎯 Media successfully set, current background:', store.currentBackground)
    
    // Update status to show success
    uploadStatus.value = 'Media background applied!'
    setTimeout(() => {
      uploadStatus.value = ''
    }, 2000)
  } catch (error) {
    console.error('Error setting media as background:', error)
    uploadStatus.value = 'Error applying background!'
  }
}

const setBackgroundColor = () => {
  backgroundSettings.value.type = 'color'
  backgroundSettings.value.selectedFile = null
  selectedMediaFile.value = null
  
  // Update store directly - watchers will handle sending the update automatically
  store.setBackground({
    type: 'color',
    value: backgroundSettings.value.color
  })
}

const onColorChange = () => {
  // Always update store when color changes, regardless of current type
  backgroundSettings.value.type = 'color'
  store.setBackground({
    type: 'color',
    value: backgroundSettings.value.color
  })
}

const updateTheme = () => {
  // Ensure fontSize is a number
  themeSettings.value.fontSize = Number(themeSettings.value.fontSize);
  
  // Update store only - watchers will handle sending the update automatically
  store.updateTheme({
    ...themeSettings.value
  })
}

const onFontFamilyChange = () => {
  // Update the store with the new font family
  const updatedTheme = {
    ...store.currentTheme,
    fontFamily: themeSettings.value.fontFamily
  };
  
  store.updateTheme(updatedTheme);
  console.log('Font family updated to:', updatedTheme.fontFamily);
}

const onFontSizeChange = () => {
  // Ensure fontSize is a number
  themeSettings.value.fontSize = Number(themeSettings.value.fontSize);
  
  // Update the store with the new font size
  const updatedTheme = {
    ...store.currentTheme,
    fontSize: Number(themeSettings.value.fontSize)
  };
  
  store.updateTheme(updatedTheme);
  console.log('Font size updated to:', updatedTheme.fontSize);
}

const onFontColorChange = () => {
  // Update the store with the new color
  const updatedTheme = {
    ...store.currentTheme,
    color: themeSettings.value.color
  };
  
  store.updateTheme(updatedTheme);
  console.log('Font color updated to:', updatedTheme.color);
}

const onAlignmentChange = (align) => {
  console.log('MediaPanel: Changing text alignment to:', align);
  
  // First, disable watcher temporarily to prevent recursive updates
  const newThemeSettings = { 
    ...themeSettings.value,
    textAlign: align
  };
  
  // Create a complete theme object for the update to ensure all properties are included
  const updatedTheme = {
    fontFamily: newThemeSettings.fontFamily,
    fontSize: Number(newThemeSettings.fontSize),
    color: newThemeSettings.color,
    textAlign: align, // Use the specific alignment value
    textShadow: store.currentTheme.textShadow || '3px 3px 8px rgba(0,0,0,0.95)',
    lineHeight: store.currentTheme.lineHeight || 1.4,
    padding: store.currentTheme.padding || 60,
    fontWeight: store.currentTheme.fontWeight || '600',
    letterSpacing: store.currentTheme.letterSpacing || '0.5px'
  };
  
  // Update store with the complete theme object
  store.updateTheme(updatedTheme);
  
  // After store is updated, update local settings to match
  themeSettings.value = newThemeSettings;
  
  // Double-check that the alignment was properly set
  console.log('MediaPanel: Alignment after update:', store.currentTheme.textAlign);
}

const applyPreset = (presetName) => {
  // Apply visual preset settings
  
  const presets = {
    default: {
      fontFamily: 'Segoe UI, Roboto, Arial, sans-serif',
      fontSize: 64, // Increased for projector visibility
      color: '#FFFFFF',
      textAlign: 'center',
      textShadow: '3px 3px 8px rgba(0,0,0,0.95)'
    },
    bold: {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: 72, // Larger bold text for maximum readability
      color: '#FFD700', // Gold color
      textAlign: 'center',
      textShadow: '3px 3px 10px rgba(0,0,0,0.9)'
    },
    elegant: {
      fontFamily: 'Georgia, serif',
      fontSize: 60, // Increased for projector visibility
      color: '#E6E6FA', // Light lavender
      textAlign: 'center',
      textShadow: '2px 2px 8px rgba(0,0,0,0.8)'
    }
  }
  
  const preset = presets[presetName]
  if (preset) {
    // First update the store with the new preset settings
    const updatedTheme = {
      ...store.currentTheme,
      ...preset
    };
    
    store.updateTheme(updatedTheme);
    
    // Then update the local settings to match
    themeSettings.value = {
      ...themeSettings.value,
      ...preset
    };
    
    console.log(`Applied "${presetName}" preset. Text alignment is now: ${updatedTheme.textAlign}`);
  }
}

const getFileType = (filename) => {
  const ext = filename.split('.').pop().toLowerCase()
  if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return 'image'
  if (['mp4', 'webm', 'mov'].includes(ext)) return 'video'
  return 'unknown'
}

const getFileIcon = (filename) => {
  const type = getFileType(filename)
  switch (type) {
    case 'image': return '🖼️'
    case 'video': return '🎥'
    default: return '📄'
  }
}

// Computed properties for mini preview
const previewBackground = computed(() => {
  const bg = store.currentBackground
  if (bg.type === 'color') {
    return bg.value
  } else if (bg.type === 'image' || bg.type === 'video') {
    return bg.value ? `url(${bg.value})` : '#000000'
  }
  return '#000000'
})

const previewText = computed(() => {
  const content = store.currentSlideContent
  if (content && content.text) {
    // Process text the same way as DisplayView for accurate preview
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

// Enhanced text processing - EXACT SAME AS DisplayView
const processedText = computed(() => {
  // Use store values to ensure exact sync with DisplayView
  const content = store.currentSlideContent
  if (content && content.text) {
    // Process text the same way as DisplayView for accurate sync
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

const previewMetadata = computed(() => {
  const content = store.currentSlideContent
  if (content && content.metadata) {
    return content.metadata
  }
  return ''
})

// Computed properties for preview
const previewStyles = computed(() => ({
  aspectRatio: '16/9',
  width: '100%',
  maxWidth: '250px',
  position: 'relative',
  overflow: 'hidden',
  borderRadius: '8px',
  border: '2px solid #3a3a3a'
}))

const previewBackgroundStyles = computed(() => {
  const bg = store.currentBackground
  
  switch (bg.type) {
    case 'color':
      const gradient = `linear-gradient(135deg, ${bg.value}, ${adjustBrightness(bg.value, -20)})`
      return {
        background: gradient,
        backgroundColor: bg.value,
        backgroundImage: 'none',
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: '0',
        left: '0',
        zIndex: 1
      }
    case 'image':
      // Check if bg.value is a valid data URL or file path
      const imageUrl = bg.value
      
      // If it's a file:// URL, don't use it for preview to avoid security error
      if (imageUrl && imageUrl.startsWith('file://')) {
        console.warn('🚨 Preview: Skipping file:// URL to avoid security error:', imageUrl)
        return {
          backgroundColor: '#222',
          backgroundImage: 'none',
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: '0',
          left: '0',
          zIndex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: '12px'
        }
      }
      
      return {
        backgroundColor: '#000000',
        backgroundImage: imageUrl ? `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), url("${imageUrl}")` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: '0',
        left: '0',
        zIndex: 1
      }
    case 'video':
      return {
        backgroundColor: '#000000',
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: '0',
        left: '0',
        zIndex: 1
      }
    default:
      return {
        background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
        backgroundImage: 'none',
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: '0',
        left: '0',
        zIndex: 1
      }
  }
})

const previewTextStyles = computed(() => {
  // Use store values to ensure exact sync with DisplayView
  const currentTheme = store.currentTheme;
  
  // Base container styles - same as DisplayView content-container
  return {
    position: 'relative',
    zIndex: 2,
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box',
    // Scale down padding for preview
    padding: '4px'
  }
})

// Separate computed for actual text styling - exactly like DisplayView textStyles
const previewDisplayTextStyles = computed(() => {
  const currentTheme = store.currentTheme;
  
  // Calculate preview font size - proportional to actual size
  const previewFontSize = Math.max(7, Number(currentTheme.fontSize) * 0.2);
  
  return {
    fontFamily: currentTheme.fontFamily,
    fontSize: `${previewFontSize}px`,
    color: currentTheme.color,
    textAlign: currentTheme.textAlign,
    textShadow: currentTheme.textShadow ? 
      currentTheme.textShadow.replace(/(\d+)px/g, (match, p1) => `${Math.max(1, p1 * 0.2)}px`) : 
      '1px 1px 2px rgba(0,0,0,0.8)',
    lineHeight: currentTheme.lineHeight || 1.5,
    fontWeight: currentTheme.fontWeight || '600',
    letterSpacing: currentTheme.letterSpacing || '0.5px',
    wordBreak: 'break-word',
    position: 'relative',
    zIndex: 2,
    width: '100%',
    height: '100%',
    maxWidth: '85%'
  }
})

// Helper function for color adjustment
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
</script>

<template>
  <div class="media-panel">
    <header class="panel-header">
      <h3>Media & Theme
        <span v-if="!isConnectedToElectron" class="connection-status" title="Running in browser mode">🌐</span>
        <span v-else class="connection-status" title="Connected to Electron">🔗</span>
      </h3>
      <div class="header-buttons">
        <button class="btn btn-danger btn-xs" @click="store.clearDisplay()" title="Clear presentation display">🚫</button>
        <button class="btn btn-secondary btn-xs" @click="loadMediaFiles" :disabled="isLoading">{{ isLoading ? '⟳' : '↻' }}</button>
      </div>
    </header>

    <div class="panel-content">
      <!-- Compact Tabs -->
      <div class="tab-container">
        <div class="tabs">
          <button 
            class="tab-btn" 
            :class="{ active: activeTab === 'preview' }"
            @click="activeTab = 'preview'"
          >
            📺 Preview
          </button>
          <button 
            class="tab-btn" 
            :class="{ active: activeTab === 'media' }"
            @click="activeTab = 'media'"
          >
            🖼️ Media
          </button>
          <button 
            class="tab-btn" 
            :class="{ active: activeTab === 'theme' }"
            @click="activeTab = 'theme'"
          >
            🎨 Theme
          </button>
        </div>
      </div>

      <!-- Tab Content -->
      <div class="tab-content">
        
        <!-- Preview Tab -->
        <div v-if="activeTab === 'preview'" class="tab-pane">
          <div class="mini-preview" :style="previewStyles">
            <div class="preview-background" :style="previewBackgroundStyles">
              <video 
                v-if="store.currentBackground.type === 'video'" 
                class="preview-video"
                :src="store.currentBackground.value"
                muted
                loop
                autoplay
              />
            </div>
            
            <div class="preview-content" :style="previewTextStyles">
              <div 
                v-if="store.currentSlideContent.text && store.currentSlideContent.type !== 'blank'"
                class="preview-display-text"
                :style="previewDisplayTextStyles"
              >
                <div class="preview-text-inner">{{ processedText }}</div>
              </div>
              
              <div 
                v-if="!store.currentSlideContent.text || store.currentSlideContent.type === 'blank'"
                class="preview-blank-state"
              >
                <div class="preview-blank-content">
                  <div class="preview-logo-container">
                    <div class="preview-logo">🎵</div>
                    <h2 class="preview-title">Worship Presentation</h2>
                    <p class="preview-subtitle">Ready to display content</p>
                    <small class="preview-status">{{ store.currentSlideContent.text ? 'Blank mode' : 'No content selected' }}</small>
                  </div>
                </div>
              </div>
              
              <div 
                v-if="previewMetadata && store.currentSlideContent.text"
                class="preview-metadata"
              >
                {{ previewMetadata }}
              </div>
            </div>
            
            <div class="sync-indicator" title="Preview tersinkronisasi dengan proyektor">🔄</div>
          </div>
          
          <div class="preview-info">
            <small>{{ store.currentTheme.fontSize }}px {{ store.currentTheme.fontFamily.split(',')[0] }} | {{ store.currentBackground.type === 'color' ? store.currentBackground.value : store.currentBackground.type }}</small>
          </div>
        </div>
        
        <!-- Media Tab -->
        <div v-if="activeTab === 'media'" class="tab-pane">
          <!-- Background Controls -->
          <div class="compact-section">
            <h5>Background</h5>
            
            <!-- Color/Media Toggle -->
            <div class="background-options">
              <label class="radio-option">
                <input type="radio" value="color" v-model="backgroundSettings.type" @change="setBackgroundColor" />
                <span>🎨 Color</span>
              </label>
              <label class="radio-option">
                <input type="radio" value="media" v-model="backgroundSettings.type" />
                <span>📁 Media</span>
              </label>
            </div>

            <!-- Color Picker -->
            <div v-if="backgroundSettings.type === 'color'" class="color-picker-compact">
              <input 
                type="color" 
                v-model="backgroundSettings.color"
                @input="onColorChange"
                class="color-input"
              />
              <span class="color-value">{{ backgroundSettings.color }}</span>
            </div>
          </div>

          <!-- Media Files -->
          <div class="compact-section">
            <div class="section-header">
              <h5>Media Files</h5>
              <button class="btn btn-xs refresh-btn" @click="loadMediaFiles" :disabled="isLoading">
                {{ isLoading ? '⟳' : '↻' }}
              </button>
            </div>
            
            <!-- Media List -->
            <div class="media-list-compact">
              <div v-if="isLoading" class="loading-compact">Loading...</div>
              
              <div v-else-if="mediaFiles.length === 0" class="no-media-compact">
                <p>📁 No media files</p>
                <button class="btn btn-xs" @click="loadMediaFiles">Refresh</button>
              </div>
              
              <div v-else class="media-items">
                <div 
                  v-for="file in mediaFiles" 
                  :key="file"
                  class="media-item-compact"
                  :class="{ selected: selectedMediaFile === file }"
                  @click="selectMediaFile(file)"
                >
                  <div class="media-info">
                    <span class="media-icon">{{ getFileIcon(file) }}</span>
                    <span class="media-name">{{ file }}</span>
                  </div>
                  <button 
                    class="delete-btn-compact"
                    @click.stop="deleteMediaFile(file)"
                    :disabled="isUploading"
                    title="Delete"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Upload Section -->
          <div class="compact-section">
            <h5>Add Media</h5>
            <div class="upload-compact">
              <input 
                type="file" 
                ref="fileInput"
                @change="handleFileUpload" 
                class="file-input-hidden"
                :disabled="isUploading || !isConnectedToElectron"
                accept=".jpg,.jpeg,.png,.gif,.mp4,.webm,.mov"
              />
              <button 
                class="btn btn-xs upload-btn-compact"
                @click="$refs.fileInput.click()"
                :disabled="isUploading || !isConnectedToElectron"
              >
                {{ isUploading ? '⏳' : '📤' }} Upload
              </button>
              
              <div v-if="uploadStatus" class="upload-status-compact">{{ uploadStatus }}</div>
            </div>
          </div>
        </div>

        <!-- Theme Tab -->
        <div v-if="activeTab === 'theme'" class="tab-pane">
          <!-- Quick Presets -->
          <div class="compact-section">
            <h5>Quick Themes</h5>
            <div class="theme-presets-compact">
              <button class="preset-btn-compact" @click="applyPreset('default')">Default</button>
              <button class="preset-btn-compact" @click="applyPreset('bold')">Bold</button>
              <button class="preset-btn-compact" @click="applyPreset('elegant')">Elegant</button>
            </div>
          </div>

          <!-- Font Controls -->
          <div class="compact-section">
            <h5>Font</h5>
            
            <!-- Font Family -->
            <div class="control-group-compact">
              <label>Family</label>
              <select 
                v-model="themeSettings.fontFamily"
                @change="onFontFamilyChange"
                class="select-compact"
              >
                <option value="Arial, sans-serif">Arial</option>
                <option value="'Times New Roman', serif">Times</option>
                <option value="'Georgia', serif">Georgia</option>
                <option value="'Verdana', sans-serif">Verdana</option>
              </select>
            </div>

            <!-- Font Size -->
            <div class="control-group-compact">
              <label>Size</label>
              <div class="size-control-compact">
                <input 
                  type="range" 
                  min="24" 
                  max="96" 
                  step="4"
                  v-model.number="themeSettings.fontSize"
                  @input="onFontSizeChange"
                  class="range-compact"
                />
                <span class="size-value-compact">{{ themeSettings.fontSize }}px</span>
              </div>
            </div>

            <!-- Font Color -->
            <div class="control-group-compact">
              <label>Color</label>
              <div class="color-control-compact">
                <input 
                  type="color" 
                  v-model="themeSettings.color"
                  @input="onFontColorChange"
                  class="color-input-compact"
                />
                <span class="color-value-compact">{{ themeSettings.color }}</span>
              </div>
            </div>

            <!-- Text Alignment -->
            <div class="control-group-compact">
              <label>Align</label>
              <div class="alignment-compact">
                <button 
                  v-for="align in ['left', 'center', 'right']"
                  :key="align"
                  class="align-btn"
                  :class="{ active: themeSettings.textAlign === align }"
                  @click="onAlignmentChange(align)"
                >
                  {{ align === 'left' ? '⬅️' : align === 'center' ? '↔️' : '➡️' }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Debug Info (collapsed by default) -->
        <div v-if="isConnectedToElectron && showDebugInfo" class="debug-section-compact">
          <pre class="debug-info-compact">{{ JSON.stringify(debugInfo, null, 2) }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Compact Media Panel Layout */
.media-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  font-size: 12px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 8px;
  border-bottom: 1px solid #3a3a3a;
  background-color: #2a2a2a;
  flex-shrink: 0;
  min-height: 32px;
}

.panel-header h3 {
  margin: 0;
  color: #ffffff;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
}

.connection-status {
  font-size: 10px;
  opacity: 0.7;
}

.header-buttons {
  display: flex;
  gap: 3px;
}

.btn-xs {
  padding: 2px 4px;
  font-size: 10px;
  border-radius: 2px;
  border: 1px solid #3a3a3a;
  background-color: #2a2a2a;
  color: #ffffff;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-xs:hover {
  background-color: #3a3a3a;
  border-color: #007acc;
}

.btn-danger { background-color: #dc3545; border-color: #dc3545; }
.btn-secondary { background-color: #6c757d; border-color: #6c757d; }

.panel-content {
  flex: 1;
  padding: 4px;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
}

/* Compact Tab System */
.tab-container {
  margin-bottom: 4px;
}

.tabs {
  display: flex;
  background-color: #2a2a2a;
  border-radius: 3px;
  overflow: hidden;
}

.tab-btn {
  flex: 1;
  padding: 4px 2px;
  font-size: 10px;
  border: none;
  background-color: #2a2a2a;
  color: #cccccc;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}

.tab-btn:hover {
  background-color: #3a3a3a;
}

.tab-btn.active {
  background-color: #007acc;
  color: #ffffff;
}

.tab-content {
  min-height: 0;
  flex: 1;
  overflow-y: auto;
}

.tab-pane {
  display: flex;
  flex-direction: column;
  gap: 6px;
  height: 100%;
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Compact Sections */
.compact-section {
  padding: 4px 6px;
  background-color: #2a2a2a;
  border-radius: 3px;
  border: 1px solid #3a3a3a;
}

.compact-section h5 {
  margin: 0 0 4px 0;
  color: #ffffff;
  font-size: 11px;
  font-weight: 600;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

/* Preview Styles */
.mini-preview {
  background-color: #000;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  margin: 0 auto 4px auto;
  max-width: 160px;
  aspect-ratio: 16/9;
  position: relative;
  width: 100%;
  height: auto;
}

.preview-background {
  width: 100% !important;
  height: 100% !important;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 90px;
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
  z-index: 1;
}

.preview-video {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.preview-content {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  min-height: 90px;
  text-align: center;
  padding: 2px;
  box-sizing: border-box;
}

.preview-display-text {
  max-width: 85%;
  width: 100%;
  word-wrap: break-word;
  hyphens: auto;
  line-height: 1.3;
}

.preview-text-inner {
  background-color: rgba(0, 0, 0, 0.2);
  padding: 1px;
  border-radius: 1px;
  backdrop-filter: blur(1px);
  white-space: pre-wrap;
}

.preview-blank-state {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-blank-content {
  text-align: center;
  color: rgba(255, 255, 255, 0.4);
}

.preview-logo-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
}

.preview-logo {
  font-size: 12px;
  margin-bottom: 1px;
  animation: pulse 2s infinite ease-in-out;
}

.preview-title {
  margin: 0;
  font-size: 6px;
  font-weight: 300;
}

.preview-subtitle {
  margin: 1px 0 0;
  font-size: 3px;
  opacity: 0.7;
}

.preview-status {
  font-size: 2px;
  opacity: 0.6;
  margin-top: 1px;
  display: block;
}

.preview-metadata {
  position: absolute;
  bottom: 2px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 3px;
  opacity: 0.8;
  background-color: rgba(0, 0, 0, 0.3);
  padding: 1px 3px;
  border-radius: 3px;
  max-width: 80%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sync-indicator {
  position: absolute;
  top: 2px;
  right: 2px;
  font-size: 8px;
  opacity: 0.6;
  background-color: rgba(0, 255, 0, 0.1);
  padding: 1px 2px;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

.preview-info {
  margin-top: 2px;
  text-align: center;
  color: #888;
  font-size: 9px;
}

/* Background Controls */
.background-options {
  display: flex;
  gap: 4px;
  margin-bottom: 4px;
}

.radio-option {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 10px;
  color: #cccccc;
  cursor: pointer;
}

.radio-option input[type="radio"] {
  margin: 0;
}

.color-picker-compact {
  display: flex;
  align-items: center;
  gap: 4px;
}

.color-input {
  width: 24px;
  height: 20px;
  border: none;
  border-radius: 2px;
  cursor: pointer;
}

.color-value {
  font-family: monospace;
  font-size: 9px;
  color: #888888;
}

/* Media List Compact */
.media-list-compact {
  max-height: 120px;
  overflow-y: auto;
}

.loading-compact, .no-media-compact {
  text-align: center;
  color: #888888;
  padding: 8px;
  font-size: 10px;
}

.media-items {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.media-item-compact {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 3px 4px;
  background-color: #1e1e1e;
  border-radius: 2px;
  transition: all 0.2s;
  border: 1px solid transparent;
  cursor: pointer;
}

.media-item-compact:hover {
  background-color: #3a3a3a;
}

.media-item-compact.selected {
  background-color: rgba(0, 122, 204, 0.2);
  border-color: #007acc;
}

.media-info {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

.media-icon {
  font-size: 12px;
  flex-shrink: 0;
}

.media-name {
  color: #ffffff;
  font-size: 10px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.delete-btn-compact {
  background: none;
  border: none;
  color: #ff6b6b;
  cursor: pointer;
  padding: 2px;
  border-radius: 2px;
  font-size: 10px;
  opacity: 0.7;
  transition: all 0.2s;
  flex-shrink: 0;
}

.delete-btn-compact:hover {
  opacity: 1;
  background-color: rgba(255, 107, 107, 0.1);
}

/* Upload Compact */
.upload-compact {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.file-input-hidden {
  display: none;
}

.upload-btn-compact {
  background-color: #2a2a2a;
  border: 1px solid #3a3a3a;
  color: #ffffff;
  padding: 4px 8px;
  border-radius: 2px;
  cursor: pointer;
  font-size: 10px;
  transition: all 0.2s;
}

.upload-btn-compact:hover:not(:disabled) {
  background-color: #3a3a3a;
  border-color: #007acc;
}

.upload-btn-compact:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.upload-status-compact {
  font-size: 9px;
  padding: 2px 4px;
  border-radius: 2px;
  text-align: center;
  background-color: rgba(0, 122, 204, 0.1);
  color: #ffffff;
}

/* Theme Controls */
.theme-presets-compact {
  display: flex;
  gap: 2px;
}

.preset-btn-compact {
  flex: 1;
  padding: 3px 4px;
  font-size: 9px;
  border: 1px solid #3a3a3a;
  border-radius: 2px;
  background-color: #2a2a2a;
  color: #ffffff;
  cursor: pointer;
  transition: all 0.2s;
}

.preset-btn-compact:hover {
  background-color: #3a3a3a;
  border-color: #007acc;
}

.control-group-compact {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 4px;
}

.control-group-compact label {
  color: #cccccc;
  font-size: 10px;
  font-weight: 500;
}

.select-compact {
  padding: 2px 4px;
  border: 1px solid #3a3a3a;
  border-radius: 2px;
  background-color: #1e1e1e;
  color: #ffffff;
  font-size: 10px;
}

.select-compact:focus {
  outline: none;
  border-color: #007acc;
}

.size-control-compact {
  display: flex;
  align-items: center;
  gap: 4px;
}

.range-compact {
  flex: 1;
  height: 16px;
}

.size-value-compact {
  font-family: monospace;
  font-size: 9px;
  color: #888888;
  min-width: 30px;
}

.color-control-compact {
  display: flex;
  align-items: center;
  gap: 4px;
}

.color-input-compact {
  width: 20px;
  height: 16px;
  border: none;
  border-radius: 2px;
  cursor: pointer;
}

.color-value-compact {
  font-family: monospace;
  font-size: 9px;
  color: #888888;
}

.alignment-compact {
  display: flex;
  gap: 2px;
}

.align-btn {
  padding: 2px 4px;
  font-size: 10px;
  border: 1px solid #3a3a3a;
  border-radius: 2px;
  background-color: #2a2a2a;
  color: #ffffff;
  cursor: pointer;
  transition: all 0.2s;
  flex: 1;
}

.align-btn:hover {
  background-color: #3a3a3a;
}

.align-btn.active {
  background-color: #007acc;
  border-color: #007acc;
}

/* Debug */
.debug-section-compact {
  background-color: #1e1e1e;
  border-radius: 3px;
  padding: 4px;
  margin-top: 4px;
}

.debug-info-compact {
  font-family: monospace;
  font-size: 8px;
  color: #a9b7c6;
  white-space: pre-wrap;
  margin: 0;
  max-height: 60px;
  overflow-y: auto;
}

/* Responsive adjustments */
@media (max-width: 1200px) {
  .mini-preview {
    max-width: 140px;
  }
  
  .media-panel {
    font-size: 11px;
  }
}

@media (max-width: 900px) {
  .tab-btn {
    padding: 6px 4px;
    font-size: 11px;
  }
  
  .mini-preview {
    max-width: 100%;
  }
  
  .compact-section {
    padding: 6px 8px;
  }
}

/* Remove old styles conflicts */
.control-section,
.media-list,
.theme-controls,
.file-upload-section,
.debug-info-section {
  display: none;
}
</style>
