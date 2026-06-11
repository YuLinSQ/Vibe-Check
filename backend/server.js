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
    
    let batchScores = null;
    let apiError = null;

    // List of models to try in order of preference
    const modelsToTry = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];

    if (apiKey && apiKey !== 'your_api_key_here') {
      for (const modelName of modelsToTry) {
        try {
          console.log(`Attempting analysis with model: ${modelName}...`);
          const model = genAI.getGenerativeModel({ 
            model: modelName,
            generationConfig: { responseMimeType: "application/json" }
          });

          const candidatesListStr = candidates.map(c => `
            ID: ${c.id} Name: ${c.name} Resume: ${c.resume} Cover Letter: ${c.cover_letter}
          `).join("\n---\n");

          const prompt = `Evaluate these candidates for: "${jobDescription}". Return a JSON array of objects with keys: id, name, motivation(1-10), stability(1-10), personality(1-10), problem_approach(1-10), teamwork(1-10), jd_match(0-100), summary(string). Candidates: ${candidatesListStr}`;

          const result = await model.generateContent(prompt);
          const response = await result.response;
          batchScores = JSON.parse(response.text());
          console.log(`Successfully used model: ${modelName}`);
          break; // Exit loop on success
        } catch (err) {
          console.error(`Model ${modelName} failed:`, err.message);
          apiError = err.message;
          // If it's a 429 or 404, we try the next model
        }
      }
    }

    // MOCK FALLBACK: If API fails or is missing, provide intelligent mock results
    if (!batchScores) {
      console.warn("Using Mock Fallback due to API issues:", apiError);
      batchScores = candidates.map(c => {
        // Simple heuristic for "mock" JD match
        const jdKeywords = jobDescription.toLowerCase().split(/\W+/);
        const resumeKeywords = c.resume.toLowerCase().split(/\W+/);
        const matches = jdKeywords.filter(k => k.length > 4 && resumeKeywords.includes(k)).length;
        const mockJD = Math.min(60 + (matches * 5), 98);

        return {
          id: c.id,
          name: c.name,
          motivation: 7 + Math.floor(Math.random() * 4),
          stability: 6 + Math.floor(Math.random() * 5),
          personality: 8 + Math.floor(Math.random() * 3),
          problem_approach: 7 + Math.floor(Math.random() * 4),
          teamwork: 7 + Math.floor(Math.random() * 4),
          jd_match: mockJD,
          summary: `[DEMO MODE] ${c.name} shows strong potential based on initial keyword matching. (API currently unavailable)`
        };
      });
    }

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
