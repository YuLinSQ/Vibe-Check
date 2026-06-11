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

// Helper to read/write JSON files safely
const readJson = (file) => {
  const filePath = path.join(__dirname, '../data', file);
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    return null;
  }
};

const writeJson = (file, data) => {
  const filePath = path.join(__dirname, '../data', file);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

// --- API Endpoints ---

app.get('/api/candidates', (req, res) => {
  res.json(readJson('candidates.json') || []);
});

app.post('/api/candidates', (req, res) => {
  const candidates = readJson('candidates.json') || [];
  const newCand = { id: 'c' + Date.now(), ...req.body, job_assessments: {} };
  candidates.push(newCand);
  writeJson('candidates.json', candidates);
  res.status(201).json(newCand);
});

app.delete('/api/candidates/:id', (req, res) => {
  let candidates = readJson('candidates.json') || [];
  candidates = candidates.filter(c => c.id !== req.params.id);
  writeJson('candidates.json', candidates);
  
  // Also clean up rankings
  const rankings = readJson('rankings.json') || {};
  Object.keys(rankings).forEach(jobId => {
    rankings[jobId] = (rankings[jobId] || []).filter(c => c.id !== req.params.id);
  });
  writeJson('rankings.json', rankings);
  
  res.status(204).send();
});

app.get('/api/jobs', (req, res) => {
  res.json(readJson('jobs.json') || []);
});

app.post('/api/jobs', (req, res) => {
  const jobs = readJson('jobs.json') || [];
  const newJob = { id: String(jobs.length + 1).padStart(3, '0'), ...req.body };
  jobs.push(newJob);
  writeJson('jobs.json', jobs);
  res.status(201).json(newJob);
});

app.get('/api/rankings', (req, res) => {
  // Returns object { jobId1: [...], jobId2: [...] }
  res.json(readJson('rankings.json') || {});
});

app.post('/api/rank', async (req, res) => {
  const { jobDescription, weights, reAnalyzeAll, jobId } = req.body;
  
  try {
    const candidates = readJson('candidates.json') || [];
    
    // Determine who needs AI analysis for THIS specific job
    const needsAI = reAnalyzeAll 
      ? candidates 
      : candidates.filter(c => !c.job_assessments || !c.job_assessments[jobId]);

    let apiResults = [];
    let apiUsed = false;

    if (needsAI.length > 0 && apiKey && apiKey !== 'your_api_key_here') {
      const models = ["gemini-2.5-flash-lite", "gemini-2.0-flash-lite", "gemini-1.5-flash-latest"];
      for (const m of models) {
        try {
          console.log(`Analyzing ${needsAI.length} candidates with ${m}...`);
          const model = genAI.getGenerativeModel({ model: m, generationConfig: { responseMimeType: "application/json" } });
          const list = needsAI.map(c => `ID:${c.id} Name:${c.name} Resume:${c.resume} Letter:${c.cover_letter}`).join("\n---\n");
          const prompt = `Rank candidates for: "${jobDescription}". 
          JSON array of {id, motivation: {score, reason}, stability: {score, reason}, personality: {score, reason}, problem_approach: {score, reason}, teamwork: {score, reason}, jd_match, summary}.`;
          
          const result = await model.generateContent(prompt);
          apiResults = JSON.parse(result.response.text());
          apiUsed = true;
          break;
        } catch (e) {
          console.error(`${m} failed:`, e.message);
        }
      }
    }

    // Fallback if AI failed
    if (!apiUsed && needsAI.length > 0) {
      console.warn("Using keyword fallback");
      const jdWords = jobDescription.toLowerCase().split(/\W+/).filter(w => w.length > 5);
      apiResults = needsAI.map(c => {
        const resWords = c.resume.toLowerCase();
        const matches = jdWords.filter(w => resWords.includes(w)).length;
        const jdMatch = Math.min(60 + (matches * 5), 95);
        const mock = (s) => ({ score: s, reason: "[NON-AI] Automated match." });
        return {
          id: c.id, jd_match: jdMatch, summary: "[NON-AI] Keyword match.",
          motivation: mock(5), stability: mock(5), personality: mock(5), problem_approach: mock(5), teamwork: mock(5)
        };
      });
    }

    // Update master candidate list with job-specific assessment
    const updatedCandidates = candidates.map(c => {
      const res = apiResults.find(r => r.id === c.id);
      if (res) {
        const assessments = c.job_assessments || {};
        assessments[jobId] = {
          quirk_scores: { motivation: res.motivation, stability: res.stability, personality: res.personality, problem_approach: res.problem_approach, teamwork: res.teamwork },
          jd_match_score: res.jd_match,
          summary: res.summary
        };
        return { ...c, job_assessments: assessments };
      }
      return c;
    });
    writeJson('candidates.json', updatedCandidates);

    // Calculate rankings for THIS job
    const totalWeight = Object.values(weights).reduce((a, b) => a + (b || 1), 0);
    const ranked = updatedCandidates.map(c => {
      const assessment = c.job_assessments ? c.job_assessments[jobId] : null;
      if (!assessment) return { ...c, total_score: 0, current_assessment: null };
      
      const q = assessment.quirk_scores;
      const s = { mot: q.motivation?.score || 1, sta: q.stability?.score || 1, per: q.personality?.score || 1, pro: q.problem_approach?.score || 1, tea: q.teamwork?.score || 1 };
      const weightedVibe = ((s.mot * weights.motivation) + (s.sta * weights.stability) + (s.per * weights.personality) + (s.pro * weights.problem_approach) + (s.tea * weights.teamwork)) / totalWeight;
      const total = Math.round(((assessment.jd_match_score * 0.5) + (weightedVibe * 5)) * 10) / 10;
      
      return { ...c, total_score: total, current_assessment: assessment };
    }).sort((a, b) => (b.total_score || 0) - (a.total_score || 0));

    // Update rankings.json (keyed by jobId)
    const allRankings = readJson('rankings.json') || {};
    allRankings[jobId] = { candidates: ranked, isDemo: !apiUsed };
    writeJson('rankings.json', allRankings);
    
    res.json(ranked);

  } catch (error) {
    console.error("Critical Rank Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => console.log(`Server ready on ${port}`));
