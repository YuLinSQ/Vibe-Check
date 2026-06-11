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
  const data = readJson('candidates.json') || [];
  res.json(data);
});

app.post('/api/candidates', (req, res) => {
  const candidates = readJson('candidates.json') || [];
  const newCand = { id: 'c' + Date.now(), ...req.body };
  candidates.push(newCand);
  writeJson('candidates.json', candidates);
  res.status(201).json(newCand);
});

app.delete('/api/candidates/:id', (req, res) => {
  let candidates = readJson('candidates.json') || [];
  candidates = candidates.filter(c => c.id !== req.params.id);
  writeJson('candidates.json', candidates);
  res.status(204).send();
});

app.get('/api/jobs', (req, res) => {
  const data = readJson('jobs.json') || [];
  res.json(data);
});

app.post('/api/jobs', (req, res) => {
  const jobs = readJson('jobs.json') || [];
  const newJob = { id: String(jobs.length + 1).padStart(3, '0'), ...req.body };
  jobs.push(newJob);
  writeJson('jobs.json', jobs);
  res.status(201).json(newJob);
});

app.get('/api/rankings', (req, res) => {
  const data = readJson('rankings.json') || { jobId: null, candidates: [], isDemo: false };
  res.json(data);
});

app.post('/api/rank', async (req, res) => {
  const { jobDescription, weights, reAnalyzeAll, jobId } = req.body;
  
  try {
    const candidates = readJson('candidates.json') || [];
    
    // 1. Determine who needs analysis
    // For simplicity in this rewrite, we analyze based on the reAnalyzeAll flag
    // or if they don't have scores for THIS specific job.
    const needsAI = reAnalyzeAll 
      ? candidates 
      : candidates.filter(c => !c.quirk_scores || c.last_job_id !== jobId);

    let apiResults = [];
    let apiUsed = false;

    if (needsAI.length > 0 && apiKey && apiKey !== 'your_api_key_here') {
      const models = ["gemini-2.5-flash-lite", "gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash-lite", "gemini-1.5-flash-latest"];
      for (const m of models) {
        try {
          console.log(`Trying model ${m}...`);
          const model = genAI.getGenerativeModel({ model: m, generationConfig: { responseMimeType: "application/json" } });
          const list = needsAI.map(c => `ID:${c.id} Name:${c.name} Resume:${c.resume} Letter:${c.cover_letter}`).join("\n---\n");
          const prompt = `Rank these candidates for: "${jobDescription}". 
          LOGIC: If JD match < 50, summary "Basic qualifications not met", all quirk scores=1, reasons="N/A".
          Else full analysis.
          Return a JSON array where each object has:
          {
            "id": string,
            "jd_match": number (0-100),
            "summary": string,
            "motivation": {"score": number (1-10), "reason": string},
            "stability": {"score": number (1-10), "reason": string},
            "personality": {"score": number (1-10), "reason": string},
            "problem_approach": {"score": number (1-10), "reason": string},
            "teamwork": {"score": number (1-10), "reason": string}
          }
          Candidates: ${list}`;
          
          const result = await model.generateContent(prompt);
          apiResults = JSON.parse(result.response.text());
          apiUsed = true;
          break;
        } catch (e) {
          console.error(`${m} failed:`, e.message);
        }
      }
    }

    // 2. Fallback to Keyword Match
    if (!apiUsed && needsAI.length > 0) {
      console.warn("Using keyword fallback");
      const jdWords = jobDescription.toLowerCase().split(/\W+/).filter(w => w.length > 5);
      apiResults = needsAI.map(c => {
        const resWords = c.resume.toLowerCase();
        const matches = jdWords.filter(w => resWords.includes(w)).length;
        const jdMatch = Math.min(60 + (matches * 5), 95);
        const mock = (s) => ({ score: s, reason: "[NON-AI] Automated match." });
        return {
          id: c.id, 
          motivation: mock(5), stability: mock(5), personality: mock(5), problem_approach: mock(5), teamwork: mock(5),
          jd_match: jdMatch,
          summary: "[NON-AI] Assessment based on keyword overlap."
        };
      });
    }

    // 3. Update master candidate list
    const updatedCandidates = candidates.map(c => {
      const result = apiResults.find(r => r.id === c.id);
      if (result) {
        return {
          ...c,
          quirk_scores: { 
            motivation: result.motivation, 
            stability: result.stability, 
            personality: result.personality, 
            problem_approach: result.problem_approach, 
            teamwork: result.teamwork 
          },
          jd_match_score: result.jd_match,
          summary: result.summary,
          last_job_id: jobId
        };
      }
      return c;
    });
    writeJson('candidates.json', updatedCandidates);

    // 4. Calculate Final Rankings
    const totalWeight = Object.values(weights).reduce((a, b) => a + (b || 1), 0);
    const ranked = updatedCandidates.map(c => {
      if (c.last_job_id !== jobId || !c.quirk_scores) return { ...c, total_score: 0 };
      
      const q = c.quirk_scores;
      // Extract numeric scores for math
      const s = {
        mot: q.motivation?.score || 1,
        sta: q.stability?.score || 1,
        per: q.personality?.score || 1,
        pro: q.problem_approach?.score || 1,
        tea: q.teamwork?.score || 1
      };

      const weightedVibe = ((s.mot * weights.motivation) + (s.sta * weights.stability) + (s.per * weights.personality) + (s.pro * weights.problem_approach) + (s.tea * weights.teamwork)) / totalWeight;
      const total = Math.round(((c.jd_match_score * 0.5) + (weightedVibe * 5)) * 10) / 10;
      return { ...c, total_score: total };
    }).sort((a, b) => (b.total_score || 0) - (a.total_score || 0));

    const finalResult = { jobId, candidates: ranked, isDemo: !apiUsed };
    writeJson('rankings.json', finalResult);
    res.json(ranked);

  } catch (error) {
    console.error("Critical Rank Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => console.log(`Server ready on ${port}`));
