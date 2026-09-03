const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const {
  users,
  saveRefreshToken,
  getRefreshToken,
  deleteRefreshToken,
  deleteAllRefreshTokensForUser,
  REFRESH_TTL_MS,
} = require('./store');
const { requireAuth, ACCESS_TOKEN_SECRET } = require('./middleware');

const app = express();
app.use(express.json());
app.use(cookieParser());

const ACCESS_TOKEN_TTL = '60s'; // demo ke liye chhota, real app me '15m'

// ---------- Register ----------
app.post('/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'email aur password chahiye' });
  }
  if (users.find((u) => u.email === email)) {
    return res.status(409).json({ message: 'User already exists' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = { id: crypto.randomUUID(), email, passwordHash };
  users.push(user);

  res.status(201).json({ message: 'Registered', userId: user.id });
});

// ---------- Login ----------
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = users.find((u) => u.email === email);
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) return res.status(401).json({ message: 'Invalid credentials' });

  const accessToken = jwt.sign({ userId: user.id }, ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_TOKEN_TTL,
  });

  const refreshToken = crypto.randomUUID(); // opaque token, JWT hona zaroori nahi
  saveRefreshToken(refreshToken, user.id);

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    sameSite: 'strict',
    maxAge: REFRESH_TTL_MS,
  });

  res.json({ accessToken });
});

// ---------- Refresh ----------
// Ye endpoint har baar refresh token ki expiry ko "slide" kar deta hai —
// isliye jab tak user active hai, session kabhi apne aap khatam nahi hota.
app.post('/refresh', (req, res) => {
  const oldToken = req.cookies.refreshToken;
  if (!oldToken) {
    return res.status(401).json({ message: 'No refresh token, please login' });
  }

  const record = getRefreshToken(oldToken);
  if (!record) {
    // Ya to purana token tha, ya bahut der se inactive tha (expire ho gaya)
    return res.status(403).json({ message: 'Refresh token invalid or expired, please login again' });
  }

  // Rotation: purana delete, naya banao, expiry wapas se full mil jati hai
  deleteRefreshToken(oldToken);
  const newRefreshToken = crypto.randomUUID();
  saveRefreshToken(newRefreshToken, record.userId);

  res.cookie('refreshToken', newRefreshToken, {
    httpOnly: true,
    sameSite: 'strict',
    maxAge: REFRESH_TTL_MS,
  });

  const newAccessToken = jwt.sign({ userId: record.userId }, ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_TOKEN_TTL,
  });

  res.json({ accessToken: newAccessToken });
});

// ---------- Logout (sirf ye user ko turant logout karta hai) ----------
app.post('/logout', (req, res) => {
  const token = req.cookies.refreshToken;
  if (token) deleteRefreshToken(token);

  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out' });
});

// ---------- Protected route ----------
app.get('/profile', requireAuth, (req, res) => {
  const user = users.find((u) => u.id === req.userId);
  res.json({ id: user.id, email: user.email });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server chal raha hai: http://localhost:${PORT}`);
  console.log(`Access token: ${ACCESS_TOKEN_TTL} me expire hota hai`);
  console.log(`Refresh token: ${REFRESH_TTL_MS / 1000}s inactivity ke baad expire hota hai (sliding)`);
});