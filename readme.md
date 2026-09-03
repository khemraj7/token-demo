# Token demo — logout sirf user ke chahne pe ya lambi inactivity pe

Chhota Express project jo dikhata hai ki access token expire hone se user logout
nahi hota — refresh token silently naya access token de deta hai. Logout tabhi
hota hai jab:
1. User khud `/logout` call kare, ya
2. User itni der inactive rahe ki refresh token bhi expire ho jaye

Demo ke liye timers chhote rakhe hain (asli app me lambe honge):
- Access token: 15 seconds
- Refresh token: 60 seconds sliding window (har refresh pe fir se 60 sec mil jate hain)

## Setup

```bash
npm install
npm start
```

Server `http://localhost:3000` pe chalega.

## Test flow (curl se)

**1. Register**
```bash
curl -X POST http://localhost:3000/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"1234"}'
```

**2. Login** — cookie jar save karo taaki refresh token cookie carry ho
```bash
curl -c cookies.txt -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"1234"}'
```
Response se `accessToken` copy kar lo.

**3. Protected route hit karo (access token ke saath)**
```bash
curl http://localhost:3000/profile \
  -H "Authorization: Bearer <accessToken>"
```

**4. 15 sec wait karo** (access token expire ho jayega), phir wahi call retry karo —
`401 Access token expired` milega. Ab refresh karo:

```bash
curl -b cookies.txt -c cookies.txt -X POST http://localhost:3000/refresh
```
Naya `accessToken` milega — is tarah user ko login karne ki zarurat nahi padi.

**5. Ye baar baar chalao (har 50-55 sec pe)** — jab tak tum refresh call karte
raho, session kabhi expire nahi hoga. Ye "user active hai" ko simulate karta hai.

**6a. Explicit logout test**
```bash
curl -b cookies.txt -X POST http://localhost:3000/logout
```
Ab dobara `/refresh` call karoge to `403` milega — session khatam.

**6b. Inactivity test**
Kuch mat karo, 60 sec se zyada wait karo, phir `/refresh` call karo — usme bhi
`403 Refresh token invalid or expired` milega, kyunki itni der koi activity
nahi hui.

## Production me kya badlega

- `ACCESS_TOKEN_TTL` = `15m`, refresh TTL = `30d` jaisa rakhoge
- In-memory `store.js` ki jagah MongoDB/Postgres table use karoge
- Refresh token ko hash karke DB me store karoge (plain nahi)
- Reuse detection add karoge (agar revoked token dobara use ho to sab
  tokens revoke kar do — security ke liye)