import { useState, useEffect } from 'react'
import './App.css'

function App() {
  // --- STATE ---
  const [candidates, setCandidates] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [jobDescription, setJobDescription] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [selectedJobId, setSelectedJobId] = useState('');
  const [storedJobId, setStoredJobId] = useState<string | null>(null);
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
      setStoredJobId(rankData.jobId);
      setIsDemo(!!rankData.isDemo);

      // SOURCE OF TRUTH: If rankings exist for current jobId, use them. Otherwise use raw pool.
      // We merge rankings info (total_score) into the candidate objects if they match.
      setCandidates(candData);
      if (rankData.candidates && rankData.candidates.length > 0) {
        setCandidates(rankData.candidates); // Rankings endpoint returns the full sorted list
      }
    } catch (err) {
      setError("Failed to connect to backend.");
    }
  };

  useEffect(() => { loadData(); }, []);

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
  const isMatch = selectedJobId === storedJobId;
  const filteredJobs = jobs.filter(j => j.title.toLowerCase().includes(searchTerm.toLowerCase()) || j.id.includes(searchTerm));
  
  // Only show scores/summaries if the selected job matches the stored rankings
  const displayPool = candidates.map(c => {
    if (!isMatch) return { ...c, total_score: undefined, quirk_scores: undefined, summary: undefined };
    return c;
  });

  let finalPool = filterEnabled 
    ? displayPool.filter(c => (c.jd_match_score ?? 0) >= jdThreshold)
    : displayPool;

  if (limitEnabled) {
    finalPool = finalPool.slice(0, topLimit);
  }

  return (
    <div className="app-container">
      {loading && <div className="loading-overlay"><div className="spinner"></div><p>Ranking...</p></div>}
      
      <aside className="sidebar">
        <h2>Vibe Check</h2>
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
              <div className="weight-header"><span>{k}</span><span>{v}x</span></div>
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
        <h1>Rankings {isDemo && isMatch && <span className="badge">NON-AI</span>}</h1>
        <div className="candidate-list">
          {finalPool.map(c => (
            <div key={c.id} className="candidate-card" onClick={() => { setNewCandidate(c); setEditingId(c.id); window.scrollTo({top: 9999, behavior: 'smooth'}); }}>
              <button className="delete-btn" onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }}>×</button>
              <div className="candidate-header"><h3>{c.name}</h3><span className="total-score">{c.total_score ?? '--'}</span></div>
              <div className="score-badges">
                <div className="badge jd">JD Match: {c.jd_match_score ? `${c.jd_match_score}%` : 'Unranked'}</div>
              </div>
              <p className="candidate-summary">{c.summary || "Awaiting ranking for this role."}</p>
              <div className="quirk-grid" style={{gridTemplateColumns: '1fr'}}>
                {c.quirk_scores ? Object.entries(c.quirk_scores).map(([k, v]: any) => (
                  <div key={k} style={{fontSize: '0.8rem', borderBottom: '1px solid #f1f5f9', padding: '0.4rem 0'}}>
                    <span style={{fontWeight: '700', textTransform: 'capitalize'}}>{k}: </span>
                    <span>{v.reason} </span>
                    <span style={{fontWeight: '800', color: 'var(--primary)'}}>{v.score}/10</span>
                  </div>
                )) : <span>No vibe data.</span>}
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
