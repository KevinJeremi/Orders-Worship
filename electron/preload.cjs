const { contextBridge, ipcRenderer } = require('electron')

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Presentation control
  updatePresentation: (data) => ipcRenderer.send('update-presentation', data),
  togglePresentation: () => ipcRenderer.send('toggle-presentation'),
  closePresentation: () => ipcRenderer.send('close-presentation'),
  
  // Preview control
  togglePreview: () => ipcRenderer.send('toggle-preview'),
  closePreview: () => ipcRenderer.send('close-preview'),
  
  // Listen for presentation updates (for presentation window)
  onDisplayUpdate: (callback) => {
    ipcRenderer.on('update-display', (event, data) => callback(data))
  },
  
  // Remove listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel)
  },
  
  // Database operations
  searchBible: (query) => ipcRenderer.invoke('search-bible', query),
  
  // Media file operations
  getMediaFiles: () => ipcRenderer.invoke('get-media-files'),
  getMediaPath: (filename) => ipcRenderer.invoke('get-media-path', filename),
  uploadMediaFile: (fileData) => ipcRenderer.invoke('upload-media-file', fileData),
  deleteMediaFile: (filename) => ipcRenderer.invoke('delete-media-file', filename),
  
  // Display management
  getDisplays: () => ipcRenderer.invoke('get-displays'),
  movePresentationToDisplay: (displayId) => ipcRenderer.invoke('move-presentation-to-display', displayId),
  
  // Utility
  getUrlParams: () => {
    const urlParams = new URLSearchParams(window.location.search)
    return {
      window: urlParams.get('window') || 'control'
    }
  }
})

// DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Preload script loaded (preload.cjs)')
  
  // Safely check if electronAPI is available
  setTimeout(() => {
    try {
      if (window.electronAPI) {
        console.log('🛠️ Available electronAPI methods:', Object.keys(window.electronAPI))
        console.log('✅ Has uploadMediaFile:', !!window.electronAPI.uploadMediaFile)
        console.log('✅ Has getMediaFiles:', !!window.electronAPI.getMediaFiles)
        console.log('✅ Has getMediaPath:', !!window.electronAPI.getMediaPath)
        
        // Test uploadMediaFile function specifically
        if (typeof window.electronAPI.uploadMediaFile === 'function') {
          console.log('✅ uploadMediaFile function is properly exposed and callable')
        } else {
          console.log('❌ uploadMediaFile function is NOT properly exposed:', typeof window.electronAPI.uploadMediaFile)
        }
      } else {
        console.log('⚠️ window.electronAPI is not available yet')
      }
    } catch (error) {
      console.error('Error checking electronAPI:', error.message)
    }
  }, 100) // Small delay to ensure API is ready
})
