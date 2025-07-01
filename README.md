# Worship Presentation Application

A cross-platform desktop application for controlling worship presentations built with Electron, Vue 3, Vite, and Pinia.

## Features

- **Dual-Window System**: Control window for the operator and presentation window for the audience
- **Multi-Display Support**: Automatically detects and uses a second display for presentations
- **Content Management**:
  - Song lyrics display with line-by-line navigation
  - Bible verse lookup and display
  - Media background support (images and videos)
- **Presentation Styling**: Customize fonts, colors, and text alignment
- **Responsive UI**: Clean and intuitive interface for the worship leader or tech operator

## Tech Stack

- **Electron**: Cross-platform desktop application framework
- **Vue 3**: Frontend framework with Composition API
- **Vite**: Fast build tool and development server
- **Pinia**: State management
- **better-sqlite3**: Bible database integration

## Project Structure

```
orders-worship/
├── electron/                 # Electron main process files
│   ├── main.js               # Main process entry point
│   └── preload.js            # Preload script for secure IPC
├── src/                      # Vue application source
│   ├── assets/               # Static assets
│   ├── components/           # Vue components
│   │   ├── control/          # Control window components
│   │   └── presentation/     # Presentation window components
│   ├── database/             # SQLite database files
│   ├── layouts/              # Layout components
│   ├── lib/                  # Utility functions and data
│   └── stores/               # Pinia store modules
├── media/                    # Media files for backgrounds
└── dist/                     # Built application
```

## Development

### Prerequisites

- Node.js 16+
- npm or yarn

### Setup

```bash
# Install dependencies
npm install

# Run development server with hot reload
npm run dev

# Run Electron with Vite dev server
npm run dev:electron

# Build for production
npm run build

# Package the app
npm run dist
```

## Using the Application

1. **Control Window**: Main interface for selecting content and controlling the presentation

   - Left panel: Select songs and Bible verses
   - Center panel: Preview and control current content
   - Right panel: Select media and customize display settings

2. **Presentation Window**: Displays the selected content on a secondary screen
   - Automatically enters fullscreen mode on the secondary display
   - Shows current song lyrics, Bible verses, or media backgrounds

## License

MIT
