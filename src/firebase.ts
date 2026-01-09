import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where, orderBy, serverTimestamp } from 'firebase/firestore';

// Your Firebase config - replace these with your actual Firebase project values
const firebaseConfig = {
  apiKey: "AIzaSyAIUfZuVeWaeTHAMBVfZilV8_OCVjqpc9s",
  authDomain: "taskmate-app-c6314.firebaseapp.com",
  projectId: "taskmate-app-c6314",
  storageBucket: "taskmate-app-c6314.firebasestorage.app",
  messagingSenderId: "967304132836",
  appId: "1:967304132836:web:078a2d223d7e2c27ce94f1",
  measurementId: "G-4FW59DY2NZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Authentication functions
export const signUp = async (email: string, password: string, name: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Create user profile in Firestore
    await addDoc(collection(db, 'users'), {
      uid: user.uid,
      name: name,
      email: email,
      createdAt: serverTimestamp()
    });
    
    return user;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const signIn = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const logOut = async () => {
  try {
    await signOut(auth);
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Database functions
export const createTask = async (taskData: any) => {
  try {
    // Filter out undefined values before sending to Firebase
    const cleanTaskData = Object.fromEntries(
      Object.entries(taskData).filter(([_, value]) => value !== undefined)
    );
    
    const docRef = await addDoc(collection(db, 'tasks'), {
      ...cleanTaskData,
      createdAt: serverTimestamp()
    });
    return { 
      id: docRef.id, 
      ...taskData,
      createdAt: new Date().toISOString() // Convert to string for local state
    };
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const getTasks = async (userId: string) => {
  try {
    const q = query(
      collection(db, 'tasks'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const updateTask = async (taskId: string, updates: any) => {
  try {
    // Filter out undefined values before sending to Firebase
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined)
    );
    
    console.log('Updating task:', taskId, 'with:', cleanUpdates);
    console.log('Current user:', auth.currentUser?.uid);
    
    // Check if user is authenticated
    if (!auth.currentUser) {
      throw new Error('User not authenticated');
    }
    
    const taskRef = doc(db, 'tasks', taskId);
    
    // Add userId to updates to ensure proper security
    const updatesWithUserId = {
      ...cleanUpdates,
      userId: auth.currentUser.uid
    };
    
    await updateDoc(taskRef, updatesWithUserId);
    console.log('Task updated successfully in Firebase');
    return true;
  } catch (error: any) {
    console.error('Firebase update error:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    // Provide more specific error messages
    if (error.code === 'permission-denied') {
      throw new Error('Permission denied. Please check your Firestore security rules.');
    } else if (error.code === 'not-found') {
      throw new Error('Task not found. It may have been deleted.');
    } else if (error.code === 'unauthenticated') {
      throw new Error('Please log in again to continue.');
    }
    
    throw new Error(error.message || 'Failed to update task');
  }
};

export const deleteTask = async (taskId: string) => {
  try {
    const taskRef = doc(db, 'tasks', taskId);
    await deleteDoc(taskRef);
    return true;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const createSession = async (sessionData: any) => {
  try {
    const docRef = await addDoc(collection(db, 'sessions'), {
      ...sessionData,
      createdAt: serverTimestamp()
    });
    return { id: docRef.id, ...sessionData };
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const getSessions = async (userId: string) => {
  try {
    const q = query(
      collection(db, 'sessions'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export default app;
