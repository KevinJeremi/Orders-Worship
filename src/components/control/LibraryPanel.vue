<script setup>
import { ref } from 'vue'
import SimpleBiblePanel from './SimpleBiblePanel.vue'
import SongPanel from './SongPanel.vue'

const activeTab = ref('songs')

const switchTab = (tab) => {
  activeTab.value = tab
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
        <SongPanel />
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

/* No longer needed - styling moved to SongPanel component */
</style>
