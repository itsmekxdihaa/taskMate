# 🚀 Netlify Deployment Guide

## Your TaskMate App is Ready for Netlify! 

### 📁 Files to Deploy
Your built app is located in the `dist/` folder with these files:
- `index.html` - Main HTML file
- `assets/` - CSS and JS bundles
- Background images and icons
- `manifest.json` - PWA configuration

### 🌐 Netlify Deployment Steps

#### Option 1: Drag & Drop (Easiest)
1. Go to [netlify.com](https://netlify.com)
2. Sign up/Login with GitHub, GitLab, or email
3. Drag the entire `dist/` folder to the Netlify dashboard
4. Your site will be deployed instantly!

#### Option 2: Git Integration (Recommended)
1. Push your code to GitHub/GitLab
2. Connect your repository to Netlify
3. Set build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
4. Deploy automatically on every push!

### ⚙️ Build Configuration
If using Git integration, add this to your repository root:

**netlify.toml**:
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### 🔧 Important Notes

#### Firebase Configuration
- Your Firebase config is already set up in `src/firebase.ts`
- Make sure your Firebase project allows web domains
- Add your Netlify domain to Firebase authorized domains

### 🔧 Firestore Security Rules (IMPORTANT!)
Make sure your Firestore security rules allow updates. Go to Firebase Console → Firestore → Rules and use:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Tasks collection
    match /tasks/{taskId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
    
    // Sessions collection  
    match /sessions/{sessionId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
    
    // Users collection
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 🐛 Debugging Production Issues
If task updates don't work on Netlify:
1. Open browser console (F12)
2. Try editing a task
3. Check console logs for error messages
4. Common issues:
   - **Permission denied**: Update Firestore security rules
   - **User not authenticated**: User session expired
   - **Network errors**: Check internet connection

#### Environment Variables (if needed)
In Netlify dashboard → Site settings → Environment variables:
```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
```

### 🌟 Features That Work on Web
✅ Task creation and editing  
✅ User authentication  
✅ Pomodoro timer  
✅ Analytics dashboard  
✅ 5 beautiful themes with motivational quotes  
✅ Responsive design  
✅ PWA capabilities  

### 🎯 Your App URL
Once deployed, you'll get a URL like: `https://your-app-name.netlify.app`

### 📱 PWA Features
Your app includes PWA features:
- Installable on mobile/desktop
- Offline capabilities
- App-like experience

---

**Ready to deploy?** Just drag the `dist/` folder to Netlify! 🚀

