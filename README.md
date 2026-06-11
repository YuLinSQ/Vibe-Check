# Vibe Check - AI Talent Ranking System 🎈🥳✅

## 💡 Inspiration
I built this platform to streamline the highly congested technical recruiting process. The goal is to cut through the noise by rapidly surfacing high-signal candidates based on objective metrics and behavioral indicators, rather than relying on manual resume screening. To create a cleaner, more centralized hiring experience, the platform also includes a complete CRUD interface for managing both job descriptions and applicant pipelines.

### 🏗️ Architecture Decision: Bypassing Live Web Scraping
Early iterations considered live-scraping candidate data from platforms like LinkedIn. I explicitly pivoted away from this to avoid the massive token overhead of feeding raw HTML into an LLM, as well as the significant engineering bottleneck of fighting evolving anti-bot mechanisms.

---

**Vibe Check** is a modern recruitment tool designed to move beyond simple keyword matching. It uses Generative AI (Google Gemini) to evaluate candidates based on both their technical qualifications and their behavioral "vibe" or quirks.

## 🚀 The Vision
Most hiring tools look for skills. **Vibe Check** looks for the person. By analyzing resumes, cover letters, and social profiles, it provides a holistic score that balances technical requirements with behavioral traits like motivation, teamwork, and problem-solving styles.

## ✨ Key Features

### 1. Dual-Track Scoring & AI Reasoning
- **JD Match Score (50%):** A traditional evaluation of how well a candidate's skills and experience align with the Job Description.
- **Vibe Score (50%):** A weighted average of five behavioral "quirks" extracted via AI analysis.
- **Qualitative Reasoning:** For every score awarded, the AI provides a specific reason (e.g., *"Alex scored 9/10 in Problem Approach due to his focus on scalability and system architecture"*).

### 2. Multi-Job Management & Search
- **Job Library:** Save, edit, and manage multiple Job Descriptions in a centralized database.
- **Isolated Rankings:** Switching between jobs instantly restores the unique rankings and scores for that specific role.
- **Smart Search:** Quickly find roles by **Job Title** or **Unique Job ID** (e.g., `001`).

### 3. Vibe Shape Visualization (Radar Charts)
- **Instant Signal:** Each candidate card features a pentagonal Radar Chart (Spider Chart) that visually represents their behavioral profile.
- **Pattern Recognition:** Instantly distinguish between "Technical Specialists" and "Team-Oriented Leaders" at a glance.

### 4. Advanced Pipeline Filtering
- **Technical Thresholds:** Hide any candidates who fall below a specific **JD Match %** (e.g., Hide all < 70% matches).
- **The Shortlist:** Use the "Show Top X" filter to limit your view to only the highest-ranked candidates (e.g., Top 5).

### 5. High-Efficiency Engine
- **Score Persistence:** Analyzed results are saved permanently. The system **skips AI analysis** for already-assessed candidates to save time and API tokens.
- **Smart Fallback:** If API limits are reached, the system automatically switches to a **Non-AI Keyword Match** algorithm to maintain functionality.

## 🛠️ Tech Stack
- **Frontend:** React, TypeScript, Vite, Vanilla CSS (Custom SVG Graphics)
- **Backend:** Node.js, Express, Google Generative AI SDK
- **Models:** Gemini 2.5 (Flash/Pro), 2.0 (Flash/Lite), 1.5 (Flash/Pro)
- **Data:** JSON-based persistent storage (`data/candidates.json`, `data/jobs.json`, `data/rankings.json`)

## ⚙️ Setup & Installation

### 1. Configure API Key
Create a `.env` file in the `backend/` directory:
```env
GEMINI_API_KEY=your_actual_api_key_here
PORT=5000
```

### 2. Install & Run
```bash
npm install
npm run dev
```
- **Web Interface:** `http://localhost:5173`
- **API Server:** `http://localhost:5000`

---

## 📈 Future Considerations and Scalability
As the platform scales from a single-day prototype to a production-ready tool, several architectural upgrades are planned:

### 1. Cloud Database Migration & Storage Strategy
- **Target Architecture:** Migrate to PostgreSQL (Supabase/RDS) for multi-tenant recruiter accounts.
- **Object Storage:** Shift raw resumes into Amazon S3, storing only metadata in the DB.

### 2. LLM Cost Optimization & Caching Layers
- **Semantic Caching:** Implement Redis/GPTCache to serve scorecards for similar resumes without new LLM generation.
- **Model Tiering:** Use local open-source models (Llama 3) for extraction, reserving premium LLMs for deep behavioral analysis.

### 3. Vector Embeddings & Semantic Search
- **Vector Pipeline:** Use `pgvector` or Pinecone for instant mathematical similarity matching across thousands of profiles before running intensive AI evaluations.

### 4. Data Privacy, Compliance, and PII Masking
- **Anonymization:** Implement an automated scrubbing pipeline to strip PII (Names, Addresses) before LLM transmission.
- **Audit Logging:** Maintain deterministic logs of AI rationales to ensure transparency and defend against algorithmic bias.

### 5. AI-Powered Interview Guides
- **Behavioral Questions:** Auto-generate candidate-specific interview questions based on identified "vibe" gaps (e.g., if Teamwork scores low, generate targeted probes for collaboration style).
- **Signal-to-Question Mapping:** Map exact technical deficiencies (from JD Match) to specific whiteboarding or technical assessment prompts.

---
*Built as a high-impact, one-day recruitment prototype.*
