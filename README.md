# BizManager — Deployment Guide

## Project Structure
```
bizmanager/
├── frontend/          → React + Vite → deploy to Netlify
├── backend/           → Node.js + Express → deploy to Railway
├── firestore.rules    → deploy to Firebase
└── netlify.toml       → Netlify build config
```

---

## STEP 1 — Push code to GitHub

1. Create a new repo at github.com → name it `bizmanager`
2. In your terminal:
```bash
cd bizmanager
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/bizmanager.git
git push -u origin main
```

---

## STEP 2 — Deploy Backend to Railway

1. Go to railway.app → New Project → Deploy from GitHub repo → select `bizmanager`
2. Railway auto-detects the backend. Set **Root Directory** to `backend`
3. Go to **Variables** tab → Add these environment variables:

```
PORT=5000
FIREBASE_PROJECT_ID=agrimart-55ceb
FRONTEND_URL=https://your-netlify-app.netlify.app   ← update after Netlify deploy
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"agrimart-55ceb",...}
```

For `FIREBASE_SERVICE_ACCOUNT`: paste the entire contents of your service account JSON file as a single line (minified JSON).

4. Click **Deploy** — Railway gives you a URL like `https://bizmanager-production.railway.app`
5. Copy this URL — you'll need it for the frontend

---

## STEP 3 — Deploy Frontend to Netlify

1. Go to app.netlify.com → Add new site → Import from Git → select `bizmanager`
2. Build settings:
   - Base directory: `frontend`
   - Build command: `npm run build`
   - Publish directory: `frontend/dist`
3. Add **Environment Variables**:
```
VITE_FIREBASE_API_KEY=AIzaSyCv73gnjpfbvZS64hRW8YNWwx46PGNpFHA
VITE_FIREBASE_AUTH_DOMAIN=agrimart-55ceb.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=agrimart-55ceb
VITE_FIREBASE_STORAGE_BUCKET=agrimart-55ceb.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=867861969954
VITE_FIREBASE_APP_ID=1:867861969954:web:c59e1d73773e19e9675e7b
VITE_API_URL=https://your-railway-url.railway.app   ← paste Railway URL here
```
4. Click **Deploy site**
5. Note your Netlify URL (e.g. `https://bizmanager-abc123.netlify.app`)
6. Go back to Railway → update `FRONTEND_URL` to your Netlify URL → redeploy

---

## STEP 4 — Deploy Firestore Security Rules

1. Install Firebase CLI:
```bash
npm install -g firebase-tools
firebase login
cd bizmanager
firebase init firestore   # select existing project: agrimart-55ceb
firebase deploy --only firestore:rules
```

---

## STEP 5 — Create your admin account

1. Go to Firebase Console → Authentication → Users → Add user
   - Email: your admin email
   - Password: strong password
   - Copy the UID

2. Call the set-role API to make yourself admin:
```bash
# First get your ID token by logging in via the app
# Then call:
curl -X POST https://your-railway-url.railway.app/api/auth/set-role \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ID_TOKEN" \
  -d '{"uid":"YOUR_UID","role":"admin","branch":""}'
```

OR use the Firebase Console directly:
1. Firestore → Create collection `employees`
2. Add document with your UID
3. Set fields: `role: "admin"`, `branch: ""`

Then in Firebase Console → Authentication → select your user → Custom Claims:
```json
{"role":"admin","branch":""}
```

---

## STEP 6 — Create employee accounts

Once logged in as admin, use the Employees section to add staff.
Each employee gets:
- Email + password for login
- Role: `branch_manager` or `stock_manager`
- Branch: `Maheshwaram`, `Chevella`, `KLKW`, or `Nagarkurnool`

---

## Security checklist
- [ ] Regenerate your Firebase service account key (since it was shared)
- [ ] Set strong passwords for all employee accounts
- [ ] Never commit `.env` files to GitHub (already in .gitignore)
- [ ] Railway env vars are encrypted at rest
- [ ] CORS is locked to your Netlify domain only
- [ ] Firestore rules are deployed (double security layer)
- [ ] Rate limiting: 100 req/15min general, 20 req/15min for auth

---

## Local development

```bash
# Backend
cd backend
npm install
cp .env.example .env   # fill in your values
npm run dev            # runs on port 5000

# Frontend (new terminal)
cd frontend
npm install
cp .env.example .env   # fill in your values
npm run dev            # runs on port 5173, proxies /api to backend
```

---

## ⚠️ IMPORTANT — Regenerate service account key

Since you shared the service account key during setup:
1. Firebase Console → Project settings → Service accounts
2. Find the key with ID `e7b552f5f7...` → Delete it
3. Generate a new private key
4. Update the `FIREBASE_SERVICE_ACCOUNT` variable in Railway with the new key
