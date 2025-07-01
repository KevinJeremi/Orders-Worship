const { app, BrowserWindow, ipcMain, screen } = require('electron')
const path = require('path')
const Database = require('better-sqlite3')

// Global references to prevent garbage collection
let controlWindow
let presentationWindow
let previewWindow
let db

const isDev = process.env.NODE_ENV === 'development'

// Database initialization
function initDatabase() {
  try {
    // In production, this would be the actual Bible database path
    const dbPath = path.join(__dirname, '..', 'src', 'database', 'bible.sqlite')
    
    // For now, we'll create a simple in-memory database for demonstration
    db = new Database(':memory:')
    
    // Create a simple Bible table structure
    db.exec(`
      CREATE TABLE IF NOT EXISTS bible (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        book TEXT NOT NULL,
        chapter INTEGER NOT NULL,
        verse INTEGER NOT NULL,
        text TEXT NOT NULL
      )
    `)
    
    // Insert some sample data
    const insert = db.prepare(`
      INSERT INTO bible (book, chapter, verse, text) 
      VALUES (?, ?, ?, ?)
    `)
    
    // Sample verses
    insert.run('Genesis', 1, 1, 'In the beginning God created the heavens and the earth.')
    insert.run('John', 3, 16, 'For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.')
    insert.run('Psalms', 23, 1, 'The Lord is my shepherd, I lack nothing.')
    
    console.log('Database initialized successfully')
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

// Create the preview window (live preview for presentation)
function createPreviewWindow() {
  previewWindow = new BrowserWindow({
    width: 800,
    height: 600,
    title: 'Live Preview',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    },
    parent: controlWindow, // Make it a child of control window
    modal: false,
    resizable: true,
    minimizable: true,
    maximizable: true
  })

  // Load the same app but with preview parameter
  if (isDev) {
    previewWindow.loadURL('http://localhost:5173?window=preview')
    previewWindow.webContents.openDevTools()
  } else {
    previewWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }

  previewWindow.on('closed', () => {
    previewWindow = null
  })

  // Hide preview window initially
  previewWindow.hide()
}

// IPC Handlers for communication between windows
function setupIpcHandlers() {
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
  
  // Handle presentation updates from control window
  ipcMain.on('update-presentation', (event, data) => {
    console.log('📡 Main process received update-presentation with data:', data)
    
    // Send to presentation window
    if (presentationWindow && !presentationWindow.isDestroyed()) {
      console.log('📤 Sending update-display to presentation window')
      presentationWindow.webContents.send('update-display', data)
      presentationWindow.show() // Show presentation window when content is sent
      console.log('✅ Update sent to presentation window successfully')
    } else {
      console.warn('⚠️ Presentation window not available or destroyed')
    }
    
    // Send to preview window
    if (previewWindow && !previewWindow.isDestroyed()) {
      console.log('📤 Sending update-display to preview window')
      previewWindow.webContents.send('update-display', data)
      console.log('✅ Update sent to preview window successfully')
    }
  })

  // Toggle preview window visibility
  ipcMain.on('toggle-preview', (event) => {
    if (previewWindow && !previewWindow.isDestroyed()) {
      if (previewWindow.isVisible()) {
        previewWindow.hide()
        console.log('🔸 Preview window hidden')
      } else {
        previewWindow.show()
        console.log('🔹 Preview window shown')
      }
    } else {
      console.log('🔹 Creating new preview window')
      createPreviewWindow()
      previewWindow.show()
    }
  })

  // Close preview window
  ipcMain.on('close-preview', (event) => {
    if (previewWindow && !previewWindow.isDestroyed()) {
      previewWindow.hide()
      console.log('🔸 Preview window closed')
    }
  })

  // Handle Bible search requests
  ipcMain.handle('search-bible', async (event, query) => {
    try {
      if (!db) {
        throw new Error('Database not initialized')
      }

      const { book, chapter, verse } = query
      let sql = 'SELECT * FROM bible WHERE 1=1'
      const params = []

      if (book) {
        sql += ' AND book LIKE ?'
        params.push(`%${book}%`)
      }
      if (chapter) {
        sql += ' AND chapter = ?'
        params.push(chapter)
      }
      if (verse) {
        sql += ' AND verse = ?'
        params.push(verse)
      }

      sql += ' ORDER BY book, chapter, verse'

      const stmt = db.prepare(sql)
      const results = stmt.all(...params)
      
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

  // Handle getting media path
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
}

// App event handlers
app.whenReady().then(() => {
  // Setup IPC handlers first before creating windows
  setupIpcHandlers()
  
  initDatabase()
  createControlWindow()
  createPresentationWindow()
  createPreviewWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createControlWindow()
      createPresentationWindow()
      createPreviewWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (db) {
      db.close()
    }
    app.quit()
  }
})

app.on('before-quit', () => {
  if (db) {
    db.close()
  }
})

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (navigationEvent, navigationUrl) => {
    navigationEvent.preventDefault()
  })
})
