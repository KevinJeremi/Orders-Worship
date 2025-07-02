// Bible Data Management System
// Handles CSV import and Bible verse management

import { ref, reactive, computed } from 'vue'

// Bible data store
export const bibleStore = reactive({
  books: [],
  verses: [],
  currentBook: null,
  currentChapter: null,
  currentVerse: null,
  searchResults: [],
  isLoading: false,
  error: null
})

// Bible book names in Indonesian
export const bibleBooks = {
  old_testament: [
    { id: 'gen', name: 'Kejadian', chapters: 50 },
    { id: 'exo', name: 'Keluaran', chapters: 40 },
    { id: 'lev', name: 'Imamat', chapters: 27 },
    { id: 'num', name: 'Bilangan', chapters: 36 },
    { id: 'deu', name: 'Ulangan', chapters: 34 },
    { id: 'jos', name: 'Yosua', chapters: 24 },
    { id: 'jdg', name: 'Hakim-hakim', chapters: 21 },
    { id: 'rut', name: 'Rut', chapters: 4 },
    { id: '1sa', name: '1 Samuel', chapters: 31 },
    { id: '2sa', name: '2 Samuel', chapters: 24 },
    { id: '1ki', name: '1 Raja-raja', chapters: 22 },
    { id: '2ki', name: '2 Raja-raja', chapters: 25 },
    { id: '1ch', name: '1 Tawarikh', chapters: 29 },
    { id: '2ch', name: '2 Tawarikh', chapters: 36 },
    { id: 'ezr', name: 'Ezra', chapters: 10 },
    { id: 'neh', name: 'Nehemia', chapters: 13 },
    { id: 'est', name: 'Ester', chapters: 10 },
    { id: 'job', name: 'Ayub', chapters: 42 },
    { id: 'psa', name: 'Mazmur', chapters: 150 },
    { id: 'pro', name: 'Amsal', chapters: 31 },
    { id: 'ecc', name: 'Pengkhotbah', chapters: 12 },
    { id: 'sng', name: 'Kidung Agung', chapters: 8 },
    { id: 'isa', name: 'Yesaya', chapters: 66 },
    { id: 'jer', name: 'Yeremia', chapters: 52 },
    { id: 'lam', name: 'Ratapan', chapters: 5 },
    { id: 'eze', name: 'Yehezkiel', chapters: 48 },
    { id: 'dan', name: 'Daniel', chapters: 12 },
    { id: 'hos', name: 'Hosea', chapters: 14 },
    { id: 'joe', name: 'Yoel', chapters: 3 },
    { id: 'amo', name: 'Amos', chapters: 9 },
    { id: 'oba', name: 'Obaja', chapters: 1 },
    { id: 'jon', name: 'Yunus', chapters: 4 },
    { id: 'mic', name: 'Mikha', chapters: 7 },
    { id: 'nah', name: 'Nahum', chapters: 3 },
    { id: 'hab', name: 'Habakuk', chapters: 3 },
    { id: 'zep', name: 'Zefanya', chapters: 3 },
    { id: 'hag', name: 'Hagai', chapters: 2 },
    { id: 'zec', name: 'Zakharia', chapters: 14 },
    { id: 'mal', name: 'Maleakhi', chapters: 4 }
  ],
  new_testament: [
    { id: 'mat', name: 'Matius', chapters: 28 },
    { id: 'mar', name: 'Markus', chapters: 16 },
    { id: 'luk', name: 'Lukas', chapters: 24 },
    { id: 'joh', name: 'Yohanes', chapters: 21 },
    { id: 'act', name: 'Kisah Para Rasul', chapters: 28 },
    { id: 'rom', name: 'Roma', chapters: 16 },
    { id: '1co', name: '1 Korintus', chapters: 16 },
    { id: '2co', name: '2 Korintus', chapters: 13 },
    { id: 'gal', name: 'Galatia', chapters: 6 },
    { id: 'eph', name: 'Efesus', chapters: 6 },
    { id: 'phi', name: 'Filipi', chapters: 4 },
    { id: 'col', name: 'Kolose', chapters: 4 },
    { id: '1th', name: '1 Tesalonika', chapters: 5 },
    { id: '2th', name: '2 Tesalonika', chapters: 3 },
    { id: '1ti', name: '1 Timotius', chapters: 6 },
    { id: '2ti', name: '2 Timotius', chapters: 4 },
    { id: 'tit', name: 'Titus', chapters: 3 },
    { id: 'phm', name: 'Filemon', chapters: 1 },
    { id: 'heb', name: 'Ibrani', chapters: 13 },
    { id: 'jas', name: 'Yakobus', chapters: 5 },
    { id: '1pe', name: '1 Petrus', chapters: 5 },
    { id: '2pe', name: '2 Petrus', chapters: 3 },
    { id: '1jo', name: '1 Yohanes', chapters: 5 },
    { id: '2jo', name: '2 Yohanes', chapters: 1 },
    { id: '3jo', name: '3 Yohanes', chapters: 1 },
    { id: 'jud', name: 'Yudas', chapters: 1 },
    { id: 'rev', name: 'Wahyu', chapters: 22 }
  ]
}

// Get all books as flat array
export const getAllBooks = () => {
  return [...bibleBooks.old_testament, ...bibleBooks.new_testament]
}

// CSV Parser for Bible data
export const parseBibleCSV = (csvText) => {
  const lines = csvText.split('\n')
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
  const verses = []
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    
    // Parse CSV with proper quote handling
    const values = parseCSVLine(line)
    
    if (values.length >= headers.length) {
      const verse = {}
      headers.forEach((header, index) => {
        verse[header] = values[index] || ''
      })
      verses.push(verse)
    }
  }
  
  return verses
}

// Helper function to parse CSV line with quote handling
const parseCSVLine = (line) => {
  const values = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Double quote - add single quote to current value
        current += '"'
        i++ // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      // End of value
      values.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  
  // Add last value
  values.push(current.trim())
  
  return values
}

// Load Bible data from CSV
export const loadBibleFromCSV = async (csvData) => {
  try {
    bibleStore.isLoading = true
    bibleStore.error = null
    
    const verses = parseBibleCSV(csvData)
    bibleStore.verses = verses
    
    // Group verses by books
    const bookGroups = {}
    verses.forEach(verse => {
      // Get book identifier from various possible column names
      const bookName = verse.book_id || verse.book || verse.kitab
      if (!bookGroups[bookName]) {
        bookGroups[bookName] = []
      }
      bookGroups[bookName].push(verse)
    })
    
    bibleStore.books = Object.keys(bookGroups).map(bookName => {
      // Try to find matching book info by name (Indonesian names)
      let bookInfo = getAllBooks().find(b => b.name === bookName)
      
      // If not found by name, try by ID
      if (!bookInfo) {
        bookInfo = getAllBooks().find(b => b.id === bookName.toLowerCase())
      }
      
      // If still not found, create a basic book info
      if (!bookInfo) {
        bookInfo = {
          id: bookName.toLowerCase().replace(/[^a-z0-9]/g, ''),
          name: bookName,
          chapters: Math.max(...bookGroups[bookName].map(v => parseInt(v.chapter || v.pasal || 1)))
        }
      }
      
      return {
        id: bookInfo.id,
        name: bookInfo.name,
        verses: bookGroups[bookName],
        chapters: Math.max(...bookGroups[bookName].map(v => parseInt(v.chapter || v.pasal || 1)))
      }
    })
    
    console.log('Bible data loaded:', bibleStore.books.length, 'books,', verses.length, 'verses')
    
  } catch (error) {
    console.error('Error loading Bible data:', error)
    bibleStore.error = error.message
  } finally {
    bibleStore.isLoading = false
  }
}

// Search verses
export const searchVerses = (query) => {
  if (!query || query.length < 2) {
    bibleStore.searchResults = []
    return []
  }
  
  const searchTerm = query.toLowerCase()
  const results = bibleStore.verses.filter(verse => {
    // Get text from various possible column names (including 'firman')
    const text = (verse.text || verse.ayat || verse.isi || verse.firman || '').toLowerCase()
    // Get book name from various possible column names
    const bookName = verse.book_id || verse.book || verse.kitab || ''
    // Get chapter and verse numbers
    const chapter = verse.chapter || verse.pasal || ''
    const verseNum = verse.verse || verse.ayat_no || verse.verse_number || verse.ayat || ''
    const reference = `${bookName} ${chapter}:${verseNum}`.toLowerCase()
    
    return text.includes(searchTerm) || reference.includes(searchTerm)
  })
  
  bibleStore.searchResults = results.slice(0, 50) // Limit to 50 results
  return bibleStore.searchResults
}

// Get verses by book and chapter
export const getVersesByChapter = (bookId, chapter) => {
  return bibleStore.verses.filter(verse => {
    // Get book identifier from various possible column names
    const vBookId = verse.book_id || verse.book || verse.kitab
    const vChapter = parseInt(verse.chapter || verse.pasal || 1)
    
    // Match by book name or book ID
    const matchesBook = vBookId === bookId || vBookId.toLowerCase() === bookId.toLowerCase()
    return matchesBook && vChapter === parseInt(chapter)
  })
}

// Get single verse
export const getVerse = (bookId, chapter, verseNum) => {
  return bibleStore.verses.find(verse => {
    const vBookId = verse.book_id || verse.book || verse.kitab
    const vChapter = parseInt(verse.chapter || verse.pasal || 1)
    const vVerse = parseInt(verse.verse || verse.ayat_no || verse.verse_number || verse.ayat || 1)
    
    // Match by book name or book ID
    const matchesBook = vBookId === bookId || vBookId.toLowerCase() === bookId.toLowerCase()
    return matchesBook && vChapter === parseInt(chapter) && vVerse === parseInt(verseNum)
  })
}

// Format verse for display
export const formatVerseForDisplay = (verse, includeReference = true) => {
  if (!verse) return ''
  
  // Get text from various possible column names including 'firman'
  const text = verse.text || verse.ayat || verse.isi || verse.firman || ''
  
  if (!includeReference) {
    return text
  }
  
  // Get book name from verse data
  const bookName = verse.book_id || verse.book || verse.kitab || ''
  const chapter = verse.chapter || verse.pasal || 1
  const verseNum = verse.verse || verse.ayat_no || verse.verse_number || verse.ayat || 1
  
  return {
    text: text,
    reference: `${bookName} ${chapter}:${verseNum}`,
    metadata: `${bookName} ${chapter}:${verseNum}`
  }
}

// Export for use in other components
export default {
  bibleStore,
  bibleBooks,
  getAllBooks,
  loadBibleFromCSV,
  searchVerses,
  getVersesByChapter,
  getVerse,
  formatVerseForDisplay
}
