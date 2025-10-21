const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const bcrypt = require('bcrypt');
require('dotenv').config();

console.log('Project ID:', process.env.FIREBASE_PROJECT_ID);
console.log('Client Email:', process.env.FIREBASE_CLIENT_EMAIL);
console.log('Private Key exists:', !!process.env.FIREBASE_PRIVATE_KEY);
console.log('Private Key length:', process.env.FIREBASE_PRIVATE_KEY?.length);

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL
  })
});

const db = admin.firestore();

// ============ AUTHENTICATION ROUTES ============

// Signup route
app.post('/api/auth/signup', async (req, res) => {
  try {
    console.log('Signup request received:', req.body);
    
    const { name, email, password, academics, hobbies, skills } = req.body;

    // Validate input
    if (!name || !email || !password) {
      console.log('Validation failed');
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    // Check if user already exists
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('email', '==', email).get();
    console.log('Existing users check:', snapshot.empty);
    
    if (!snapshot.empty) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('Password hashed successfully');

    // Create user document
    const userDoc = await usersRef.add({
      name,
      email,
      password: hashedPassword,
      academics: academics || [],
      hobbies: hobbies || [],
      skills: skills || [],
      createdAt: new Date().toISOString()
    });
    console.log('User created with ID:', userDoc.id);

    res.status(201).json({
      success: true,
      userId: userDoc.id,
      message: 'User created successfully'
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Signup failed' });
  }
});

// Login route
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user by email
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('email', '==', email).get();

    if (snapshot.empty) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user data
    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();

    // Compare passwords
    const passwordMatch = await bcrypt.compare(password, userData.password);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    res.status(200).json({
      success: true,
      userId: userDoc.id,
      userName: userData.name,
      message: 'Login successful'
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ============ USER DATA ROUTES ============

// Get user data by ID
app.get('/api/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();
    // Don't send password back
    delete userData.password;

    res.status(200).json({
      success: true,
      user: { id: userDoc.id, ...userData }
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
});

// Update user data
app.put('/api/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, academics, hobbies, skills } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (academics) updateData.academics = academics;
    if (hobbies) updateData.hobbies = hobbies;
    if (skills) updateData.skills = skills;
    updateData.updatedAt = new Date().toISOString();

    await db.collection('users').doc(userId).update(updateData);

    res.status(200).json({
      success: true,
      message: 'User updated successfully'
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user
app.delete('/api/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    await db.collection('users').doc(userId).delete();

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});