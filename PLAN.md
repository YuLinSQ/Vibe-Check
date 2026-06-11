# Vibe Check - Talent Ranking System Design

## Overview
A recruitment tool that ranks candidates based on both their technical qualifications (Resume vs. Job Description) and behavioral "quirks" extracted from their online presence and application materials using LLM analysis.

## Core Features
- **Job Description Context:** The system uses a job description provided by the recruiter as the baseline.
- **LLM-Powered Analysis:** Uses Gemini to analyze resume, cover letter, LinkedIn summary, and GitHub activity.
- **Weighted Quirk Scoring:** Recruiter can adjust weights for specific behavioral traits:
  - **Motivation:** What drives them?
  - **Stability:** Likely to stay long-term?
  - **Personality:** Cultural fit and vibe.
  - **Problem Approach:** Analytical, creative, or brute-force?
  - **Teamwork Potential:** Collaboration style.
- **Dynamic Ranking:** Instant re-ranking of candidates based on weight adjustments.
- **Data Persistence:** Reads from `candidates.json` and exports results to `rankings.json`.

## Technical Stack
- **Frontend:** React (TypeScript) with Vite.
- **Styling:** Vanilla CSS (Modern, sleek, interactive).
- **Backend:** Node.js (Express) to handle LLM calls and file I/O.
- **AI:** Google Gemini API.
- **Storage:** Local JSON files.

## Data Schemas

### `candidates.json`
```json
[
  {
    "id": "c1",
    "name": "Jane Smith",
    "resume": "Experienced full-stack dev with...",
    "cover_letter": "I've always been passionate about...",
    "linkedin": "Building scalable systems at...",
    "github": "Active contributor to open-source..."
  }
]
```

### `rankings.json`
```json
[
  {
    "candidate_id": "c1",
    "name": "Jane Smith",
    "total_score": 85.5,
    "jd_match_score": 90,
    "quirk_scores": {
      "motivation": 8,
      "stability": 7,
      "personality": 9,
      "problem_approach": 8,
      "teamwork": 10
    },
    "summary": "Highly motivated team player with strong technical overlap."
  }
]
```

## UI/UX Plan
- **Modern Aesthetic:** Clean lines, soft shadows, subtle transitions, and high-contrast typography.
- **Interactivity:** Sliders for weighting quirks, hover effects on candidate cards to show breakdown.
- **Visualization:** Radar chart or bar charts for candidate "quirk profile".

## Implementation Roadmap
1. **Phase 1: Project Setup** (Vite, Express, Folder structure).
2. **Phase 2: Data & LLM Logic** (JSON handling, Gemini prompt engineering).
3. **Phase 3: Backend API** (Scoring endpoint).
4. **Phase 4: Frontend Development** (Weight sliders, Candidate list, Visuals).
5. **Phase 5: Integration & Validation** (End-to-end testing).
