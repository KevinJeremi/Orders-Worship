# 🎵 Worship Presentation App

A modern, cross-platform worship presentation application built with **Electron**, **Vue.js 3**, and **Vite**. Perfect for churches, worship teams, and religious gatherings to display songs, Bible verses, and media content with professional presentation capabilities.

![App Preview](https://img.shields.io/badge/Status-Active-brightgreen)
![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)

## ✨ Features

### 🎬 **Presentation Control**
- **Multi-display support** - Project to external displays/projectors
- **Live preview window** - See exactly what audience sees
- **Instant display toggle** - Show/hide presentation with one click
- **Blank screen mode** - Quickly hide content during transitions

### 📖 **Content Management**
- **Song lyrics display** - Clean, readable text formatting
- **Bible verse search** - Quick scripture lookup and display
- **Custom text content** - Add announcements or custom messages
- **Line-by-line navigation** - Control verse/chorus progression

### 🖼️ **Media & Backgrounds**
- **Image backgrounds** - Upload and use custom background images
- **Video backgrounds** - Support for MP4, WebM, MOV files
- **Color backgrounds** - Solid colors with gradient effects
- **Media management** - Upload, preview, delete media files
- **Secure file handling** - No browser security restrictions

### 🎨 **Theme Customization**
- **Font controls** - Family, size, color, alignment
- **Text styling** - Shadows, line height, letter spacing
- **Quick presets** - Default, Bold, Elegant themes
- **Live preview** - See changes instantly before presenting
- **Responsive text** - Auto-scaling for different screen sizes

### 🖥️ **User Interface**
- **Compact tabbed layout** - Efficient use of screen space
- **Responsive design** - Works on different screen sizes
- **Dark theme** - Easy on the eyes during services
- **Intuitive controls** - Simple, church-friendly interface

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ 
- **npm** or **yarn**
- **Git**

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/Orders_Worship.git
   cd Orders_Worship
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev:electron
   ```

   Or start components separately:
   ```bash
   # Start Vite dev server
   npm run dev
   
   # Start Electron (in another terminal)
   npm run electron
   ```

## 📦 Build & Distribution

### Development Build
```bash
npm run build
```

### Production Package
```bash
# Package for current platform
npm run dist

# Package for specific platforms
npm run dist:win    # Windows
npm run dist:mac    # macOS
npm run dist:linux  # Linux
```

## 🏗️ Project Structure

```
Orders_Worship/
├── electron/                 # Electron main process
│   ├── main.cjs             # Main electron process
│   └── preload.cjs          # Preload script (IPC bridge)
├── src/
│   ├── components/
│   │   ├── control/         # Control window components
│   │   │   ├── ControlWindow.vue    # Main control interface
│   │   │   ├── MediaPanel.vue       # Media & theme controls
│   │   │   ├── LibraryPanel.vue     # Song/Bible library
│   │   │   └── PreviewPanel.vue     # Content preview
│   │   └── presentation/    # Presentation window
│   │       └── DisplayView.vue      # Audience display
│   ├── stores/              # Pinia state management
│   │   └── presentationStore.js     # App state
│   ├── lib/                 # Data files
│   │   └── songs.json       # Song database
│   └── main.js              # Vue app entry
├── media/                   # User uploaded media
├── package.json
└── electron-builder.json   # Build configuration
```

## 🎯 Usage Guide

### 1. **Setup Display**
- Connect external monitor/projector
- Select target display from dropdown
- Click "Show Presentation" to start

### 2. **Add Content**
- **Songs**: Search and select from library
- **Bible**: Search verses by reference or text
- **Custom**: Add announcements or custom text

### 3. **Customize Appearance**
- **Background**: Choose color or upload image/video
- **Theme**: Adjust font, size, color, alignment
- **Preview**: Check live preview before presenting

### 4. **Present Content**
- Navigate line by line through verses
- Use blank mode for transitions
- Control everything from main window

### 5. **Manage Media**
- Upload images/videos via Media tab
- Supported formats: JPG, PNG, GIF, MP4, WebM, MOV
- Maximum file size: 20MB
- Delete unused files to save space

## ⚙️ Configuration

### Display Settings
- Automatically detects connected displays
- Supports multiple monitor setups
- Remember last used display preference

### Performance Optimization
- Hardware acceleration enabled
- Efficient video rendering
- Minimal memory footprint
- Fast startup time

## 🔧 Development

### Tech Stack
- **Frontend**: Vue.js 3, Vite, Pinia
- **Desktop**: Electron
- **Build**: electron-builder
- **Styling**: CSS3, Responsive Design

### Available Scripts
```bash
npm run dev          # Start Vite dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run electron     # Start Electron
npm run dev:electron # Start both Vite + Electron
npm run dist         # Package for distribution
```

### Key Components
- **ControlWindow**: Main control interface
- **MediaPanel**: Compact tabbed media controls
- **DisplayView**: Presentation output
- **PresentationStore**: Centralized state management

## 🤝 Contributing

We welcome contributions! Please feel free to submit issues and pull requests.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines
- Follow Vue.js style guide
- Use semantic commit messages
- Add tests for new features
- Update documentation

## 📋 Roadmap

- [ ] **Mobile companion app** - Remote control via smartphone
- [ ] **Cloud sync** - Sync songs and settings across devices
- [ ] **Advanced transitions** - Slide transitions and effects
- [ ] **PowerPoint import** - Import existing presentations
- [ ] **Stream integration** - OBS/streaming software support
- [ ] **Multi-language** - Support for multiple languages

## 🐛 Troubleshooting

### Common Issues

**Application won't start:**
- Ensure Node.js 18+ is installed
- Run `npm install` to install dependencies
- Check console for error messages

**Presentation window not showing:**
- Verify external display is connected
- Check display settings in control panel
- Try refreshing displays

**Media files not loading:**
- Check file format (JPG, PNG, GIF, MP4, WebM, MOV)
- Ensure file size is under 20MB
- Restart application if needed

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/yourusername/Orders_Worship/issues) page
2. Create a new issue with detailed description
3. Include system information and error messages

## 🎉 Acknowledgments

- Built for worship teams and churches worldwide
- Inspired by the need for modern, reliable presentation software
- Thanks to the Vue.js and Electron communities
- Special thanks to all contributors and testers

---

**Made with ❤️ for worship teams everywhere**

> *"Sing to the Lord a new song; sing to the Lord, all the earth."* - Psalm 96:1
