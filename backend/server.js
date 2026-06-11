const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());

const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

app.post('/api/rank', async (req, res) => {
  const { jobDescription, weights } = req.body;
  console.log("Ranking request received:", { jobDescriptionLength: jobDescription?.length, weights });

  if (!apiKey || apiKey === 'your_api_key_here') {
    console.error("API Key is missing or default.");
    return res.status(400).json({ error: "Gemini API key is not configured. Please add GOOGLE_API_KEY to your .env file." });
  }

  const candidatesPath = path.join(__dirname, '../data/candidates.json');
  const rankingsPath = path.join(__dirname, '../data/rankings.json');

  try {
    const candidates = JSON.parse(fs.readFileSync(candidatesPath, 'utf8'));
    
    // Using gemini-2.0-flash with a single batched call to avoid 429 rate limits
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    const candidatesListStr = candidates.map(c => `
      ID: ${c.id}
      Name: ${c.name}
      Resume: ${c.resume}
      Cover Letter: ${c.cover_letter}
      LinkedIn: ${c.linkedin}
      GitHub: ${c.github}
    `).join("\n---Candidate Break---\n");

    const prompt = `
      You are an expert recruiter evaluating a batch of candidates for this specific job description:
      "${jobDescription}"

      Evaluate all of the following candidates at once. For each candidate, provide scores from 1 to 10 for these quirks:
      - motivation: What drives them?
      - stability: Likely to stay long-term?
      - personality: Cultural fit and vibe.
      - problem_approach: Analytical, creative, or brute-force?
      - teamwork: Collaboration style.

      Also provide a "jd_match" score from 0-100 based on technical qualifications versus the job description.
      Provide a brief 1-2 sentence "summary" of their vibe and fit.

      Candidates to evaluate:
      ${candidatesListStr}

      Return a JSON array containing objects matching this schema precisely:
      [
        {
          "id": "string candidate ID",
          "name": "string candidate name",
          "motivation": number,
          "stability": number,
          "personality": number,
          "problem_approach": number,
          "teamwork": number,
          "jd_match": number,
          "summary": string
        }
      ]
    `;

    console.log("Sending batch request to Gemini API...");
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    const batchScores = JSON.parse(text);

    const totalWeight = Object.values(weights).reduce((a, b) => a + (b || 1), 0);

    const rankedCandidates = batchScores.map(quirkScores => {
      const candidateId = quirkScores.id;
      
      // Calculate total score based on weights
      const weightedQuirks = (
        (quirkScores.motivation * (weights.motivation || 1)) +
        (quirkScores.stability * (weights.stability || 1)) +
        (quirkScores.personality * (weights.personality || 1)) +
        (quirkScores.problem_approach * (weights.problem_approach || 1)) +
        (quirkScores.teamwork * (weights.teamwork || 1))
      ) / (totalWeight || 1);

      const normalizedQuirks = weightedQuirks * 10;
      const totalScore = (quirkScores.jd_match * 0.5) + (normalizedQuirks * 0.5);

      return {
        id: candidateId,
        name: quirkScores.name,
        total_score: Math.round(totalScore * 10) / 10,
        jd_match_score: quirkScores.jd_match,
        quirk_scores: {
          motivation: quirkScores.motivation,
          stability: quirkScores.stability,
          personality: quirkScores.personality,
          problem_approach: quirkScores.problem_approach,
          teamwork: quirkScores.teamwork
        },
        summary: quirkScores.summary
      };
    });

    const sortedRankings = rankedCandidates.sort((a, b) => (b.total_score || 0) - (a.total_score || 0));
    fs.writeFileSync(rankingsPath, JSON.stringify(sortedRankings, null, 2));
    res.json(sortedRankings);

  } catch (error) {
    console.error("Critical ranking error during batch processing:", error);
    res.status(500).json({ error: "Internal server error: " + error.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    apiKeyConfigured: !!(process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY)
  });
});

app.get('/api/candidates', (req, res) => {
  const candidatesPath = path.join(__dirname, '../data/candidates.json');
  try {
    if (!fs.existsSync(candidatesPath)) {
      return res.status(404).json({ error: "candidates.json not found" });
    }
    const candidates = JSON.parse(fs.readFileSync(candidatesPath, 'utf8'));
    res.json(candidates);
  } catch (error) {
    console.error("Error reading candidates:", error);
    res.status(500).json({ error: "Could not read candidates data: " + error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
