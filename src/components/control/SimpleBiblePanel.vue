<template>
  <div class="simple-bible-panel">
    <div class="bible-header">
      <h3>
        <i class="icon">📖</i>
        Alkitab
      </h3>
    </div>

    <!-- Auto load tb.csv on first use -->
    <div v-if="!hasBibleData && !isLoading" class="auto-load">
      <button @click="loadTBFile" class="btn-load">
        📚 Muat Data Alkitab (TB)
      </button>
      <p class="load-info">Klik untuk memuat Alkitab Terjemahan Baru</p>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="loading">
      <div class="spinner"></div>
      <p>Memuat data Alkitab{{ loadingDots }}</p>
      <div v-if="loadingProgress > 0" class="loading-progress">
        <div class="progress-bar">
          <div class="progress-fill" :style="`width: ${loadingProgress}%`"></div>
        </div>
        <span class="progress-text">{{ Math.round(loadingProgress) }}%</span>
      </div>
    </div>

    <!-- Error State -->
    <div v-if="error && !isLoading && !hasBibleData" class="error">
      <p>Error: {{ error }}</p>
      <button @click="loadTBFile" class="btn-retry">Coba Lagi</button>
    </div>

    <!-- Bible Selection Interface -->
    <div v-if="hasBibleData" class="bible-interface">
      <!-- Testament Selection -->
      <div class="form-group">
        <label>Pilih Perjanjian:</label>
        <select v-model="selectedTestament" @change="onTestamentChange" class="form-select">
          <option value="">-- Pilih Perjanjian --</option>
          <option value="old">Perjanjian Lama</option>
          <option value="new">Perjanjian Baru</option>
        </select>
      </div>

      <!-- Book Selection -->
      <div v-if="selectedTestament" class="form-group">
        <label>Pilih Kitab:</label>
        <select v-model="selectedBookName" @change="onBookChange" class="form-select">
          <option value="">-- Pilih Kitab --</option>
          <option v-for="book in filteredBooks" :key="book" :value="book">
            {{ book }}
          </option>
        </select>
      </div>

      <!-- Chapter Selection -->
      <div v-if="selectedBookName" class="form-group">
        <label>Pilih Pasal:</label>
        <select v-model="selectedChapter" @change="onChapterChange" class="form-select">
          <option value="">-- Pilih Pasal --</option>
          <option v-for="chapter in availableChapters" :key="chapter" :value="chapter">
            Pasal {{ chapter }}
          </option>
        </select>
      </div>

      <!-- Verse Selection -->
      <div v-if="selectedChapter" class="form-group">
        <label>Pilih Ayat:</label>
        <select v-model="selectedVerseNum" @change="onVerseChange" class="form-select">
          <option value="">-- Pilih Ayat --</option>
          <option v-for="verse in availableVerses" :key="verse.ayat" :value="verse.ayat">
            Ayat {{ verse.ayat }}
          </option>
        </select>
      </div>

      <!-- Selected Verse Display -->
      <div v-if="currentVerse" class="verse-display">
        <div class="verse-header">
          <div class="verse-reference">
            {{ selectedBookName }} {{ selectedChapter }}:{{ selectedVerseNum }}
          </div>
          <div class="auto-preview-indicator">
            <span class="preview-dot"></span>
            Live Preview
          </div>
        </div>
        <div class="verse-text">
          {{ currentVerse.firman }}
        </div>
        <div class="verse-actions">
          <button @click="selectForPresentation" class="btn-select">
            ✨ Tampilkan di Presentasi
          </button>
          <small class="auto-info">* Ayat otomatis tampil di preview saat dipilih</small>
        </div>
      </div>

      <!-- Quick Search -->
      <div class="quick-search">
        <label>Cari Ayat:</label>
        <input 
          v-model="searchQuery"
          type="text"
          placeholder="Ketik kata kunci..."
          @input="performSearch"
          class="search-input"
        >
        
        <div v-if="searchResults.length > 0" class="search-results">
          <div class="results-header">{{ searchResults.length }} hasil ditemukan:</div>
          <div 
            v-for="result in searchResults.slice(0, 10)" 
            :key="`${result.kitab}-${result.pasal}-${result.ayat}`"
            class="search-result"
            @click="selectSearchResult(result)"
          >
            <div class="result-ref">{{ result.kitab }} {{ result.pasal }}:{{ result.ayat }}</div>
            <div class="result-text">{{ truncateText(result.firman, 80) }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { usePresentationStore } from '../../stores/presentationStore.js'

const presentationStore = usePresentationStore()

// Simple reactive data
const bibleData = ref([])
const selectedTestament = ref('')
const selectedBookName = ref('')
const selectedChapter = ref('')
const selectedVerseNum = ref('')
const searchQuery = ref('')
const searchResults = ref([])
const isLoading = ref(false)
const error = ref(null)
const loadingProgress = ref(0)
const loadingDots = ref('...')

// Animation for loading dots
let dotsInterval
if (import.meta.env.SSR === false) { // Only in browser, not during SSR
  dotsInterval = setInterval(() => {
    loadingDots.value = loadingDots.value.length >= 3 ? '.' : loadingDots.value + '.'
  }, 500)
}

// Bible book categorization
const oldTestamentBooks = [
  'Kejadian', 'Keluaran', 'Imamat', 'Bilangan', 'Ulangana',
  'Yosua', 'Hakim-Hakim', 'Rut', '1 Samuel', '2 Samuel',
  '1 Raja-Raja', '2 Raja-Raja', '1 Tawarikh', '2 Tawarikh',
  'Ezra', 'Nehemia', 'Ester', 'Ayub', 'Mazmur', 'Amsal',
  'Pengkhotbah', 'Kidung Agung', 'Yesaya', 'Yeremia', 'Ratapan',
  'Yehezkiel', 'Daniel', 'Hosea', 'Yoel', 'Amos', 'Obaja',
  'Yunus', 'Mikha', 'Nahum', 'Habakuk', 'Zefanya', 'Hagai',
  'Zakharia', 'Maleakhi'
]

const newTestamentBooks = [
  'Matius', 'Markus', 'Lukas', 'Yohanes', 'Kisah Para Rasul',
  'Roma', '1 Korintus', '2 Korintus', 'Galatia', 'Efesus',
  'Filipi', 'Kolose', '1 Tesalonika', '2 Tesalonika', '1 Timotius',
  '2 Timotius', 'Titus', 'Filemon', 'Ibrani', 'Yakobus',
  '1 Petrus', '2 Petrus', '1 Yohanes', '2 Yohanes', '3 Yohanes',
  'Yudas', 'Wahyu'
]

// Computed properties
const hasBibleData = computed(() => bibleData.value.length > 0)

const availableBooks = computed(() => {
  if (!hasBibleData.value) return []
  const books = [...new Set(bibleData.value.map(v => v.kitab))]
  return books.sort()
})

const filteredBooks = computed(() => {
  if (!selectedTestament.value) return []
  
  const booksInTestament = selectedTestament.value === 'old' 
    ? oldTestamentBooks 
    : newTestamentBooks
  
  return availableBooks.value
    .filter(book => booksInTestament.includes(book))
    .sort((a, b) => {
      // Sort by order in testament
      const aIndex = booksInTestament.indexOf(a)
      const bIndex = booksInTestament.indexOf(b)
      return aIndex - bIndex
    })
})

const availableChapters = computed(() => {
  if (!selectedBookName.value) return []
  const chapters = [...new Set(
    bibleData.value
      .filter(v => v.kitab === selectedBookName.value)
      .map(v => parseInt(v.pasal))
  )]
  return chapters.sort((a, b) => a - b)
})

const availableVerses = computed(() => {
  if (!selectedBookName.value || !selectedChapter.value) return []
  return bibleData.value
    .filter(v => v.kitab === selectedBookName.value && parseInt(v.pasal) === parseInt(selectedChapter.value))
    .sort((a, b) => parseInt(a.ayat) - parseInt(b.ayat))
})

const currentVerse = computed(() => {
  if (!selectedBookName.value || !selectedChapter.value || !selectedVerseNum.value) return null
  return bibleData.value.find(v => 
    v.kitab === selectedBookName.value && 
    parseInt(v.pasal) === parseInt(selectedChapter.value) && 
    parseInt(v.ayat) === parseInt(selectedVerseNum.value)
  )
})

// Methods
const loadTBFile = async () => {
  try {
    isLoading.value = true
    error.value = null
    
    console.log('Loading tb.csv file...')
    
    // Load tb.csv from the project root
    const response = await fetch('/tb.csv')
    if (!response.ok) {
      throw new Error(`Failed to load tb.csv: ${response.status} ${response.statusText}`)
    }
    
    const csvText = await response.text()
    console.log('CSV loaded, parsing...')
    
    // Parse CSV more efficiently
    const lines = csvText.split('\n')
    const verses = []
    const batchSize = 1000
    let currentBatch = 0
    
    // Use batching to avoid UI freezing
    const processBatch = () => {
      console.log(`Processing batch ${currentBatch + 1}...`)
      const startIdx = 1 + (currentBatch * batchSize)
      const endIdx = Math.min(startIdx + batchSize, lines.length)
      
      for (let i = startIdx; i < endIdx; i++) {
        const line = lines[i]?.trim()
        if (!line) continue
        
        // Simple CSV parsing - split by comma but handle quotes
        try {
          const values = parseCSVLine(line)
          
          if (values.length >= 5) {
            verses.push({
              id: values[0],
              kitab: values[1],
              pasal: values[2],
              ayat: values[3],
              firman: values[4].replace(/^"(.*)"$/, '$1') // Remove surrounding quotes
            })
          }
        } catch (err) {
          console.warn(`Error parsing line ${i}:`, err)
          // Continue with next line
        }
      }
      
      currentBatch++
      
      // Calculate and update progress
      const totalLines = lines.length - 1 // Excluding header line
      const processedLines = Math.min((currentBatch * batchSize), totalLines)
      loadingProgress.value = (processedLines / totalLines) * 100
      
      // Update UI to show progress
      if (startIdx + batchSize < lines.length) {
        setTimeout(processBatch, 0) // Continue with next batch in next event loop
      } else {
        // Finished parsing
        bibleData.value = verses
        console.log(`Bible data loaded: ${verses.length} verses from ${availableBooks.value.length} books`)
        
        // Clear intervals and finish loading
        if (dotsInterval) clearInterval(dotsInterval)
        loadingProgress.value = 100
        isLoading.value = false
      }
    }
    
    // Start processing in batches
    processBatch()
    
    // The bibleData assignment now happens in the processBatch function
    // when all batches are complete
    
  } catch (err) {
    console.error('Error loading Bible data:', err)
    error.value = err.message
    isLoading.value = false
  }
  // Finally block removed as isLoading is now set in the processBatch function
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

const onTestamentChange = () => {
  selectedBookName.value = ''
  selectedChapter.value = ''
  selectedVerseNum.value = ''
}

const onBookChange = () => {
  selectedChapter.value = ''
  selectedVerseNum.value = ''
}

const onChapterChange = () => {
  selectedVerseNum.value = ''
}

const onVerseChange = () => {
  // Auto-preview when verse is selected
  if (currentVerse.value) {
    updatePreview()
  }
}

const updatePreview = () => {
  if (!currentVerse.value) return
  
  const verse = currentVerse.value
  const reference = `${verse.kitab} ${verse.pasal}:${verse.ayat}`
  
  presentationStore.setCurrentSlideContent({
    type: 'bible',
    text: verse.firman,
    metadata: reference,
    reference: reference,
    lines: [verse.firman]
  })
}

const selectForPresentation = () => {
  if (!currentVerse.value) return
  
  updatePreview()
  console.log('Bible verse selected for presentation:', `${currentVerse.value.kitab} ${currentVerse.value.pasal}:${currentVerse.value.ayat}`)
}

const performSearch = () => {
  if (!searchQuery.value || searchQuery.value.length < 2) {
    searchResults.value = []
    return
  }
  
  const query = searchQuery.value.toLowerCase()
  const results = bibleData.value.filter(verse => {
    const text = verse.firman.toLowerCase()
    const reference = `${verse.kitab} ${verse.pasal}:${verse.ayat}`.toLowerCase()
    return text.includes(query) || reference.includes(query)
  })
  
  searchResults.value = results.slice(0, 20) // Limit to 20 results
}

const selectSearchResult = (result) => {
  // Determine which testament the book belongs to
  const testament = oldTestamentBooks.includes(result.kitab) ? 'old' : 'new'
  
  selectedTestament.value = testament
  selectedBookName.value = result.kitab
  selectedChapter.value = result.pasal
  selectedVerseNum.value = result.ayat
  searchQuery.value = ''
  searchResults.value = []
  
  // Auto-preview the selected verse
  setTimeout(() => {
    if (currentVerse.value) {
      updatePreview()
    }
  }, 100)
}

const truncateText = (text, maxLength) => {
  if (!text || text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

// Watch for verse changes to auto-update preview
watch(currentVerse, (newVerse) => {
  if (newVerse) {
    updatePreview()
  }
}, { immediate: false })

// Auto-load on component mount
import { onMounted } from 'vue'

onMounted(() => {
  // Auto-load Bible data if not already loaded
  if (!hasBibleData.value && !isLoading.value) {
    setTimeout(() => {
      loadTBFile()
    }, 1000) // Slight delay to allow UI to render first
  }
})
</script>

<style scoped>
.simple-bible-panel {
  padding: 20px;
  background: #1a1a1a;
  color: #ffffff;
  height: 100%;
  overflow-y: auto;
}

.bible-header h3 {
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

/* Bible Interface */
.bible-interface {
  display: flex;
  flex-direction: column;
  gap: 15px;
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

.form-select {
  padding: 10px 12px;
  background: #2a2a2a;
  border: 1px solid #555;
  border-radius: 6px;
  color: #ffffff;
  font-size: 14px;
  cursor: pointer;
  transition: border-color 0.3s;
}

.form-select:focus {
  outline: none;
  border-color: #4a9eff;
  box-shadow: 0 0 0 2px rgba(74, 158, 255, 0.2);
}

.form-select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Verse Display */
.verse-display {
  background: #2a2a2a;
  padding: 20px;
  border-radius: 8px;
  border-left: 4px solid #4a9eff;
}

.verse-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 15px;
  flex-wrap: wrap;
  gap: 10px;
}

.verse-reference {
  font-weight: bold;
  color: #4a9eff;
  font-size: 16px;
}

.auto-preview-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #28a745;
  background: rgba(40, 167, 69, 0.1);
  padding: 4px 8px;
  border-radius: 12px;
  border: 1px solid rgba(40, 167, 69, 0.3);
}

.preview-dot {
  width: 8px;
  height: 8px;
  background: #28a745;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}

.verse-text {
  font-size: 16px;
  line-height: 1.6;
  margin-bottom: 15px;
  color: #fff;
}

.verse-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.btn-select {
  background: #28a745;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s;
  align-self: flex-start;
}

.btn-select:hover {
  background: #218838;
}

.auto-info {
  color: #888;
  font-size: 11px;
  font-style: italic;
}

/* Quick Search */
.quick-search {
  border-top: 1px solid #333;
  padding-top: 20px;
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
}

.search-results {
  margin-top: 15px;
  max-height: 300px;
  overflow-y: auto;
}

.results-header {
  font-size: 12px;
  color: #888;
  margin-bottom: 10px;
}

.search-result {
  background: #2a2a2a;
  padding: 10px;
  margin-bottom: 6px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.search-result:hover {
  background: #3a3a3a;
}

.result-ref {
  font-weight: bold;
  color: #4a9eff;
  font-size: 12px;
  margin-bottom: 4px;
}

.result-text {
  font-size: 13px;
  color: #ddd;
  line-height: 1.4;
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
