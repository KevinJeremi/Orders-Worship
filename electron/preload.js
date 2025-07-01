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
  
  // Display management - NEW
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
  console.log('Preload script loaded')
  console.log('Available electronAPI methods:', Object.keys(window.electronAPI))
  
  // Verify specific functions
  console.log('getDisplays function available:', typeof window.electronAPI.getDisplays)
  console.log('movePresentationToDisplay function available:', typeof window.electronAPI.movePresentationToDisplay)
  console.log('togglePreview function available:', typeof window.electronAPI.togglePreview)
  console.log('closePreview function available:', typeof window.electronAPI.closePreview)
  
  // Test the functions
  if (window.electronAPI.getDisplays) {
    console.log('✅ getDisplays function is properly exposed')
  } else {
    console.error('❌ getDisplays function is NOT exposed')
  }
  
  if (window.electronAPI.movePresentationToDisplay) {
    console.log('✅ movePresentationToDisplay function is properly exposed')
  } else {
    console.error('❌ movePresentationToDisplay function is NOT exposed')
  }
  
  if (window.electronAPI.togglePreview) {
    console.log('✅ togglePreview function is properly exposed')
  } else {
    console.error('❌ togglePreview function is NOT exposed')
  }
  
  if (window.electronAPI.closePreview) {
    console.log('✅ closePreview function is properly exposed')
  } else {
    console.error('❌ closePreview function is NOT exposed')
  }
})
