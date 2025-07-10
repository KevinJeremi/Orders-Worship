import { defineStore } from 'pinia'

export const usePresentationStore = defineStore('presentation', {
  state: () => ({
    // Current slide content being displayed
    currentSlideContent: {
      type: 'song', // 'song' | 'bible' | 'media' | 'blank'
      text: '',
      metadata: '', // Song title, Bible reference, etc.
      lines: [] // Array of text lines for songs/verses
    },
    
    // Background settings
    currentBackground: {
      type: 'color', // 'color' | 'image' | 'video'
      value: '#1a1a2e', // Color code, file path, or video path
      opacity: 1.0
    },
    
    // Theme settings for text display
    currentTheme: {
      fontFamily: 'Segoe UI, Roboto, Arial, sans-serif',
      fontSize: 64, // Increased default size for better projector visibility
      color: '#FFFFFF',
      textAlign: 'center',
      textShadow: '3px 3px 10px rgba(0,0,0,0.95)', // Enhanced shadow for better contrast
      lineHeight: 1.4,
      padding: 60,
      fontWeight: '600',
      letterSpacing: '0.5px'
    },
    
    // Library data
    songLibrary: [
      {
        id: 1,
        title: 'Amazing Grace',
        artist: 'John Newton',
        lyrics: [
          'Amazing grace, how sweet the sound',
          'That saved a wretch like me',
          'I once was lost, but now am found',
          'Was blind, but now I see'
        ]
      },
      {
        id: 2,
        title: 'How Great Thou Art',
        artist: 'Carl Boberg',
        lyrics: [
          'O Lord my God, when I in awesome wonder',
          'Consider all the worlds thy hands have made',
          'I see the stars, I hear the rolling thunder',
          'Thy power throughout the universe displayed'
        ]
      },
      {
        id: 3,
        title: 'Holy, Holy, Holy',
        artist: 'Reginald Heber',
        lyrics: [
          'Holy, holy, holy! Lord God Almighty!',
          'Early in the morning our song shall rise to thee',
          'Holy, holy, holy! Merciful and mighty!',
          'God in three persons, blessed Trinity!'
        ]
      }
    ],
    
    // Current selections
    selectedSong: null,
    selectedBibleVerse: null,
    selectedMedia: null,
    
    // Presentation state
    isPresenting: false,
    currentLineIndex: 0,
    
    // New features
    transitionType: 'fade', // 'fade', 'slide-left', 'slide-right', 'slide-up'
    showProgress: true,
    lastContentBeforeBlank: null
  }),
  
  getters: {
    // Get current song data
    getCurrentSong: (state) => {
      return state.selectedSong ? 
        state.songLibrary.find(song => song.id === state.selectedSong) : 
        null
    },
    
    // Get current line being displayed
    getCurrentLine: (state) => {
      if (state.currentSlideContent.lines.length > 0 && 
          state.currentLineIndex < state.currentSlideContent.lines.length) {
        return state.currentSlideContent.lines[state.currentLineIndex]
      }
      return ''
    },
    
    // Get formatted theme CSS
    getThemeCSS: (state) => {
      return {
        fontFamily: state.currentTheme.fontFamily,
        fontSize: `${state.currentTheme.fontSize}px`,
        color: state.currentTheme.color,
        textAlign: state.currentTheme.textAlign,
        textShadow: state.currentTheme.textShadow,
        lineHeight: state.currentTheme.lineHeight,
        padding: `${state.currentTheme.padding}px`,
        fontWeight: state.currentTheme.fontWeight,
        letterSpacing: state.currentTheme.letterSpacing
      }
    },
    
    // Get background CSS
    getBackgroundCSS: (state) => {
      const bg = state.currentBackground
      switch (bg.type) {
        case 'color':
          return {
            backgroundColor: bg.value,
            backgroundImage: 'none'
          }
        case 'image':
          return {
            backgroundImage: `url("${bg.value}")`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }
        case 'video':
          return {
            backgroundColor: '#000000'
          }
        default:
          return {
            backgroundColor: '#000000'
          }
      }
    },
    
    // Get progress
    getProgress: (state) => {
      if (state.currentSlideContent.lines.length <= 1) return 100
      return Math.round((state.currentLineIndex + 1) / state.currentSlideContent.lines.length * 100)
    }
  },
  
  actions: {
    // Update current slide content
    updateSlideContent(content) {
      this.currentSlideContent = { ...this.currentSlideContent, ...content }
    },

    // Set current slide content directly (for Bible verses and other content)
    setCurrentSlideContent(content) {
      this.currentSlideContent = {
        type: content.type || 'text',
        text: content.text || '',
        metadata: content.metadata || content.reference || '',
        lines: content.lines || [content.text || '']
      }
      this.currentLineIndex = 0
      
      // Clear previous selections when setting new content
      if (content.type === 'bible') {
        this.selectedSong = null
        this.selectedBibleVerse = content
      } else if (content.type === 'song') {
        this.selectedBibleVerse = null
      }
    },
    
    // Select and display a song
    selectSong(songId, lineIndex = 0) {
      this.selectedSong = songId
      const song = this.songLibrary.find(s => s.id === songId)
      
      if (song) {
        this.updateSlideContent({
          type: 'song',
          text: song.lyrics[lineIndex] || '',
          metadata: `${song.title} - ${song.artist}`,
          lines: song.lyrics
        })
        this.currentLineIndex = lineIndex
      }
    },
    
    // Navigate to next line
    nextLine() {
      if (this.currentLineIndex < this.currentSlideContent.lines.length - 1) {
        this.currentLineIndex++
        this.updateSlideContent({
          text: this.currentSlideContent.lines[this.currentLineIndex]
        })
        return true
      }
      return false
    },
    
    // Navigate to previous line
    previousLine() {
      if (this.currentLineIndex > 0) {
        this.currentLineIndex--
        this.updateSlideContent({
          text: this.currentSlideContent.lines[this.currentLineIndex]
        })
        return true
      }
      return false
    },
    
    // Jump to specific line
    goToLine(index) {
      if (index >= 0 && index < this.currentSlideContent.lines.length) {
        this.currentLineIndex = index
        this.updateSlideContent({
          text: this.currentSlideContent.lines[index]
        })
      }
    },
    
    // Set Bible verse
    setBibleVerse(verse) {
      this.selectedBibleVerse = verse
      this.updateSlideContent({
        type: 'bible',
        text: verse.text,
        metadata: `${verse.book} ${verse.chapter}:${verse.verse}`,
        lines: [verse.text]
      })
      this.currentLineIndex = 0
    },
    
    // Update background
    setBackground(background) {
      this.currentBackground = { ...this.currentBackground, ...background }
    },
    
    // Update theme
    updateTheme(theme) {
      console.log('Store: Updating theme with:', JSON.stringify(theme));
      console.log('Store: Previous text alignment was:', this.currentTheme.textAlign);
      console.log('Store: Previous font size was:', this.currentTheme.fontSize);
      
      // Ensure fontSize is a number if provided
      const processedTheme = { ...theme };
      if (processedTheme.fontSize !== undefined) {
        processedTheme.fontSize = Number(processedTheme.fontSize);
      }
      
      // Create a new object to ensure reactivity
      this.currentTheme = { ...this.currentTheme, ...processedTheme };
      
      console.log('Store: Updated text alignment is now:', this.currentTheme.textAlign);
      console.log('Store: Updated font size is now:', this.currentTheme.fontSize);
      
      // If in Electron environment, send theme update to the main process
      try {
        if (window.electronAPI && window.electronAPI.updatePresentation) {
          // Cek apakah objek dapat dicloning dengan JSON
          const jsonSafe = {
            fontFamily: this.currentTheme.fontFamily || 'Segoe UI, Roboto, Arial, sans-serif',
            fontSize: Number(this.currentTheme.fontSize || 48),
            color: this.currentTheme.color || '#FFFFFF',
            textAlign: this.currentTheme.textAlign || 'center',
            textShadow: this.currentTheme.textShadow || '3px 3px 10px rgba(0,0,0,0.95)',
            lineHeight: Number(this.currentTheme.lineHeight || 1.4),
            padding: Number(this.currentTheme.padding || 60),
            fontWeight: this.currentTheme.fontWeight || '600',
            letterSpacing: this.currentTheme.letterSpacing || '0.5px'
          };
          
          // Gunakan setTimeout untuk mengisolasi pemanggilan asinkron, menghindari error kloningnya
          setTimeout(() => {
            try {
              window.electronAPI.updatePresentation({ theme: jsonSafe });
              console.log('Theme update sent to Electron successfully');
            } catch (ipcError) {
              console.error('Failed to send theme update to Electron:', ipcError);
            }
          }, 0);
        }
      } catch (error) {
        console.error('Error in updateTheme trying to access Electron API:', error);
      }
    },
    
    // Specialized method for font size updates
    setFontSize(size) {
      console.log('Store: Setting font size to:', size);
      
      // Ensure size is a number
      const fontSize = Number(size);
      
      // Update the theme with just the font size
      this.currentTheme = { 
        ...this.currentTheme, 
        fontSize 
      };
      
      // If in Electron environment, send theme update to the main process
      try {
        if (window.electronAPI && window.electronAPI.updatePresentation) {
          // Create a safe object for IPC
          const safeTheme = {
            fontFamily: this.currentTheme.fontFamily || 'Segoe UI, Roboto, Arial, sans-serif',
            fontSize: fontSize,
            color: this.currentTheme.color || '#FFFFFF',
            textAlign: this.currentTheme.textAlign || 'center',
            textShadow: this.currentTheme.textShadow || '3px 3px 10px rgba(0,0,0,0.95)',
            lineHeight: Number(this.currentTheme.lineHeight || 1.4),
            padding: Number(this.currentTheme.padding || 60),
            fontWeight: this.currentTheme.fontWeight || '600',
            letterSpacing: this.currentTheme.letterSpacing || '0.5px'
          };
          
          // Use setTimeout to isolate async call
          setTimeout(() => {
            try {
              window.electronAPI.updatePresentation({ theme: safeTheme });
            } catch (error) {
              console.error('Error sending font size update to Electron:', error);
            }
          }, 0);
        }
      } catch (error) {
        console.error('Error preparing font size update for Electron:', error);
      }
      
      // Update CSS variables for immediate UI feedback
      document.documentElement.style.setProperty('--font-size', `${fontSize}px`);
      document.documentElement.style.setProperty('--global-font-size', `${fontSize}px`);
      
      console.log('Store: Font size updated to:', fontSize);
    },
    
    // Set media
    async setMedia(mediaFile) {
      this.selectedMedia = mediaFile
      const isVideo = /\.(mp4|webm|mov)$/i.test(mediaFile)
      console.log('🎬 setMedia called with:', mediaFile)
      console.log('🎬 isVideo:', isVideo)

      let filePath = mediaFile
      // Jika bukan video dan path tidak diawali /media/, tambahkan prefix
      if (!isVideo) {
        if (filePath && !filePath.startsWith('/media/') && !filePath.startsWith('http') && !filePath.startsWith('/')) {
          filePath = '/media/' + filePath
        }
        this.setBackground({
          type: 'image',
          value: filePath
        })
      } else {
        // Untuk video, gunakan path apa adanya
        this.setBackground({
          type: 'video',
          value: filePath
        })
      }
    },
    
    // Toggle blank screen
    toggleBlank() {
      if (this.currentSlideContent.type === 'blank') {
        // Restore previous content if available
        if (this.lastContentBeforeBlank) {
          this.currentSlideContent = this.lastContentBeforeBlank
          this.lastContentBeforeBlank = null
        }
      } else {
        // Store current content and show blank
        this.lastContentBeforeBlank = { ...this.currentSlideContent }
        this.updateSlideContent({
          type: 'blank',
          text: '',
          metadata: '',
          lines: []
        })
      }
    },
    
    // Clear current display
    clearDisplay() {
      this.updateSlideContent({
        type: 'blank',
        text: '',
        metadata: '',
        lines: []
      })
      this.currentLineIndex = 0
    },
    
    // Set transition type
    setTransition(type) {
      this.transitionType = type
    },
    
    // Toggle presentation mode
    togglePresentation() {
      this.isPresenting = !this.isPresenting
    },
    
    // Toggle progress display
    toggleProgressDisplay() {
      this.showProgress = !this.showProgress
    },
    
    // Force sync of display settings to the presentation window
    syncDisplaySettings() {
      // Create a temporary reactive change to trigger watchers
      const currentTheme = JSON.parse(JSON.stringify(this.currentTheme));
      
      // Ensure the textAlign property is included
      if (!currentTheme.textAlign) {
        currentTheme.textAlign = 'center'; // Default if missing
      }
      
      // Force a reactive update by creating a new object reference
      this.currentTheme = { ...currentTheme };
      
      // If we have content, also refresh it to ensure formatting is applied
      if (this.currentSlideContent && this.currentSlideContent.text) {
        const currentContent = JSON.parse(JSON.stringify(this.currentSlideContent));
        this.currentSlideContent = { ...currentContent };
      }
      
      console.log("Display settings synced. Current text alignment:", this.currentTheme.textAlign);
    },
  }
})
