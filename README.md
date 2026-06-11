# Vibe Check

A recruitment talent ranking tool that uses AI to score candidates based on technical match and behavioral "quirks".

## Features
- **JD Match Score:** Compares resume against job description.
- **Behavioral Analysis:** Scores Motivation, Stability, Personality, Problem Approach, and Teamwork.
- **Adjustable Weights:** Recruiter can customize what matters most for the role.
- **LLM-Powered:** Uses Google Gemini for deep textual analysis.

## Setup

1. **API Key:**
   - Create a `.env` file in the `backend/` directory.
   - Add your Gemini API key: `GOOGLE_API_KEY=your_key_here`.

2. **Install Dependencies:**
   ```bash
   npm install
   cd backend && npm install
   cd ../frontend && npm install
   ```

3. **Candidate Data:**
   - Add candidate information to `data/candidates.json`.

4. **Run the App:**
   ```bash
   npm run dev
   ```
   - Backend runs on `http://localhost:5000`
   - Frontend runs on `http://localhost:5173`

## Data Format

### `data/candidates.json`
```json
[
  {
    "id": "c1",
    "name": "Jane Doe",
    "resume": "...",
    "cover_letter": "...",
    "linkedin": "...",
    "github": "..."
  }
]
```
