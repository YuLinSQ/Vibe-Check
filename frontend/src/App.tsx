import { useState, useEffect } from 'react'
import './App.css'

interface QuirkScores {
  motivation: number;
  stability: number;
  personality: number;
  problem_approach: number;
  teamwork: number;
}

interface RankedCandidate {
  id: string;
  name: string;
  total_score: number;
  jd_match_score: number;
  quirk_scores: QuirkScores;
  summary: string;
}

function App() {
  const [jobDescription, setJobDescription] = useState('');
  const [weights, setWeights] = useState({
    motivation: 1,
    stability: 1,
    personality: 1,
    problem_approach: 1,
    teamwork: 1
  });
  const [candidates, setCandidates] = useState<RankedCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleWeightChange = (quirk: keyof typeof weights, value: string) => {
    setWeights(prev => ({
      ...prev,
      [quirk]: parseFloat(value)
    }));
  };

  const handleRank = async () => {
    if (!jobDescription) {
      alert('Please enter a job description');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:5000/api/rank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobDescription, weights })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to rank candidates');
      }
      setCandidates(data);
    } catch (err: any) {
      setError(err.message || 'Error ranking candidates. Make sure the backend is running and the API key is set.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      {loading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p>Analyzing candidate vibes...</p>
        </div>
      )}

      <aside className="sidebar">
        <h2>Vibe Check</h2>
        
        <div className="form-group">
          <label>Job Description</label>
          <textarea 
            placeholder="Paste the job requirements here..."
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
          />
        </div>

        <div className="weight-controls">
          <label>Quirk Weights</label>
          {Object.entries(weights).map(([quirk, value]) => (
            <div key={quirk} className="weight-item">
              <div className="weight-header">
                <span style={{textTransform: 'capitalize'}}>{quirk.replace('_', ' ')}</span>
                <span>{value}x</span>
              </div>
              <input 
                type="range" 
                min="0.1" 
                max="3" 
                step="0.1" 
                value={value}
                onChange={(e) => handleWeightChange(quirk as keyof typeof weights, e.target.value)}
              />
            </div>
          ))}
        </div>

        <button className="rank-button" onClick={handleRank} disabled={loading}>
          Rank Candidates
        </button>

        {error && <p style={{color: 'red', fontSize: '0.8rem'}}>{error}</p>}
      </aside>

      <main className="main-content">
        <header>
          <h1>Candidate Rankings</h1>
          <p style={{color: 'var(--text-muted)'}}>
            {candidates.length > 0 
              ? `Showing ${candidates.length} candidates ranked by your criteria.`
              : 'Enter a JD and adjust weights to see rankings.'}
          </p>
        </header>

        <div className="candidate-list">
          {candidates.map((candidate) => (
            <div key={candidate.id} className="candidate-card">
              <div className="candidate-header">
                <span className="candidate-name">{candidate.name}</span>
                <span className="total-score">{candidate.total_score}</span>
              </div>
              
              <div className="score-badges">
                <div className="badge jd">JD Match: {candidate.jd_match_score}%</div>
                <div className="badge">Vibe Adjusted</div>
              </div>

              <p className="candidate-summary">{candidate.summary}</p>

              <div className="quirk-grid">
                {Object.entries(candidate.quirk_scores).map(([label, score]) => (
                  <div key={label} className="quirk-stat">
                    <span className="quirk-label">{label.slice(0, 4)}</span>
                    <span className="quirk-value">{score}/10</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

export default App
