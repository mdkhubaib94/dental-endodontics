
# 🦷 SRM Dental Web App

A full-stack web application designed for SRM Dental Hospital to streamline patient-doctor interactions, appointment scheduling, and admin control. The system enables login and functionalities across **three major roles** — `Patient`, `Doctor`, and `Admin`.

## 🚀 Live Demo

**Deployed on Vercel:** https://dental-2-vert.vercel.app/

## 🌐 Deploy to Render (Single Service)

This repo is set up to deploy as **one Render Web Service** that serves both:
- the React build (from `client/dist`)
- the API under `/api/*` (Express server)

### Pre-deploy checklist
1. Commit and push all lockfiles:
	- `pnpm-lock.yaml`
	- `client/pnpm-lock.yaml`
	- `server/pnpm-lock.yaml`
2. Ensure these environment variables are set in Render:
	- `MONGO_URI` (required)
	- `JWT_SECRET` (required in production)
	- `CORS_ORIGIN` (optional for single-service deploy)
	- `MAIL_USER` + `MAIL_PASSWORD` or `SENDGRID_API_KEY` (optional, only for email features)

### Option A: Blueprint (recommended)
1. Push this repo to GitHub.
2. In Render: **New + → Blueprint** and select your repo.
3. Render reads `render.yaml` and creates the web service using:
	- Build Command: `npm run build:render`
	- Start Command: `npm run start:render`
4. Add environment variables from the checklist above.
5. Deploy and open your service URL.

### Option B: Manual service
Render → **New + → Web Service** → connect repo, then use:
- Build Command: `npm run build:render`
- Start Command: `npm run start:render`

Notes:
- Render injects `PORT`; the server uses it automatically.
- For single-service hosting, you usually do **not** need `CORS_ORIGIN`.

## ▲ Deploy to Vercel (Single Project)

This repo now includes:
- `vercel.json` (build + SPA/API rewrites)
- `api/[...all].js` (serverless entry for Express API)

### Steps
1. Push this repo to GitHub.
2. In Vercel: **Add New → Project** and import this repository.
3. Keep **Root Directory** as project root (do not switch to `client/`).
4. (Optional local pre-check) run from root:
	- `npm run build:vercel`
5. Vercel will use `vercel.json` and run:
	- build: `npm install --prefix server && npm install --prefix client && npm run build --prefix client`
	- output: `client/dist`
6. Add environment variables in Vercel Project Settings (copy from `.env.example` / `server/.env.example`):
	- `NODE_ENV=production`
	- `MONGO_URI` (required)
	- `JWT_SECRET` (required)
	- `CORS_ORIGIN` (optional; set to your Vercel URL if needed)
	- `MAIL_USER` + `MAIL_PASSWORD` or `SENDGRID_API_KEY` (optional, email features)
7. Deploy.

### Result
- Frontend is served from Vercel static output.
- API is served from Vercel Functions at `/api/*`.
- Since frontend + API share the same domain, `VITE_API_BASE_URL` can stay empty in production.


## ⚙️ Installation

### 1. Clone the repository

```bash
git clone https://github.com/GowsiSM/srm-dental-web-app.git
cd srm-dental-web-app
```

### 2. Install dependencies

Frontend

```bash
cd client
npm install
npm run dev
```

Backend

```cd server
npm install express mongoose bcryptjs cors dotenv jsonwebtoken nodemailer
node Server.js
```

👥 Sample User Accounts
```
Doctors
1.DNT01,password:123456 (prostho doctor)
2.DNT02,password:123456(general)
3.DNT03,DNT04 password:123456(pedo)
4.PGDNT01,password:123456(DNT01's PG)
5. PGDNT010, password: 123456

ADMIN
Id:AD100,password:123456
Patients
2603016,2603017 password:Patient123




CDNT01,password:123456 (protho's HOD)
CDNT02,password:123456(pedo's HOD)
```

# 🦷 SRM Dental Web App  

A full-stack dental management web application built with **React (frontend)** and **Node.js/Express (backend)**.  

---

## 🚀 Getting Started  
### 1. Clone the Repository  
```bash
git clone https://github.com/Gowsi/srm-dental-web-app.git
cd srm-dental-web-app
```
### 2. Install Dependencies
Frontend
```bash
cd client
npm install
```
Backend
```bash
cd server
npm install
```
### 3. Run Server & Client Simultaneously
```bash
npm run dev
```

### ⚙️ Tech Stack

Frontend: React + Vite

Backend: Node.js + Express

Database: MongoDB Atlas


### Color theme
Primary Theme Colors

Blue Gradient Shades

#3C8DFF (bright blue – hover/focus/primary)

#4F96FF (lighter blue – gradient blend)

#2563EB (deep blue – button hover)

#3B82F6 (sky blue – message box button)

#1d4ed8 (navy blue – button active)

White Variants

#ffffff (pure white – text, gradients)

#f9f9f9 (light white/gray – button base)

rgba(255, 255, 255, 0.95) (inputs background)

rgba(255, 255, 255, 0.9 / 0.8 / 0.6 / 0.3 / 0.2 / 0.1) (overlay, text, borders, scrollbar, glow)

Secondary / Background Colors

Dark Blue Container

rgba(37, 40, 106, 0.9) (login container background)

rgba(36, 40, 107, 0.95) (message box background)

Neutrals

#333 (primary text on light background)

#666 (placeholder text, icons default)

#888 (placeholder override)

#999 (disabled dropdown option)

Shadows / Depth Effects

rgba(0, 0, 0, 0.1) (light shadows/borders)

rgba(0, 0, 0, 0.15 / 0.2 / 0.3 / 0.4 / 0.5) (various shadows & overlays)
