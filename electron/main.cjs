const { app, BrowserWindow, ipcMain, screen } = require('electron')
const path = require('path')
// const Database = require('better-sqlite3') // Temporarily disabled

// Global references to prevent garbage collection
let controlWindow
let presentationWindow
// let db // Temporarily disabled

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

// Database initialization - temporarily disabled
function initDatabase() {
  try {
    console.log('Database initialization temporarily disabled for testing')
    // Uncomment these lines when build tools are available:
    // const dbPath = path.join(__dirname, '..', 'src', 'database', 'bible.sqlite')
    // db = new Database(':memory:')
    // ... rest of database code
  } catch (error) {
    console.error('Failed to initialize database:', error)
  }
}

// Create the control window (main interface)
function createControlWindow() {
  controlWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'Worship Control',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    }
  })

  // Load the Vite dev server or built files
  if (isDev) {
    controlWindow.loadURL('http://localhost:5173?window=control')
    controlWindow.webContents.openDevTools()
  } else {
    controlWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }

  controlWindow.on('closed', () => {
    controlWindow = null
  })
}

// Create the presentation window (for second display)
function createPresentationWindow() {
  const displays = screen.getAllDisplays()
  let targetDisplay = displays[0] // Default to primary display
  
  // If there's a second display, use it for presentation
  if (displays.length > 1) {
    targetDisplay = displays[1]
  }

  presentationWindow = new BrowserWindow({
    width: targetDisplay.bounds.width,
    height: targetDisplay.bounds.height,
    x: targetDisplay.bounds.x,
    y: targetDisplay.bounds.y,
    title: 'Worship Presentation',
    frame: false, // Remove window frame
    kiosk: displays.length > 1, // Full kiosk mode if second display exists
    fullscreen: displays.length > 1,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    }
  })

  // Load the same app but with presentation parameter
  if (isDev) {
    presentationWindow.loadURL('http://localhost:5173?window=presentation')
    if (displays.length === 1) {
      presentationWindow.webContents.openDevTools()
    }
  } else {
    presentationWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }

  presentationWindow.on('closed', () => {
    presentationWindow = null
  })

  // Hide presentation window initially
  presentationWindow.hide()
}

// IPC Handlers for communication between windows
function setupIpcHandlers() {
  // Handle presentation updates from control window
  ipcMain.on('update-presentation', (event, data) => {
    console.log('Updating presentation with:', data)
    if (presentationWindow && !presentationWindow.isDestroyed()) {
      presentationWindow.webContents.send('update-display', data)
      presentationWindow.show() // Show presentation window when content is sent
    }
  })

  // Handle Bible search requests - using dummy data for now
  ipcMain.handle('search-bible', async (event, query) => {
    try {
      // Dummy Bible data for testing
      const dummyVerses = [
        { id: 1, book: 'Genesis', chapter: 1, verse: 1, text: 'In the beginning God created the heavens and the earth.' },
        { id: 2, book: 'John', chapter: 3, verse: 16, text: 'For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.' },
        { id: 3, book: 'Psalms', chapter: 23, verse: 1, text: 'The Lord is my shepherd, I lack nothing.' },
        { id: 4, book: 'John', chapter: 1, verse: 1, text: 'In the beginning was the Word, and the Word was with God, and the Word was God.' },
        { id: 5, book: 'Romans', chapter: 8, verse: 28, text: 'And we know that in all things God works for the good of those who love him, who have been called according to his purpose.' }
      ]

      const { book, chapter, verse } = query
      let results = dummyVerses

      if (book) {
        results = results.filter(v => v.book.toLowerCase().includes(book.toLowerCase()))
      }
      if (chapter) {
        results = results.filter(v => v.chapter === chapter)
      }
      if (verse) {
        results = results.filter(v => v.verse === verse)
      }
      
      return { success: true, data: results }
    } catch (error) {
      console.error('Bible search error:', error)
      return { success: false, error: error.message }
    }
  })

  // Handle getting media files
  ipcMain.handle('get-media-files', async (event) => {
    try {
      const fs = require('fs')
      const mediaPath = path.join(__dirname, '..', 'media')
      
      console.log('Looking for media files in:', mediaPath)
      
      if (!fs.existsSync(mediaPath)) {
        console.log('Media directory does not exist, creating it now')
        fs.mkdirSync(mediaPath, { recursive: true })
        return { success: true, data: [] }
      }

      console.log('Media directory exists, reading files')
      const files = fs.readdirSync(mediaPath)
      console.log('Files found in directory:', files)
      
      const mediaFiles = files.filter(file => {
        const ext = path.extname(file).toLowerCase()
        return ['.jpg', '.jpeg', '.png', '.gif', '.mp4', '.webm', '.mov'].includes(ext)
      })
      
      console.log('Media files found:', mediaFiles)

      return { success: true, data: mediaFiles }
    } catch (error) {
      console.error('Error getting media files:', error)
      return { success: false, error: error.message }
    }
  })

  // Handle getting media file path (convert to data URL for browser compatibility)
  ipcMain.handle('get-media-path', async (event, filename) => {
    try {
      const fs = require('fs')
      const mediaPath = path.join(__dirname, '..', 'media', filename)
      
      console.log('🎬 get-media-path called for:', filename)
      console.log('🎬 Full media path:', mediaPath)
      
      // Check if the file exists
      if (fs.existsSync(mediaPath)) {
        console.log('🎬 Media file found:', mediaPath)
        
        // Get file stats for additional info
        const stats = fs.statSync(mediaPath)
        const fileSizeInMB = stats.size / (1024 * 1024) // Convert to MB
        
        // Check if file is too large for data URL (limit to 50MB for memory reasons)
        if (stats.size > 50 * 1024 * 1024) {
          console.warn('🎬 File too large for data URL, using file path fallback')
          const fileUrl = `file://${mediaPath.replace(/\\/g, '/')}`
          return { 
            success: true, 
            path: fileUrl,
            fileSize: fileSizeInMB.toFixed(2),
            lastModified: stats.mtime,
            isDataUrl: false
          }
        }
        
        // Read file as buffer and convert to data URL
        console.log('🎬 Reading file as buffer...')
        const fileBuffer = fs.readFileSync(mediaPath)
        const fileExt = path.extname(filename).toLowerCase()
        
        let mimeType = 'application/octet-stream'
        if (['.jpg', '.jpeg'].includes(fileExt)) mimeType = 'image/jpeg'
        else if (fileExt === '.png') mimeType = 'image/png'
        else if (fileExt === '.gif') mimeType = 'image/gif'
        else if (fileExt === '.mp4') mimeType = 'video/mp4'
        else if (fileExt === '.webm') mimeType = 'video/webm'
        else if (fileExt === '.mov') mimeType = 'video/quicktime'
        
        console.log('🎬 Detected MIME type:', mimeType)
        
        const base64Data = fileBuffer.toString('base64')
        const dataUrl = `data:${mimeType};base64,${base64Data}`
        
        console.log('🎬 Created data URL, length:', dataUrl.length)
        console.log('🎬 Data URL preview:', dataUrl.substring(0, 100) + '...')
        
        return { 
          success: true, 
          path: dataUrl,
          fileSize: fileSizeInMB.toFixed(2),
          lastModified: stats.mtime,
          mimeType: mimeType,
          isDataUrl: true
        }
      } else {
        console.error('🎬 Media file not found:', mediaPath)
        return { success: false, error: 'File not found' }
      }
    } catch (error) {
      console.error('🎬 Error getting media path:', error)
      return { success: false, error: error.message }
    }
  })
  
  // Handle uploading media files
  ipcMain.handle('upload-media-file', async (event, fileData) => {
    try {
      const fs = require('fs')
      const mediaPath = path.join(__dirname, '..', 'media')
      console.log('Target media upload directory:', mediaPath)
      
      // Ensure media directory exists
      if (!fs.existsSync(mediaPath)) {
        console.log('Media directory does not exist, creating it now')
        fs.mkdirSync(mediaPath, { recursive: true })
      } else {
        console.log('Media directory exists')
      }
      
      // Extract file data and name from the passed fileData
      const { fileName, fileBuffer } = fileData
      const filePath = path.join(mediaPath, fileName)
      console.log('Saving file to:', filePath)
      
      // Check if fileBuffer is valid
      if (!fileBuffer || !Array.isArray(fileBuffer)) {
        console.error('Invalid file buffer received:', fileBuffer)
        return { 
          success: false, 
          error: 'Invalid file data received' 
        }
      }
      
      // Write the file to disk
      fs.writeFileSync(filePath, Buffer.from(fileBuffer))
      
      // Verify the file was written successfully
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath)
        console.log('File successfully written, size:', stats.size, 'bytes')
        
        // List the media directory contents after upload
        const updatedFiles = fs.readdirSync(mediaPath)
        console.log('Updated media directory contents:', updatedFiles)
        
        return { 
          success: true, 
          filePath: fileName,
          message: 'File uploaded successfully',
          fileSize: stats.size
        }
      } else {
        console.error('File was not written successfully')
        return { 
          success: false, 
          error: 'File was not saved properly' 
        }
      }
    } catch (error) {
      console.error('Error uploading media file:', error)
      return { 
        success: false, 
        error: error.message 
      }
    }
  })

  // Toggle presentation window visibility
  ipcMain.on('toggle-presentation', (event) => {
    if (presentationWindow && !presentationWindow.isDestroyed()) {
      if (presentationWindow.isVisible()) {
        presentationWindow.hide()
      } else {
        presentationWindow.show()
      }
    }
  })

  // Close presentation
  ipcMain.on('close-presentation', (event) => {
    if (presentationWindow && !presentationWindow.isDestroyed()) {
      presentationWindow.hide()
    }
  })

  // Get available displays
  ipcMain.handle('get-displays', async () => {
    try {
      const displays = screen.getAllDisplays()
      console.log('Available displays:', displays.length)
      const displayData = displays.map(display => ({
        id: display.id,
        label: display.label || `Display ${display.id}`,
        bounds: display.bounds,
        workArea: display.workArea,
        primary: display === screen.getPrimaryDisplay()
      }))
      return { success: true, data: displayData }
    } catch (error) {
      console.error('Error getting displays:', error)
      return { success: false, error: error.message }
    }
  })

  // Move presentation window to specified display
  ipcMain.handle('move-presentation-to-display', async (event, displayId) => {
    try {
      if (!presentationWindow || presentationWindow.isDestroyed()) {
        throw new Error('Presentation window is not available')
      }

      const displays = screen.getAllDisplays()
      const targetDisplay = displays.find(display => display.id === displayId)
      
      if (!targetDisplay) {
        throw new Error(`Display with ID ${displayId} not found`)
      }

      console.log(`Moving presentation window to display ${displayId}`)
      
      // Move window to the target display
      const { x, y, width, height } = targetDisplay.bounds
      presentationWindow.setBounds({ x, y, width, height })
      presentationWindow.setFullScreen(true)
      
      return { success: true, displayId, bounds: targetDisplay.bounds }
    } catch (error) {
      console.error('Error moving presentation window:', error)
      throw error
    }
  })

  // Toggle preview window visibility
  ipcMain.on('toggle-preview', (event) => {
    console.log('Toggle preview requested - creating preview functionality')
    // For now, just log - preview window functionality can be added later
  })

  // Close preview window
  ipcMain.on('close-preview', (event) => {
    console.log('Close preview requested')
    // For now, just log - preview window functionality can be added later
  })

  // Handle deleting media files
  ipcMain.handle('delete-media-file', async (event, filename) => {
    try {
      const fs = require('fs')
      const mediaPath = path.join(__dirname, '..', 'media', filename)
      
      console.log('🗑️ Attempting to delete media file:', filename)
      console.log('🗑️ Full file path:', mediaPath)
      
      // Check if the file exists
      if (fs.existsSync(mediaPath)) {
        // Delete the file
        fs.unlinkSync(mediaPath)
        
        // Verify deletion
        if (!fs.existsSync(mediaPath)) {
          console.log('✅ Media file deleted successfully:', filename)
          
          // List remaining files for confirmation
          const mediaDir = path.join(__dirname, '..', 'media')
          const remainingFiles = fs.readdirSync(mediaDir)
          console.log('📁 Remaining media files:', remainingFiles)
          
          return { 
            success: true, 
            message: `File "${filename}" deleted successfully`,
            remainingFiles: remainingFiles
          }
        } else {
          console.error('❌ File deletion failed:', filename)
          return { 
            success: false, 
            error: 'File deletion failed - file still exists' 
          }
        }
      } else {
        console.error('❌ File not found:', mediaPath)
        return { 
          success: false, 
          error: 'File not found' 
        }
      }
    } catch (error) {
      console.error('❌ Error deleting media file:', error)
      return { 
        success: false, 
        error: error.message 
      }
    }
  })
}

// App event handlers
app.whenReady().then(() => {
  initDatabase()
  createControlWindow()
  createPresentationWindow()
  setupIpcHandlers()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createControlWindow()
      createPresentationWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // if (db) {
    //   db.close()
    // }
    app.quit()
  }
})

app.on('before-quit', () => {
  // if (db) {
  //   db.close()
  // }
})

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (navigationEvent, navigationUrl) => {
    navigationEvent.preventDefault()
  })
})
