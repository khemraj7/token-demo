// Sirf demo ke liye in-memory storage. Real project me MongoDB/Postgres use karo.

const users = []; // { id, email, passwordHash }

// key = refresh token string, value = { userId, expiresAt }
const refreshTokens = new Map();

const REFRESH_TTL_MS = 60* 60 * 1000; // demo ke liye 60 sec = "lambi inactivity"
// Real app me ye 7-30 din hoga: 30 * 24 * 60 * 60 * 1000

function saveRefreshToken(token, userId) {
  refreshTokens.set(token, {
    userId,
    expiresAt: Date.now() + REFRESH_TTL_MS,
  });
}

function getRefreshToken(token) {
  const record = refreshTokens.get(token);
  if (!record) return null;

  // Inactivity check: agar expire ho chuka hai to record hi hata do
  if (Date.now() > record.expiresAt) {
    refreshTokens.delete(token);
    return null;
  }
  return record;
}

function deleteRefreshToken(token) {
  refreshTokens.delete(token);
}

function deleteAllRefreshTokensForUser(userId) {
  for (const [token, record] of refreshTokens.entries()) {
    if (record.userId === userId) refreshTokens.delete(token);
  }
}

module.exports = {
  users,
  saveRefreshToken,
  getRefreshToken,
  deleteRefreshToken,
  deleteAllRefreshTokensForUser,
  REFRESH_TTL_MS,
};