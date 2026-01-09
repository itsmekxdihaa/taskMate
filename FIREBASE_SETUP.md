# Firebase Setup Guide for TaskMate

## 🚀 **Step 1: Create a Firebase Project**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Enter project name: `taskmate-app` (or your preferred name)
4. Enable Google Analytics (optional)
5. Click "Create project"

## 🔑 **Step 2: Get Your Firebase Config**

1. In your Firebase project, click the gear icon ⚙️ next to "Project Overview"
2. Select "Project settings"
3. Scroll down to "Your apps" section
4. Click the web icon (</>)
5. Register app with name: `TaskMate Web App`
6. Copy the config object that looks like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyC...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

## 🔐 **Step 3: Enable Authentication**

1. In Firebase Console, go to "Authentication" in the left sidebar
2. Click "Get started"
3. Go to "Sign-in method" tab
4. Enable "Email/Password" provider
5. Click "Save"

## 📊 **Step 4: Set Up Firestore Database**

1. In Firebase Console, go to "Firestore Database" in the left sidebar
2. Click "Create database"
3. Choose "Start in test mode" (for development)
4. Select a location close to you
5. Click "Done"

## 📝 **Step 5: Update Your Firebase Config**

1. Open `src/firebase.ts`
2. Replace the placeholder config with your actual Firebase config
3. Save the file

## 🎯 **Step 6: Test Your App**

1. Run `npm run dev`
2. Try to sign up with a new email/password
3. Try to log in with existing credentials

## 🔧 **Current Issues to Fix**

The app has some type mismatches that need to be resolved:

1. **Task IDs**: Changed from `number` to `string` (Firebase uses string IDs)
2. **Function signatures**: Need to update throughout the app
3. **Database calls**: All localStorage calls replaced with Firebase calls

## 📚 **What Firebase Gives You**

✅ **Real Authentication**: Secure user login/signup
✅ **Persistent Data**: Tasks and sessions saved in the cloud
✅ **Real-time Updates**: Data syncs across devices
✅ **Security Rules**: Control who can access what data
✅ **Scalability**: Handles multiple users and large datasets

## 🚨 **Important Notes**

- **Test Mode**: Firestore is in test mode (anyone can read/write)
- **Production**: Before deploying, set up proper security rules
- **Costs**: Firebase has a generous free tier (50,000 reads/day, 20,000 writes/day)

## 🆘 **Need Help?**

If you encounter issues:
1. Check Firebase Console for error logs
2. Verify your config values are correct
3. Make sure Authentication and Firestore are enabled
4. Check browser console for JavaScript errors

Your app will now have real, persistent user accounts and data storage! 🎉

