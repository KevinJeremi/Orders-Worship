<script setup>
import { ref, reactive, onMounted } from 'vue'
import { usePresentationStore } from '../../stores/presentationStore.js'
import songData from '../../lib/songs.json'
import SimpleBiblePanel from './SimpleBiblePanel.vue'

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
      <div v-if="activeTab === 'bible'" class="tab-content bible-tab">
        <SimpleBiblePanel />
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

/* Special styling for Bible tab */
.bible-tab {
  padding: 0; /* Let SimpleBiblePanel handle its own padding */
  height: calc(100vh - 120px); /* Adjust height for better scrolling */
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
</style>
