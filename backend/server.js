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

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

app.post('/api/rank', async (req, res) => {
  const { jobDescription, weights } = req.body;
  const candidatesPath = path.join(__dirname, '../data/candidates.json');
  const rankingsPath = path.join(__dirname, '../data/rankings.json');

  try {
    const candidates = JSON.parse(fs.readFileSync(candidatesPath, 'utf8'));
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const rankedCandidates = await Promise.all(candidates.map(async (candidate) => {
      const prompt = `
        Analyze the following candidate for the job description: "${jobDescription}"
        
        Candidate Name: ${candidate.name}
        Resume: ${candidate.resume}
        Cover Letter: ${candidate.cover_letter}
        LinkedIn: ${candidate.linkedin}
        GitHub: ${candidate.github}

        Based on the provided information, evaluate the following "quirks" on a scale of 1-10:
        - Motivation: What drives them?
        - Stability: Likely to stay long-term?
        - Personality: Cultural fit and vibe.
        - Problem Approach: Analytical, creative, or brute-force?
        - Teamwork Potential: Collaboration style.

        Also, provide a "JD Match Score" from 0-100 based on their technical qualifications vs the job description.

        Provide a brief 1-2 sentence summary of their "vibe".

        Return ONLY a JSON object with these keys: 
        {
          "motivation": number,
          "stability": number,
          "personality": number,
          "problem_approach": number,
          "teamwork": number,
          "jd_match": number,
          "summary": string
        }
      `;

      try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        // Extract JSON from the response (sometimes Gemini wraps it in ```json)
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const quirkScores = JSON.parse(jsonMatch[0]);

        // Calculate total score based on weights
        const weightedQuirks = (
          (quirkScores.motivation * (weights.motivation || 1)) +
          (quirkScores.stability * (weights.stability || 1)) +
          (quirkScores.personality * (weights.personality || 1)) +
          (quirkScores.problem_approach * (weights.problem_approach || 1)) +
          (quirkScores.teamwork * (weights.teamwork || 1))
        ) / Object.values(weights).reduce((a, b) => a + b, 0);

        // Normalize quirk score to 0-100
        const normalizedQuirks = weightedQuirks * 10;
        
        // Final score: 50% JD Match, 50% Quirks
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
        console.error(`Error processing candidate ${candidate.name}:`, err);
        return {
          id: candidate.id,
          name: candidate.name,
          error: "Failed to process candidate analysis."
        };
      }
    }));

    // Sort by total score descending
    const sortedRankings = rankedCandidates.sort((a, b) => (b.total_score || 0) - (a.total_score || 0));

    fs.writeFileSync(rankingsPath, JSON.stringify(sortedRankings, null, 2));
    res.json(sortedRankings);

  } catch (error) {
    console.error("Ranking error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get('/api/candidates', (req, res) => {
  const candidatesPath = path.join(__dirname, '../data/candidates.json');
  try {
    const candidates = JSON.parse(fs.readFileSync(candidatesPath, 'utf8'));
    res.json(candidates);
  } catch (error) {
    res.status(500).json({ error: "Could not read candidates data" });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
