# TaskMate 🌸

[![GitHub](https://img.shields.io/badge/GitHub-Repository-blue)](https://github.com/itsmekxdihaa/taskMate)
[![React](https://img.shields.io/badge/React-18.2-blue)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue)](https://www.typescriptlang.org/)
[![Firebase](https://img.shields.io/badge/Firebase-Enabled-orange)](https://firebase.google.com/)

A beautiful, feature-rich task management desktop application built with React, TypeScript, Electron, and Firebase.

## ✨ Features

- **📝 Smart Task Management**: Organize tasks by urgency, add descriptions, and set due dates
- **⏰ Pomodoro Timer**: Stay focused with timed work sessions and breaks
- **🎵 Background Music**: Choose from various study music to enhance productivity
- **🎨 Beautiful Themes**: Switch between multiple aesthetic themes and backgrounds
- **☁️ Cloud Sync**: Your tasks are saved in Firebase and sync across devices
- **🔐 User Authentication**: Secure login system with Firebase Auth
- **📱 Responsive Design**: Beautiful UI that adapts to different screen sizes

## 🚀 Quick Start

### For Users (Download & Install)

1. **Download the app**:
   - Visit the download page or get the DMG file directly
   - File: `YourAppName-Mac-0.0.0-Installer.dmg` (119 MB)

2. **Install on Mac**:
   - Double-click the DMG file to mount it
   - Drag the TaskMate app to your Applications folder
   - Open TaskMate from your Applications folder

3. **First Time Setup**:
   - Create a new account with your email and password
   - Start adding tasks and organizing your life!

### For Developers (Build from Source)

1. **Clone the repository**:
   ```bash
   git clone https://github.com/itsmekxdihaa/taskMate.git
   cd taskMate
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up Firebase** (required for full functionality):
   - Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
   - Enable Authentication (Email/Password) and Firestore Database
   - Update `src/firebase.ts` with your Firebase config
   - Set up Firestore security rules (see FIREBASE_SETUP.md for details)
   - Create Firestore indexes for tasks and sessions collections

4. **Run in development mode (Web)**:
   ```bash
   npx vite --config vite.config.web.ts
   ```
   
   Or use the standard dev command (may include Electron):
   ```bash
   npm run dev
   ```

5. **Build for production**:
   ```bash
   npm run build
   ```

## 🛠️ Technical Stack

- **Frontend**: React 18 + TypeScript
- **Desktop**: Electron
- **Build Tool**: Vite
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **Styling**: Custom CSS with theme support

## 📁 Project Structure

```
todo-ai-desktop/
├── src/
│   ├── App.tsx          # Main application component
│   ├── App.css          # Styles and themes
│   ├── firebase.ts      # Firebase configuration and functions
│   └── components/      # React components
├── electron/            # Electron main process
├── public/              # Static assets and background images
├── dist/                # Built web assets
├── release/             # Built desktop app
└── package.json         # Dependencies and scripts
```

## 🎨 Themes

The app supports three beautiful themes:

1. **🌿 Dark Forest Green**: Nature-inspired with green accents
2. **⚫ Black**: Sleek and modern dark theme
3. **🌸 Pink**: Original aesthetic pink theme

Switch between themes using the circular buttons in the sidebar!

## 🔧 Configuration

### Firebase Setup

1. Create a Firebase project
2. Enable Authentication (Email/Password)
3. Enable Firestore Database
4. Update `src/firebase.ts` with your config:

```typescript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};
```

### Required Firestore Indexes

Create these composite indexes in your Firebase console:

1. **Tasks Collection**:
   - Fields: `userId` (Ascending), `createdAt` (Descending)

2. **Sessions Collection**:
   - Fields: `userId` (Ascending), `createdAt` (Descending)

## 📱 Usage

### Adding Tasks
1. Go to the Tasks page
2. Click "Add New Task"
3. Fill in task details (title, description, urgency, due date)
4. Click "Save Task"

### Using Pomodoro Timer
1. Go to the Pomodoro Timer page
2. Select a task to work on (optional)
3. Click "Start" to begin a 25-minute work session
4. Take breaks between sessions

### Changing Themes
1. Use the circular theme buttons in the sidebar
2. Each theme changes colors throughout the app
3. Background images also change with themes

### Background Music
1. Click the music button in the sidebar
2. Choose from various study music options
3. Control playback with play/pause buttons

## 🚨 Troubleshooting

### "Failed to add task" Error
- Ensure Firebase is properly configured
- Check that Firestore indexes are created
- Verify you're logged in

### Tasks Not Loading / "Failed to load tasks"
- Check Firebase connection and authentication
- Ensure Firestore security rules are properly configured
- Verify you're logged in with Firebase Auth
- Check browser console for detailed error messages
- See FIREBASE_SETUP.md for security rules configuration

### App Won't Start
- Check that all dependencies are installed
- Ensure Node.js version is compatible
- Check console for error messages

## 📦 Building for Distribution

```bash
# Build the app
npm run build

# The built app will be in the release/ folder
# Look for the DMG file for macOS distribution
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- Built with love using React and Electron
- Beautiful icons and emojis throughout
- Study music from Bensound.com
- Firebase for reliable cloud storage

---

**TaskMate** - Making task management beautiful and productive! 🌸✨
