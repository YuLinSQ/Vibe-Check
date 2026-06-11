# Vibe Check - AI Talent Ranking System

## 💡 Inspiration
I built this platform to streamline the highly congested technical recruiting process. The goal is to cut through the noise by rapidly surfacing high-signal candidates based on objective metrics and behavioral indicators, rather than relying on manual resume screening. To create a cleaner, more centralized hiring experience, the platform also includes a complete CRUD interface for managing both job descriptions and applicant pipelines.

### 🏗️ Architecture Decision: Bypassing Live Web Scraping
Early iterations considered live-scraping candidate data from platforms like LinkedIn. I explicitly pivoted away from this to avoid the massive token overhead of feeding raw HTML into an LLM, as well as the significant engineering bottleneck of fighting evolving anti-bot mechanisms.

---

**Vibe Check** is a modern recruitment tool designed to move beyond simple keyword matching. It uses Generative AI (Google Gemini) to evaluate candidates based on both their technical qualifications and their behavioral "vibe" or quirks.

## 🚀 The Vision
Most hiring tools look for skills. **Vibe Check** looks for the person. By analyzing resumes, cover letters, and social profiles, it provides a holistic score that balances technical requirements with behavioral traits like motivation, teamwork, and problem-solving styles.

## ✨ Features

### 1. Dual-Track Scoring
- **JD Match Score (50%):** A traditional evaluation of how well a candidate's skills and experience align with the Job Description.
- **Vibe Score (50%):** A weighted average of five behavioral "quirks" extracted via AI analysis.

### 2. The 5 Behavioral Quirks
Recruiters can customize the importance of each trait using real-time sliders:
- **Motivation:** What drives this candidate?
- **Stability:** Are they likely to stay long-term?
- **Personality:** Cultural fit and overall "vibe."
- **Problem Approach:** Are they analytical, creative, or a "brute-force" fixer?
- **Teamwork Potential:** Collaboration style and leadership traits.

### 3. Smart Fallback System
To ensure a seamless user experience regardless of API limits:
- **AI Mode:** Uses `gemini-2.0-flash` (with fallbacks to 2.5 and 1.5) for deep semantic analysis.
- **Batch Processing:** Sends all candidates in a single request to minimize API quota usage.
- **Demo Mode:** If API limits are reached, the system automatically switches to a keyword-overlap algorithm to simulate rankings.

## 🛠️ Tech Stack
- **Frontend:** React, TypeScript, Vite, Vanilla CSS
- **Backend:** Node.js, Express, Google Generative AI SDK
- **Data:** JSON-based local storage (`data/candidates.json`)

## ⚙️ Setup & Installation

### 1. Configure API Key
Create a `.env` file in the `backend/` directory:
```env
GEMINI_API_KEY=your_actual_api_key_here
PORT=5000
```

### 2. Install Dependencies
From the root directory:
```bash
npm install
cd backend && npm install
cd ../frontend && npm install
```

### 3. Run the Application
Start both the frontend and backend with one command:
```bash
npm run dev
```
- **Web Interface:** `http://localhost:5173`
- **API Server:** `http://localhost:5000`

## 📊 Data Structure
- **Input:** `data/candidates.json` - Add candidate resumes and cover letters here.
- **Output:** `data/rankings.json` - The system exports the most recent ranking results here automatically.

---
*Built as a high-impact, one-day recruitment prototype.*
