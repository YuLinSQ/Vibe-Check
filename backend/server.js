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
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    const rankedCandidates = await Promise.all(candidates.map(async (candidate) => {
      const prompt = `
        Analyze the following candidate for the job description: "${jobDescription}"
        
        Candidate Name: ${candidate.name}
        Resume: ${candidate.resume}
        Cover Letter: ${candidate.cover_letter}
        LinkedIn: ${candidate.linkedin}
        GitHub: ${candidate.github}

        Return a JSON object with these keys: 
        {
          "motivation": number (1-10),
          "stability": number (1-10),
          "personality": number (1-10),
          "problem_approach": number (1-10),
          "teamwork": number (1-10),
          "jd_match": number (0-100),
          "summary": string (1-2 sentence vibe check)
        }
      `;

      try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        const quirkScores = JSON.parse(text);

        // Calculate total score based on weights
        const totalWeight = Object.values(weights).reduce((a, b) => a + (b || 1), 0);
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
          id: candidate.id,
          name: candidate.name,
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
      } catch (err) {
        console.error(`Error processing candidate ${candidate.name}:`, err.message);
        return {
          id: candidate.id,
          name: candidate.name,
          error: err.message || "Failed to process candidate analysis."
        };
      }
    }));

    const sortedRankings = rankedCandidates.sort((a, b) => (b.total_score || 0) - (a.total_score || 0));
    fs.writeFileSync(rankingsPath, JSON.stringify(sortedRankings, null, 2));
    res.json(sortedRankings);

  } catch (error) {
    console.error("Critical ranking error:", error);
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
