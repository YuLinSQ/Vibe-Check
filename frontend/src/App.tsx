import { useState, useEffect } from 'react'
import './App.css'

const Logo = () => (
  <svg width="40" height="40" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '12px' }}>
    {/* Party Hat */}
    <path d="M60 10 L75 35 L45 35 Z" fill="#ec4899" />
    <circle cx="60" cy="8" r="3" fill="#fbcfe8" />
    
    {/* Balloon */}
    <path d="M25 45 C 25 30, 45 30, 45 45 C 45 60, 25 60, 25 45" fill="#3b82f6" />
    <path d="M35 55 L35 75" stroke="#94a3b8" strokeWidth="2" fill="none" />
    
    {/* Green Checkmark */}
    <path d="M20 55 L40 75 L85 25" stroke="#10b981" strokeWidth="10" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function App() {
  // --- STATE ---
  const [candidates, setCandidates] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [allRankings, setAllRankings] = useState<any>({}); // { jobId: { candidates: [], isDemo: bool } }
  const [jobDescription, setJobDescription] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [selectedJobId, setSelectedJobId] = useState('');
  const [isDemo, setIsDemo] = useState(false);
  const [weights, setWeights] = useState({ motivation: 1, stability: 1, personality: 1, problem_approach: 1, teamwork: 1 });
  const [filterEnabled, setFilterEnabled] = useState(false);
  const [jdThreshold, setJdThreshold] = useState(50);
  const [limitEnabled, setLimitEnabled] = useState(false);
  const [topLimit, setTopLimit] = useState(5);
  const [reAnalyzeAll, setReAnalyzeAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newCandidate, setNewCandidate] = useState({ name: '', resume: '', cover_letter: '', linkedin: '', github: '' });

  // --- DATA FETCHING ---
  const loadData = async () => {
    try {
      const [candRes, jobRes, rankRes] = await Promise.all([
        fetch('http://localhost:5000/api/candidates'),
        fetch('http://localhost:5000/api/jobs'),
        fetch('http://localhost:5000/api/rankings')
      ]);
      
      const candData = await candRes.json();
      const jobData = await jobRes.json();
      const rankData = await rankRes.json();

      setJobs(jobData);
      setAllRankings(rankData);

      // Current job specific data
      const currentRanking = rankData[selectedJobId];
      if (currentRanking) {
        setCandidates(currentRanking.candidates);
        setIsDemo(!!currentRanking.isDemo);
      } else {
        setCandidates(candData);
        setIsDemo(false);
      }
    } catch (err) {
      setError("Failed to connect to backend.");
    }
  };

  useEffect(() => { loadData(); }, [selectedJobId]);

  // --- HANDLERS ---
  const handleJobSelect = (e: any) => {
    const id = e.target.value;
    setSelectedJobId(id);
    const job = jobs.find(j => j.id === id);
    if (job) {
      setJobDescription(job.description);
      setJobTitle(job.title);
    } else {
      setJobDescription('');
      setJobTitle('');
    }
  };

  const handleSaveJob = async () => {
    if (!jobTitle || !jobDescription) return alert("Title and Description required");
    await fetch('http://localhost:5000/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: jobTitle, description: jobDescription })
    });
    alert("Job Saved!");
    loadData();
  };

  const handleRank = async () => {
    if (!selectedJobId) return alert("Select a job first");
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/rank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobDescription, weights, reAnalyzeAll, jobId: selectedJobId })
      });
      if (!res.ok) throw new Error("Rank failed");
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCandidate = async (e: any) => {
    e.preventDefault();
    await fetch('http://localhost:5000/api/candidates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCandidate)
    });
    setNewCandidate({ name: '', resume: '', cover_letter: '', linkedin: '', github: '' });
    loadData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete?")) return;
    await fetch(`http://localhost:5000/api/candidates/${id}`, { method: 'DELETE' });
    loadData();
  };

  // --- RENDERING LOGIC ---
  const currentRanking = allRankings[selectedJobId];
  const isRanked = !!currentRanking;
  const filteredJobs = jobs.filter(j => j.title.toLowerCase().includes(searchTerm.toLowerCase()) || j.id.includes(searchTerm));
  
  let finalPool = candidates.map(c => {
    // If not ranked for this job, hide scores
    if (!isRanked) return { ...c, total_score: undefined, current_assessment: null };
    return c;
  });

  if (filterEnabled) {
    finalPool = finalPool.filter(c => (c.current_assessment?.jd_match_score ?? 0) >= jdThreshold);
  }
  if (limitEnabled) {
    finalPool = finalPool.slice(0, topLimit);
  }

  return (
    <div className="app-container">
      {loading && <div className="loading-overlay"><div className="spinner"></div><p>Ranking...</p></div>}
      
      <aside className="sidebar">
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
          <Logo />
          <h2 style={{ margin: 0 }}>Vibe Check</h2>
        </div>
        <input className="job-search-input" placeholder="Search jobs..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        <select value={selectedJobId} onChange={handleJobSelect}>
          <option value="">-- Select Job --</option>
          {filteredJobs.map(j => <option key={j.id} value={j.id}>[{j.id}] {j.title}</option>)}
        </select>
        <input className="job-title-input" placeholder="Job Title" value={jobTitle} onChange={e => setJobTitle(e.target.value)} />
        <textarea placeholder="JD Details" value={jobDescription} onChange={e => setJobDescription(e.target.value)} />
        <button className="secondary-button" onClick={handleSaveJob}>Save Job</button>
        
        <button className="rank-button" onClick={handleRank} disabled={loading}>Rank Candidates</button>

        <div className="weight-controls">
          {Object.entries(weights).map(([k, v]) => (
            <div key={k} className="weight-item">
              <div className="weight-header"><span style={{textTransform: 'capitalize'}}>{k}</span><span>{v}x</span></div>
              <input type="range" min="0.1" max="3" step="0.1" value={v} onChange={e => setWeights({...weights, [k]: parseFloat(e.target.value)})} />
            </div>
          ))}
        </div>

        <div className="filter-group">
          <input type="checkbox" checked={filterEnabled} onChange={e => setFilterEnabled(e.target.checked)} />
          <label>Hide JD Match &lt;</label>
          <input type="number" value={jdThreshold} onChange={e => setJdThreshold(parseInt(e.target.value) || 0)} style={{width: '45px'}} />
          <span>%</span>
        </div>
        <div className="filter-group">
          <input type="checkbox" checked={limitEnabled} onChange={e => setLimitEnabled(e.target.checked)} />
          <label>Show Top:</label>
          <input type="number" value={topLimit} onChange={e => setTopLimit(parseInt(e.target.value) || 0)} style={{width: '45px'}} />
          <span>results</span>
        </div>
        <div className="filter-group"><input type="checkbox" checked={reAnalyzeAll} onChange={e => setReAnalyzeAll(e.target.checked)} /><label>Force Re-analyze</label></div>
        {error && <p style={{color: 'red'}}>{error}</p>}
      </aside>

      <main className="main-content">
        <h1>Rankings {isDemo && isRanked && <span className="badge">NON-AI</span>}</h1>
        <div className="candidate-list">
          {finalPool.map(c => (
            <div key={c.id} className="candidate-card" onClick={() => { setNewCandidate(c); setEditingId(c.id); window.scrollTo({top: 9999, behavior: 'smooth'}); }}>
              <button className="delete-btn" onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }}>×</button>
              <div className="candidate-header"><h3>{c.name}</h3><span className="total-score">{c.total_score ?? '--'}</span></div>
              <div className="score-badges">
                <div className="badge jd">JD Match: {c.current_assessment?.jd_match_score ? `${c.current_assessment.jd_match_score}%` : 'Unranked'}</div>
              </div>
              <p className="candidate-summary">{c.current_assessment?.summary || "Awaiting ranking for this role."}</p>
              <div className="quirk-grid" style={{gridTemplateColumns: '1fr'}}>
                {c.current_assessment?.quirk_scores ? Object.entries(c.current_assessment.quirk_scores).map(([k, v]: any) => (
                  <div key={k} style={{fontSize: '0.8rem', borderBottom: '1px solid #f1f5f9', padding: '0.4rem 0'}}>
                    <span style={{fontWeight: '700', textTransform: 'capitalize'}}>{k}: </span>
                    <span>{v.reason} </span>
                    <span style={{fontWeight: '800', color: 'var(--primary)'}}>{v.score}/10</span>
                  </div>
                )) : <span>No vibe data for this role.</span>}
              </div>
            </div>
          ))}
        </div>

        <section className="manage-section">
          <h3>{editingId ? "Edit" : "Add"} Candidate</h3>
          <form className="candidate-form" onSubmit={handleAddCandidate}>
            <input placeholder="Name" value={newCandidate.name} onChange={e => setNewCandidate({...newCandidate, name: e.target.value})} />
            <input placeholder="LinkedIn" value={newCandidate.linkedin} onChange={e => setNewCandidate({...newCandidate, linkedin: e.target.value})} />
            <textarea placeholder="Resume" value={newCandidate.resume} onChange={e => setNewCandidate({...newCandidate, resume: e.target.value})} />
            <textarea placeholder="Cover Letter" value={newCandidate.cover_letter} onChange={e => setNewCandidate({...newCandidate, cover_letter: e.target.value})} />
            <input placeholder="GitHub" value={newCandidate.github} onChange={e => setNewCandidate({...newCandidate, github: e.target.value})} />
            <button type="submit" className="add-btn">{editingId ? "Update" : "Add"} Candidate</button>
          </form>
        </section>
      </main>
    </div>
  )
}

export default App
