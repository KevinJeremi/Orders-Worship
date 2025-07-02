<template>
  <div class="bible-panel">
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
      <p>Memuat data Alkitab...</p>
    </div>

    <!-- Error State -->
    <div v-if="error" class="error">
      <p>Error: {{ error }}</p>
      <button @click="loadTBFile" class="btn-retry">Coba Lagi</button>
    </div>

    <!-- Bible Selection Interface -->
    <div v-if="hasBibleData" class="bible-interface">
      <!-- Book Selection -->
      <div class="form-group">
        <label>Pilih Kitab:</label>
        <select v-model="selectedBookName" @change="onBookChange" class="form-select">
          <option value="">-- Pilih Kitab --</option>
          <option v-for="book in availableBooks" :key="book" :value="book">
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
        <div class="verse-reference">
          {{ selectedBookName }} {{ selectedChapter }}:{{ selectedVerseNum }}
        </div>
        <div class="verse-text">
          {{ currentVerse.firman }}
        </div>
        <button @click="selectForPresentation" class="btn-select">
          ✨ Tampilkan di Presentasi
        </button>
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
import { ref, computed } from 'vue'
import { usePresentationStore } from '../../stores/presentationStore.js'

const presentationStore = usePresentationStore()

// Reactive data
const bibleData = ref([])
const selectedBookName = ref('')
const selectedChapter = ref('')
const selectedVerseNum = ref('')
const searchQuery = ref('')
const searchResults = ref([])
const isLoading = ref(false)
const error = ref(null)

// Computed properties
const hasBibleData = computed(() => bibleData.value.length > 0)

const availableBooks = computed(() => {
  if (!hasBibleData.value) return []
  const books = [...new Set(bibleData.value.map(v => v.kitab))]
  return books.sort()
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
    
    // Parse CSV
    const lines = csvText.split('\n')
    const verses = []
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue
      
      // Simple CSV parsing - split by comma but handle quotes
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
    }
    
    bibleData.value = verses
    console.log(`Bible data loaded: ${verses.length} verses from ${availableBooks.value.length} books`)
    
  } catch (err) {
    console.error('Error loading Bible data:', err)
    error.value = err.message
  } finally {
    isLoading.value = false
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

const onBookChange = () => {
  selectedChapter.value = ''
  selectedVerseNum.value = ''
}

const onChapterChange = () => {
  selectedVerseNum.value = ''
}

const onVerseChange = () => {
  // Verse is already selected, currentVerse will be computed
}

const selectForPresentation = () => {
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
  
  console.log('Bible verse selected for presentation:', reference)
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
  selectedBookName.value = result.kitab
  selectedChapter.value = result.pasal
  selectedVerseNum.value = result.ayat
  searchQuery.value = ''
  searchResults.value = []
}

const truncateText = (text, maxLength) => {
  if (!text || text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}
</script>

<style scoped>
.bible-panel {
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

.form-select {
  padding: 10px 12px;
  background: #2a2a2a;
  border: 1px solid #555;
  border-radius: 6px;
  color: #ffffff;
  font-size: 14px;
  cursor: pointer;
}

.form-select:focus {
  outline: none;
  border-color: #4a9eff;
}

/* Verse Display */
.verse-display {
  background: #2a2a2a;
  padding: 20px;
  border-radius: 8px;
  border-left: 4px solid #4a9eff;
}

.verse-reference {
  font-weight: bold;
  color: #4a9eff;
  margin-bottom: 10px;
  font-size: 14px;
}

.verse-text {
  font-size: 16px;
  line-height: 1.6;
  margin-bottom: 15px;
  color: #fff;
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
}

.btn-select:hover {
  background: #218838;
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