<template>
  <div class="song-panel">
    <div class="song-header">
      <h3>
        <i class="icon">🎵</i>
        Lagu
      </h3>
    </div>

    <!-- Auto load sa.csv on first use -->
    <div v-if="!hasSongData && !isLoading" class="auto-load">
      <button @click="loadSongFile" class="btn-load">
        📚 Muat Data Lagu
      </button>
      <p class="load-info">Klik untuk memuat data lagu dari sa.csv</p>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="loading">
      <div class="spinner"></div>
      <p>Memuat data lagu{{ loadingDots }}</p>
      <div v-if="loadingProgress > 0" class="loading-progress">
        <div class="progress-bar">
          <div class="progress-fill" :style="`width: ${loadingProgress}%`"></div>
        </div>
        <span class="progress-text">{{ Math.round(loadingProgress) }}%</span>
      </div>
    </div>

    <!-- Error State -->
    <div v-if="error && !isLoading && !hasSongData" class="error">
      <p>Error: {{ error }}</p>
      <button @click="loadSongFile" class="btn-retry">Coba Lagi</button>
    </div>

    <!-- Song Interface -->
    <div v-if="hasSongData" class="song-interface">
      <!-- Search -->
      <div class="form-group">
        <div class="search-header">
          <label>Cari Lagu:</label>
          <span v-if="isSearching" class="search-status">
            <span class="searching-spinner"></span>
            Mencari...
          </span>
          <span v-else-if="searchQuery" class="search-status">
            {{ searchResults.length }} hasil
          </span>
        </div>
        <div class="search-input-wrapper">
          <input 
            v-model="searchQuery"
            type="text"
            placeholder="Cari berdasarkan judul atau lirik..."
            @input="performSearch"
            class="search-input"
          >
          <button 
            v-if="searchQuery" 
            @click="searchQuery = ''; searchResults = [];" 
            class="clear-search-btn"
            title="Hapus pencarian"
          >
            ×
          </button>
        </div>
      </div>

      <!-- Song List -->
      <div class="song-list">
        <!-- No results message -->
        <div v-if="searchQuery && searchResults.length === 0" class="no-results">
          <p>Tidak ada lagu yang cocok dengan pencarian: "{{ searchQuery }}"</p>
          <button @click="searchQuery = ''" class="btn-clear-search">Hapus Pencarian</button>
        </div>
        
        <!-- Search results -->
        <div 
          v-for="song in displayedSongs" 
          :key="song.Nomor"
          class="song-item"
          :class="{ active: selectedSong?.Nomor === song.Nomor }"
          @click="selectSong(song)"
        >
          <div class="song-title">{{ song.Judul }}</div>
          <div class="song-meta">
            <span class="song-number">No. {{ song.Nomor }}</span>
          </div>
        </div>
      </div>

      <!-- Selected Song Detail -->
      <div v-if="selectedSong" class="song-detail">
        <div class="song-detail-header">
          <h4>{{ selectedSong.Judul }}</h4>
          <div class="song-actions">
            <button @click="selectForPresentation" class="btn-select">
              ✨ Tampilkan di Presentasi
            </button>
          </div>
        </div>
        
        <div class="song-meta-detail">
          <span class="meta-item">Nomor: {{ selectedSong.Nomor }}</span>
          <span class="keyboard-hint" title="Shortcut Keyboard">
            <span class="key">←→</span> Navigasi 
            <span v-if="processedSongData.hasRefrain" class="key">R</span>
            <span v-if="processedSongData.hasRefrain">Refrain</span>
          </span>
        </div>

        <div v-if="selectedSong.Lirik" class="song-content">
          <!-- Navigasi Verse -->
          <div v-if="processedSongData.verses.length > 0" class="verse-navigation">
            <button 
              @click="prevVerse" 
              class="nav-btn"
              :disabled="currentVerseIndex <= 0"
            >
              &lt; Prev
            </button>
            
            <div class="verse-indicator">
              <span class="verse-number-display">
                {{ currentVerseIndex + 1 }}/{{ processedSongData.verses.length }}
              </span>
              <span v-if="processedSongData.verses[currentVerseIndex]?.isRefrain" class="refrain-badge">
                REFF
              </span>
            </div>
            
            <button 
              @click="nextVerse" 
              class="nav-btn"
              :disabled="currentVerseIndex >= processedSongData.verses.length - 1"
            >
              Next &gt;
            </button>
            
            <button 
              v-if="processedSongData.hasRefrain"
              @click="showRefrain" 
              class="refrain-btn"
              :class="{ active: processedSongData.verses[currentVerseIndex]?.isRefrain }"
              title="Tampilkan Refrain (tekan tombol R)"
            >
              R
            </button>
          </div>
          
          <!-- Teks Verse Saat Ini -->
          <div v-if="processedSongData.verses.length > 0" class="current-verse">
            <div class="verse-text">{{ currentVerseText }}</div>
          </div>
          
          <!-- Tampilan Lirik Lengkap -->
          <div class="song-lyrics">
            <div 
              v-for="(line, index) in songLines" 
              :key="index"
              class="lyric-line"
              :class="{ 
                'verse-number': isVerseNumber(line),
                'refrain-marker': isRefrainMarker(line)
              }"
            >
              {{ line }}
            </div>
          </div>
        </div>
        
        <div v-else class="no-lyrics">
          <p>Lirik tidak tersedia</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { usePresentationStore } from '../../stores/presentationStore.js'

const presentationStore = usePresentationStore()

// Reactive data
const songData = ref([])
const selectedSong = ref(null)
const searchQuery = ref('')
const searchResults = ref([])
const isLoading = ref(false)
const isSearching = ref(false)
const error = ref(null)
const loadingProgress = ref(0)
const loadingDots = ref('...')
const currentVerseIndex = ref(0)
const processedLyrics = ref({ verses: [], hasRefrain: false, refrainIndex: -1 })

// Animation for loading dots
let dotsInterval
if (import.meta.env.SSR === false) { // Only in browser, not during SSR
  dotsInterval = setInterval(() => {
    loadingDots.value = loadingDots.value.length >= 3 ? '.' : loadingDots.value + '.'
  }, 500)
}

// Computed properties
const hasSongData = computed(() => songData.value.length > 0)

const displayedSongs = computed(() => {
  if (!hasSongData.value) return []
  
  // Tampilkan lagu saat ada pencarian (tanpa minimum karakter)
  if (searchQuery.value) {
    return searchResults.value.slice(0, 50) // Limit to 50 results for performance
  }
  
  // Tampilkan semua lagu jika tidak ada pencarian (dibatasi 100 untuk performa)
  return songData.value.slice(0, 100)
})

// Add keyboard event handler for the song detail section
const handleKeydown = (e) => {
  if (!selectedSong.value) return
  
  // Handle R key for refrain
  if (e.key === 'r' || e.key === 'R') {
    showRefrain()
  }
  
  // Handle arrow keys for navigation
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
    nextVerse()
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    prevVerse()
  }
}

const songLines = computed(() => {
  if (!selectedSong.value?.Lirik) return []
  
  try {
    // Split lyrics by newlines
    return selectedSong.value.Lirik
      .split('\n')
      .filter(line => line.trim() !== '')
  } catch (e) {
    console.error('Error processing song lines:', e)
    return []
  }
})

const processedSongData = computed(() => {
  if (!selectedSong.value?.Lirik) return { verses: [], hasRefrain: false, refrainIndex: -1 }
  
  try {
    const result = processLyrics(selectedSong.value.Lirik)
    processedLyrics.value = result
    return result
  } catch (e) {
    console.error('Error processing song structure:', e)
    return { verses: [], hasRefrain: false, refrainIndex: -1 }
  }
})

const currentVerseText = computed(() => {
  if (!processedSongData.value.verses.length) return ''
  
  const index = Math.min(currentVerseIndex.value, processedSongData.value.verses.length - 1)
  return processedSongData.value.verses[index]?.text || ''
})

// Helper functions
const isVerseNumber = (line) => {
  return /^\d+$/.test(line.trim())
}

const isRefrainMarker = (line) => {
  // Deteksi berbagai variasi kata 'refrain' atau 'reff'
  const refrainPattern = /^(reff?|refr?ain|chorus)(\s*:|\.)?$/i
  return refrainPattern.test(line.trim())
}

// Fungsi untuk memproses lirik dan mendeteksi struktur lagu
const processLyrics = (lyrics) => {
  if (!lyrics) return { verses: [], hasRefrain: false, refrainIndex: -1 }
  
  const lines = lyrics.split('\n').filter(line => line.trim() !== '')
  const verses = []
  let currentVerse = []
  let refrainIndex = -1
  let hasRefrain = false
  let isCurrentlyRefrain = false
  let currentVerseIndex = 0
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    
    // Deteksi apakah baris ini adalah marker refrain
    if (isRefrainMarker(line)) {
      // Simpan verse sebelumnya jika ada
      if (currentVerse.length > 0) {
        verses.push({
          text: currentVerse.join('\n'),
          isRefrain: isCurrentlyRefrain,
          index: currentVerseIndex++
        })
        currentVerse = []
      }
      
      isCurrentlyRefrain = true
      hasRefrain = true
      
      // Tidak menambahkan marker refrain ke dalam teks
      continue
    }
    
    // Deteksi apakah baris ini adalah angka verse
    if (isVerseNumber(line)) {
      // Simpan verse sebelumnya jika ada
      if (currentVerse.length > 0) {
        const verse = {
          text: currentVerse.join('\n'),
          isRefrain: isCurrentlyRefrain,
          index: currentVerseIndex++
        }
        verses.push(verse)
        
        // Catat index refrain pertama
        if (isCurrentlyRefrain && refrainIndex === -1) {
          refrainIndex = verses.length - 1
        }
        
        currentVerse = []
        isCurrentlyRefrain = false
      }
      
      // Tidak menambahkan angka verse ke dalam teks
      continue
    }
    
    // Baris normal, tambahkan ke verse saat ini
    currentVerse.push(line)
  }
  
  // Tambahkan verse terakhir jika ada
  if (currentVerse.length > 0) {
    const verse = {
      text: currentVerse.join('\n'),
      isRefrain: isCurrentlyRefrain,
      index: currentVerseIndex
    }
    verses.push(verse)
    
    // Catat index refrain jika verse terakhir adalah refrain
    if (isCurrentlyRefrain && refrainIndex === -1) {
      refrainIndex = verses.length - 1
    }
  }
  
  return { verses, hasRefrain, refrainIndex }
}

// Methods
const loadSongFile = async () => {
  try {
    isLoading.value = true
    error.value = null
    
    console.log('Loading sa.csv file...')
    
    // Load sa.csv from the project root
    const response = await fetch('/sa.csv')
    if (!response.ok) {
      throw new Error(`Failed to load sa.csv: ${response.status} ${response.statusText}`)
    }
    
    const csvText = await response.text()
    console.log('CSV loaded, parsing...')
    
    // Parse CSV efficiently
    const lines = csvText.split('\n')
    const songs = []
    const batchSize = 200 // Increased batch size for faster loading
    
    // Step 1: Find all song start positions first (run synchronously)
    console.log('Finding song boundaries...')
    const songStartLines = []
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]?.trim()
      if (!line) continue
      
      try {
        const parts = line.split(',')
        // Check if first part is a number and we have at least a title
        if (parts.length >= 2 && !isNaN(parts[0]) && parts[1].trim()) {
          songStartLines.push(i)
        }
      } catch (err) {
        // Skip problematic lines
      }
    }
    
    console.log(`Found ${songStartLines.length} songs`)
    
    // Step 2: Process songs in batches
    function processNextBatch(batchIndex) {
      const startIdx = batchIndex * batchSize
      const endIdx = Math.min(startIdx + batchSize, songStartLines.length)
      
      console.log(`Processing batch ${batchIndex + 1}, songs ${startIdx + 1}-${endIdx} of ${songStartLines.length}`)
      
      // Process each song in this batch
      for (let i = startIdx; i < endIdx; i++) {
        const songStartLine = songStartLines[i]
        const nextSongStartLine = i + 1 < songStartLines.length ? songStartLines[i + 1] : lines.length
        
        try {
          const headerLine = lines[songStartLine].trim()
          const parts = headerLine.split(',')
          
          if (parts.length >= 2) {
            const songNumber = parts[0].trim()
            let songTitle = parts[1].trim()
            
            // Handle title with commas that might be in quotes
            if (songTitle.startsWith('"') && !songTitle.endsWith('"')) {
              for (let j = 2; j < parts.length; j++) {
                songTitle += ',' + parts[j]
                if (parts[j].endsWith('"')) break
              }
            }
            
            // Clean title quotes
            songTitle = songTitle.replace(/^"|"$/g, '')
            
            // Get lyrics (all lines between this song and next song)
            let lyrics = ''
            for (let j = songStartLine + 1; j < nextSongStartLine; j++) {
              if (lines[j]?.trim()) {
                lyrics += (lyrics ? '\n' : '') + lines[j].trim()
              }
            }
            
            songs.push({
              Nomor: songNumber,
              Judul: songTitle,
              Lirik: lyrics
            })
          }
        } catch (err) {
          console.warn(`Error processing song at line ${songStartLine}:`, err)
        }
      }
      
      // Update progress
      loadingProgress.value = ((endIdx / songStartLines.length) * 100)
      
      // Continue to next batch or finish
      if (endIdx < songStartLines.length) {
        setTimeout(() => processNextBatch(batchIndex + 1), 0)
      } else {
        // All done!
        songData.value = songs
        console.log(`Song data loaded: ${songs.length} songs`)
        
        // Clear interval and finish loading
        if (dotsInterval) clearInterval(dotsInterval)
        loadingProgress.value = 100
        isLoading.value = false
      }
    }
    
    // Start batch processing with the first batch (index 0)
    if (songStartLines.length > 0) {
      processNextBatch(0)
    } else {
      console.warn('No songs found in CSV file')
      songData.value = []
      isLoading.value = false
      if (dotsInterval) clearInterval(dotsInterval)
    }
    
  } catch (err) {
    console.error('Error loading song data:', err)
    error.value = err.message
    isLoading.value = false
    if (dotsInterval) clearInterval(dotsInterval)
  }
}
  
const parseCSVLine = (line) => {
  const values = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  
  values.push(current.trim())
  return values
}

const selectSong = (song) => {
  selectedSong.value = song
  currentVerseIndex.value = 0
  console.log('Selected song:', song.Judul)
}

const selectForPresentation = (verseIndex = null) => {
  if (!selectedSong.value) return
  
  const song = selectedSong.value
  const title = song.Judul || 'Tanpa Judul'
  
  // Gunakan verse yang sudah diproses
  const { verses, hasRefrain, refrainIndex } = processedSongData.value
  
  // Jika tidak ada verse yang berhasil diproses, gunakan seluruh lirik
  if (!verses.length) {
    const lyrics = song.Lirik || ''
    presentationStore.setCurrentSlideContent({
      type: 'song',
      text: lyrics,
      metadata: `${title} (${song.Nomor})`,
      lines: [lyrics]
    })
    return
  }
  
  // Jika index verse disediakan, gunakan itu
  if (verseIndex !== null && verseIndex >= 0 && verseIndex < verses.length) {
    currentVerseIndex.value = verseIndex
  }
  
  // Ekstrak teks dari semua verse
  const allVerses = verses.map(verse => verse.text)
  
  // Gunakan verse saat ini
  const currentIndex = currentVerseIndex.value
  
  presentationStore.setCurrentSlideContent({
    type: 'song',
    text: verses[currentIndex].text,
    metadata: `${title} (${song.Nomor})${hasRefrain ? ' - R' : ''}`,
    lines: allVerses,
    currentIndex: currentIndex
  })
  
  console.log(`Song selected for presentation: ${title} - Verse ${currentIndex + 1}${verses[currentIndex].isRefrain ? ' (Refrain)' : ''}`)
}

// Fungsi untuk menampilkan refrain
const showRefrain = () => {
  const { refrainIndex } = processedSongData.value
  if (refrainIndex >= 0) {
    // Update the current verse index first (this changes the UI display)
    currentVerseIndex.value = refrainIndex
    
    // Then send to presentation
    selectForPresentation(refrainIndex)
    
    // Visual feedback by highlighting the button happens through CSS
    console.log('Showing refrain at index:', refrainIndex)
  } else {
    console.log('No refrain detected in this song')
  }
}

// Fungsi untuk navigasi verse
const nextVerse = () => {
  if (processedSongData.value.verses.length > currentVerseIndex.value + 1) {
    currentVerseIndex.value++
    selectForPresentation()
  }
}

const prevVerse = () => {
  if (currentVerseIndex.value > 0) {
    currentVerseIndex.value--
    selectForPresentation()
  }
}

const performSearch = () => {
  if (!searchQuery.value) {
    searchResults.value = []
    return
  }
  
  console.log(`Searching for: ${searchQuery.value}`)
  
  // Show loading indicator for large dataset
  if (songData.value.length > 1000) {
    isSearching.value = true
  }
  
  // Use setTimeout to avoid blocking the UI
  setTimeout(() => {
    const query = searchQuery.value.toLowerCase()
    const results = songData.value.filter(song => {
      if (!song) return false
      
      const title = (song.Judul || '').toLowerCase()
      const lyrics = (song.Lirik || '').toLowerCase()
      const number = song.Nomor ? String(song.Nomor) : ''
      
      // Check number first (exact match) - fastest check
      if (number === query) return true
      
      // Check title next - faster than checking all lyrics
      if (title.includes(query)) return true
      
      // Check lyrics last - most expensive operation
      return lyrics.includes(query)
    })
    
    searchResults.value = results
    isSearching.value = false
    
    console.log(`Found ${results.length} songs matching "${query}"`)
  }, 0)
}

// Watch for search query changes
watch(searchQuery, () => {
  performSearch()
})

// Auto-load songs on mount
onMounted(() => {
  if (!hasSongData.value && !isLoading.value) {
    setTimeout(() => {
      loadSongFile()
    }, 1000)
  }
  
  // Add keyboard event listener for song navigation
  window.addEventListener('keydown', handleKeydown)
})

// Clean up event listeners
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  if (dotsInterval) clearInterval(dotsInterval)
})
</script>

<style scoped>
.song-panel {
  padding: 20px;
  background: #1a1a1a;
  color: #ffffff;
  height: 100%;
  overflow-y: auto;
}

.song-header h3 {
  margin: 0 0 20px 0;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 18px;
}

.icon {
  font-size: 20px;
}

/* Auto Load Section */
.auto-load {
  text-align: center;
  padding: 40px 20px;
}

.btn-load {
  background: #4a9eff;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.3s;
  margin-bottom: 10px;
}

.btn-load:hover {
  background: #3a8eef;
}

.load-info {
  color: #ccc;
  font-size: 14px;
  margin: 0;
}

/* Loading and Error States */
.loading {
  text-align: center;
  padding: 40px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #333;
  border-top: 4px solid #4a9eff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-progress {
  margin-top: 15px;
  width: 100%;
  max-width: 300px;
  margin-left: auto;
  margin-right: auto;
}

.progress-bar {
  height: 8px;
  background: #333;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 5px;
}

.progress-fill {
  height: 100%;
  background: #4a9eff;
  transition: width 0.3s ease-in-out;
}

.progress-text {
  font-size: 12px;
  color: #ccc;
}

.error {
  background: #ff4444;
  color: white;
  padding: 15px;
  border-radius: 6px;
  text-align: center;
}

.btn-retry {
  background: white;
  color: #ff4444;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 10px;
}

/* Song Interface */
.song-interface {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-weight: 600;
  color: #ccc;
  font-size: 14px;
}

.search-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
}

.search-status {
  font-size: 12px;
  color: #ccc;
  display: flex;
  align-items: center;
  gap: 5px;
}

.searching-spinner {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid #ccc;
  border-top-color: #4a9eff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.search-input-wrapper {
  position: relative;
  width: 100%;
}

.search-input {
  width: 100%;
  padding: 10px 12px;
  background: #2a2a2a;
  border: 1px solid #555;
  border-radius: 6px;
  color: #ffffff;
  font-size: 14px;
}

.search-input:focus {
  outline: none;
  border-color: #4a9eff;
  box-shadow: 0 0 0 2px rgba(74, 158, 255, 0.2);
}

.clear-search-btn {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #888;
  font-size: 18px;
  cursor: pointer;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.clear-search-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.search-prompt {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 30px 15px;
  text-align: center;
  color: #aaa;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
}

.search-icon {
  font-size: 24px;
  margin-bottom: 10px;
  opacity: 0.7;
}

.search-prompt p {
  margin: 0 0 10px 0;
  font-size: 14px;
}

.search-prompt small {
  color: #777;
  font-size: 12px;
}

.no-results {
  padding: 25px 15px;
  text-align: center;
  color: #ff9800;
  background: rgba(255, 152, 0, 0.1);
  border-radius: 6px;
}

.no-results p {
  margin: 0 0 15px 0;
}

.btn-clear-search {
  background: rgba(255, 152, 0, 0.2);
  border: 1px solid rgba(255, 152, 0, 0.3);
  color: #ff9800;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}

.btn-clear-search:hover {
  background: rgba(255, 152, 0, 0.3);
}

/* Song List */
.song-list {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #333;
  border-radius: 6px;
}

.song-item {
  padding: 12px 16px;
  border-bottom: 1px solid #333;
  cursor: pointer;
  transition: background-color 0.3s;
}

.song-item:hover {
  background: #2a2a2a;
}

.song-item.active {
  background: #4a9eff;
  color: white;
}

.song-item:last-child {
  border-bottom: none;
}

.song-title {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 4px;
}

.song-meta {
  display: flex;
  gap: 15px;
  font-size: 12px;
  color: #888;
}

.song-item.active .song-meta {
  color: rgba(255, 255, 255, 0.8);
}

/* Song Detail */
.song-detail {
  background: #2a2a2a;
  padding: 20px;
  border-radius: 8px;
  border-left: 4px solid #4a9eff;
}

.song-detail-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 15px;
  flex-wrap: wrap;
  gap: 10px;
}

.song-detail-header h4 {
  margin: 0;
  color: #4a9eff;
  font-size: 18px;
}

.song-actions {
  display: flex;
  gap: 10px;
}

.btn-select {
  background: #28a745;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s;
}

.btn-select:hover {
  background: #218838;
}

.song-meta-detail {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  margin-bottom: 15px;
  font-size: 13px;
  color: #ccc;
}

.meta-item {
  background: rgba(74, 158, 255, 0.1);
  padding: 4px 8px;
  border-radius: 12px;
  border: 1px solid rgba(74, 158, 255, 0.3);
}

.keyboard-hint {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #aaa;
  background: rgba(255, 255, 255, 0.05);
  padding: 3px 8px;
  border-radius: 4px;
}

.key {
  background: #333;
  border: 1px solid #555;
  border-radius: 3px;
  padding: 0px 4px;
  font-family: monospace;
  margin: 0 2px;
  box-shadow: 0 1px 0 rgba(255,255,255,0.1);
}

/* Song Lyrics */
.song-lyrics {
  max-height: 300px;
  overflow-y: auto;
  line-height: 1.6;
  font-size: 14px;
  padding: 10px;
  background: #222;
  border-radius: 4px;
}

.lyric-line {
  padding: 2px 0;
  color: #fff;
}

.verse-number {
  font-weight: bold;
  color: #4a9eff;
  margin-top: 10px;
  margin-bottom: 5px;
}

.no-lyrics {
  text-align: center;
  color: #888;
  font-style: italic;
  padding: 20px;
}

/* Refrain and Navigation Styling */
.song-content {
  max-height: 300px;
  overflow-y: auto;
  line-height: 1.6;
  font-size: 14px;
  padding: 10px;
  background: #222;
  border-radius: 4px;
}

/* Verse Navigation Styling */
.verse-navigation {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  background: #333;
  padding: 8px 12px;
  border-radius: 6px;
}

.nav-btn {
  background: #2a2a2a;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  transition: background-color 0.2s;
}

.nav-btn:hover:not(:disabled) {
  background: #3a3a3a;
}

.nav-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.verse-indicator {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.verse-number-display {
  font-size: 14px;
  color: #ccc;
}

.refrain-badge {
  background: #ff9800;
  color: #000;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 10px;
  font-weight: bold;
}

.refrain-btn {
  background: #ff9800;
  color: #000;
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  font-weight: bold;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.refrain-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 0 8px rgba(255, 152, 0, 0.6);
}

.refrain-btn.active {
  background: #ffb74d;
  box-shadow: 0 0 12px rgba(255, 152, 0, 0.8);
}

.current-verse {
  background: rgba(74, 158, 255, 0.1);
  border: 1px solid rgba(74, 158, 255, 0.3);
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 15px;
}

.verse-text {
  white-space: pre-line;
  line-height: 1.5;
}

.refrain-marker {
  font-weight: bold;
  color: #ff9800;
  margin-top: 10px;
  margin-bottom: 5px;
}

/* Scrollbar styling */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: #1a1a1a;
}

::-webkit-scrollbar-thumb {
  background: #555;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #777;
}
</style>
