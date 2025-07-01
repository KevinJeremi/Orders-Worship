<script setup>
import { ref, reactive, onMounted } from 'vue'
import { usePresentationStore } from '../../stores/presentationStore.js'
import songData from '../../lib/songs.json'

const store = usePresentationStore()
const activeTab = ref('songs')
const songFilter = ref('')
const filteredSongs = ref([])

onMounted(() => {
  // Initialize the song library from the JSON file only if not already set
  if (!store.songLibrary || store.songLibrary.length === 0) {
    // Use direct assignment instead of $patch to avoid reactivity loops
    store.songLibrary = [...songData]
  }
  filteredSongs.value = store.songLibrary || songData
})

// Bible search form
const bibleSearch = reactive({
  book: '',
  chapter: '',
  verse: '',
  results: [],
  isSearching: false
})

const switchTab = (tab) => {
  activeTab.value = tab
}

const filterSongs = () => {
  const searchTerm = songFilter.value.toLowerCase().trim()
  if (!searchTerm) {
    filteredSongs.value = store.songLibrary
    return
  }
  
  filteredSongs.value = store.songLibrary.filter(song => {
    return song.title.toLowerCase().includes(searchTerm) || 
           song.artist.toLowerCase().includes(searchTerm)
  })
}

const selectSong = (song) => {
  // REFACTORED: Only update store, let ControlWindow handle IPC
  store.selectSong(song.id)
}

const searchBible = async () => {
  if (!window.electronAPI) {
    console.warn('Electron API not available')
    return
  }

  bibleSearch.isSearching = true
  
  try {
    const query = {
      book: bibleSearch.book.trim(),
      chapter: bibleSearch.chapter ? parseInt(bibleSearch.chapter) : null,
      verse: bibleSearch.verse ? parseInt(bibleSearch.verse) : null
    }

    const result = await window.electronAPI.searchBible(query)
    
    if (result.success) {
      bibleSearch.results = result.data
    } else {
      console.error('Bible search failed:', result.error)
      bibleSearch.results = []
    }
  } catch (error) {
    console.error('Bible search error:', error)
    bibleSearch.results = []
  } finally {
    bibleSearch.isSearching = false
  }
}

const selectBibleVerse = (verse) => {
  // REFACTORED: Only update store, let ControlWindow handle IPC
  store.setBibleVerse(verse)
}
</script>

<template>
  <div class="library-panel">
    <header class="panel-header">
      <div class="tabs">
        <button 
          class="tab-button" 
          :class="{ active: activeTab === 'songs' }"
          @click="switchTab('songs')"
        >
          Songs
        </button>
        <button 
          class="tab-button" 
          :class="{ active: activeTab === 'bible' }"
          @click="switchTab('bible')"
        >
          Bible
        </button>
      </div>
    </header>

    <div class="panel-content">
      <!-- Songs Tab -->
      <div v-if="activeTab === 'songs'" class="tab-content">
        <div class="search-box">
          <input 
            v-model="songFilter"
            type="text" 
            placeholder="Search songs..." 
            class="search-input"
            @input="filterSongs"
          />
        </div>
        
        <div class="song-list">
          <div 
            v-for="song in filteredSongs" 
            :key="song.id"
            class="song-item"
            :class="{ selected: store.selectedSong === song.id }"
            @click="selectSong(song)"
          >
            <div class="song-title">{{ song.title }}</div>
            <div class="song-artist">{{ song.artist }}</div>
          </div>
        </div>
      </div>

      <!-- Bible Tab -->
      <div v-if="activeTab === 'bible'" class="tab-content">
        <div class="bible-search">
          <div class="search-form">
            <div class="form-group">
              <label>Book</label>
              <input 
                v-model="bibleSearch.book"
                type="text" 
                placeholder="e.g., Genesis, John"
                class="form-input"
                @keyup.enter="searchBible"
              />
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label>Chapter</label>
                <input 
                  v-model="bibleSearch.chapter"
                  type="number" 
                  placeholder="1"
                  class="form-input"
                  @keyup.enter="searchBible"
                />
              </div>
              
              <div class="form-group">
                <label>Verse</label>
                <input 
                  v-model="bibleSearch.verse"
                  type="number" 
                  placeholder="1"
                  class="form-input"
                  @keyup.enter="searchBible"
                />
              </div>
            </div>
            
            <button 
              class="btn btn-primary search-btn"
              @click="searchBible"
              :disabled="bibleSearch.isSearching"
            >
              {{ bibleSearch.isSearching ? 'Searching...' : 'Search' }}
            </button>
          </div>

          <div class="bible-results">
            <div v-if="bibleSearch.results.length === 0 && !bibleSearch.isSearching" class="no-results">
              Enter search criteria and click Search
            </div>
            
            <div 
              v-for="verse in bibleSearch.results" 
              :key="`${verse.book}-${verse.chapter}-${verse.verse}`"
              class="bible-verse"
              @click="selectBibleVerse(verse)"
            >
              <div class="verse-reference">
                {{ verse.book }} {{ verse.chapter }}:{{ verse.verse }}
              </div>
              <div class="verse-text">{{ verse.text }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.library-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.panel-header {
  padding: 16px;
  border-bottom: 1px solid #3a3a3a;
}

.tabs {
  display: flex;
  gap: 4px;
}

.tab-button {
  flex: 1;
  padding: 8px 12px;
  border: none;
  background-color: #3a3a3a;
  color: #cccccc;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-button:hover {
  background-color: #4a4a4a;
}

.tab-button.active {
  background-color: #007acc;
  color: white;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
}

.tab-content {
  padding: 16px;
}

/* Song list styles */
.search-box {
  margin-bottom: 16px;
}

.search-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #3a3a3a;
  border-radius: 4px;
  background-color: #2a2a2a;
  color: #ffffff;
  font-size: 14px;
}

.search-input:focus {
  outline: none;
  border-color: #007acc;
}

.song-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.song-item {
  padding: 12px;
  border-radius: 6px;
  background-color: #2a2a2a;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
}

.song-item:hover {
  background-color: #3a3a3a;
}

.song-item.selected {
  border-color: #007acc;
  background-color: rgba(0, 122, 204, 0.1);
}

.song-title {
  font-weight: 600;
  color: #ffffff;
  margin-bottom: 4px;
}

.song-artist {
  font-size: 12px;
  color: #cccccc;
}

/* Bible search styles */
.bible-search {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.search-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.form-group label {
  font-size: 12px;
  color: #cccccc;
  font-weight: 500;
}

.form-input {
  padding: 6px 8px;
  border: 1px solid #3a3a3a;
  border-radius: 4px;
  background-color: #2a2a2a;
  color: #ffffff;
  font-size: 13px;
}

.form-input:focus {
  outline: none;
  border-color: #007acc;
}

.search-btn {
  margin-top: 8px;
}

.bible-results {
  max-height: 400px;
  overflow-y: auto;
}

.no-results {
  text-align: center;
  color: #666666;
  font-style: italic;
  padding: 20px;
}

.bible-verse {
  padding: 12px;
  border-radius: 6px;
  background-color: #2a2a2a;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 8px;
}

.bible-verse:hover {
  background-color: #3a3a3a;
}

.verse-reference {
  font-weight: 600;
  color: #007acc;
  margin-bottom: 6px;
  font-size: 13px;
}

.verse-text {
  color: #ffffff;
  font-size: 14px;
  line-height: 1.4;
}
</style>
