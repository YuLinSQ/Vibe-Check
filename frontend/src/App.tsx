import { useState, useEffect } from 'react'
import './App.css'

const Logo = () => (
  <svg width="40" height="40" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '12px' }}>
    <path d="M60 10 L75 35 L45 35 Z" fill="#ec4899" />
    <circle cx="60" cy="8" r="3" fill="#fbcfe8" />
    <path d="M25 45 C 25 30, 45 30, 45 45 C 45 60, 25 60, 25 45" fill="#3b82f6" />
    <path d="M35 55 L35 75" stroke="#94a3b8" strokeWidth="2" fill="none" />
    <path d="M20 55 L40 75 L85 25" stroke="#10b981" strokeWidth="10" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const RadarChart = ({ scores }: { scores: any }) => {
  const points = [
    { label: 'motivation', angle: 0 },
    { label: 'personality', angle: 72 },
    { label: 'teamwork', angle: 144 },
    { label: 'problem_approach', angle: 216 },
    { label: 'stability', angle: 288 },
  ];
  const getPoint = (angle: number, value: number) => {
    const r = (value / 10) * 40;
    const rad = (angle - 90) * (Math.PI / 180);
    return `${50 + r * Math.cos(rad)},${50 + r * Math.sin(rad)}`;
  };
  const areaPath = points.map(p => getPoint(p.angle, scores[p.label]?.score || 0)).join(' ');
  return (
    <div className="radar-container">
      <svg viewBox="0 0 100 100" width="100%" height="100%">
        {[2.5, 5, 7.5, 10].map(v => <polygon key={v} className="radar-grid" points={points.map(p => getPoint(p.angle, v)).join(' ')} />)}
        {points.map(p => <line key={p.label} className="radar-axis" x1="50" y1="50" x2={getPoint(p.angle, 10).split(',')[0]} y2={getPoint(p.angle, 10).split(',')[1]} />)}
        <polygon className="radar-area" points={areaPath} />
      </svg>
    </div>
  );
};

function App() {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [allRankings, setAllRankings] = useState<any>({});
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

  const loadData = async () => {
    try {
      const candRes = await fetch('http://localhost:5000/api/candidates');
      const jobRes = await fetch('http://localhost:5000/api/jobs');
      const rankRes = await fetch('http://localhost:5000/api/rankings');
      
      if (!candRes.ok || !jobRes.ok || !rankRes.ok) throw new Error("Server responded with an error");

      const candData = await candRes.json();
      const jobData = await jobRes.json();
      const rankData = await rankRes.json();

      setJobs(Array.isArray(jobData) ? jobData : []);
      setAllRankings(rankData || {});

      // Contextual data for selected job
      if (selectedJobId && rankData[selectedJobId]) {
        setCandidates(rankData[selectedJobId].candidates || []);
        setIsDemo(!!rankData[selectedJobId].isDemo);
      } else {
        setCandidates(Array.isArray(candData) ? candData : []);
        setIsDemo(false);
      }
      setError(null);
    } catch (err) {
      console.error("Data load failed:", err);
      setError("Cannot connect to backend. Make sure it's running.");
    }
  };

  useEffect(() => { loadData(); }, [selectedJobId]);

  const handleJobSelect = (e: any) => {
    const id = e.target.value;
    setSelectedJobId(id);
    const job = jobs.find(j => j.id === id);
    if (job) { setJobDescription(job.description); setJobTitle(job.title); }
    else { setJobDescription(''); setJobTitle(''); }
  };

  const handleSaveJob = async () => {
    if (!jobTitle || !jobDescription) return alert("Title and Description required");
    try {
      const res = await fetch('http://localhost:5000/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: jobTitle, description: jobDescription })
      });
      if (res.ok) { alert("Job Saved!"); loadData(); }
    } catch (e) { alert("Failed to save job"); }
  };

  const handleRank = async () => {
    if (!selectedJobId) return alert("Select a job first");
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('http://localhost:5000/api/rank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobDescription, weights, reAnalyzeAll, jobId: selectedJobId })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Ranking failed");
      }
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCandidate = async (e: any) => {
    e.preventDefault();
    try {
      await fetch('http://localhost:5000/api/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCandidate)
      });
      setNewCandidate({ name: '', resume: '', cover_letter: '', linkedin: '', github: '' });
      loadData();
    } catch (e) { alert("Failed to add candidate"); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this candidate permanently?")) return;
    try {
      await fetch(`http://localhost:5000/api/candidates/${id}`, { method: 'DELETE' });
      loadData();
    } catch (e) { alert("Delete failed"); }
  };

  const handleSlackExport = () => {
    alert("Slack Integration: Sending Top " + finalPool.length + " candidates to recruiting channel... (Demo Only)");
  };

  // --- RENDERING LOGIC ---
  const currentRanking = allRankings[selectedJobId];
  const isRanked = !!currentRanking;
  const filteredJobs = jobs.filter(j => j.title.toLowerCase().includes(searchTerm.toLowerCase()) || j.id.includes(searchTerm));
  
  let finalPool = candidates.map(c => {
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
      {loading && <div className="loading-overlay"><div className="spinner"></div><p>Ranking with AI...</p></div>}
      
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
              <div className="weight-header"><span style={{textTransform: 'capitalize'}}>{k.replace('_', ' ')}</span><span>{v}x</span></div>
              <input type="range" min="0.1" max="3" step="0.1" value={v} onChange={e => setWeights({...weights, [k]: parseFloat(e.target.value)})} />
            </div>
          ))}
        </div>

        <div className="filter-group">
          <input type="checkbox" checked={filterEnabled} onChange={e => setFilterEnabled(e.target.checked)} />
          <label>Hide Match &lt;</label>
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

        <div style={{ marginTop: 'auto', paddingTop: '2rem' }}>
          <button className="slack-button" onClick={handleSlackExport}>
            <svg width="18" height="18" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <path d="M22,51.2 c0,5.8-4.7,10.6-10.6,10.6S0.8,57.1,0.8,51.2s4.7-10.6,10.6-10.6h10.6V51.2z M27.3,51.2c0-5.8,4.7-10.6,10.6-10.6s10.6,4.7,10.6,10.6v26.5c0,5.8-4.7,10.6-10.6,10.6s-10.6-4.7-10.6-10.6V51.2z" fill="white"/>
              <path d="M48.8,22c-5.8,0-10.6-4.7-10.6-10.6S42.9,0.8,48.8,0.8s10.6,4.7,10.6,10.6v10.6H48.8z M48.8,27.3c5.8,0,10.6,4.7,10.6,10.6s-4.7,10.6-10.6,10.6H22.2c-5.8,0-10.6-4.7-10.6-10.6s4.7-10.6,10.6-10.6H48.8z" fill="white"/>
              <path d="M78,48.8c0-5.8,4.7-10.6,10.6-10.6s10.6,4.7,10.6,10.6s-4.7,10.6-10.6,10.6H78V48.8z M72.7,48.8c0,5.8-4.7,10.6-10.6,10.6s-10.6-4.7-10.6-10.6V22.2c0-5.8,4.7-10.6,10.6-10.6s10.6,4.7,10.6,10.6V48.8z" fill="white"/>
              <path d="M51.2,78c5.8,0,10.6,4.7,10.6,10.6s-4.7,10.6-10.6,10.6s-10.6-4.7-10.6-10.6V78H51.2z M51.2,72.7c-5.8,0-10.6-4.7-10.6-10.6s4.7-10.6,10.6-10.6h26.5c5.8,0,10.6,4.7,10.6,10.6s-4.7,10.6-10.6,10.6H51.2z" fill="white"/>
            </svg>
            Shortlist to Slack
          </button>
        </div>
        {error && <p style={{color: 'red', fontSize: '0.8rem', marginTop: '1rem'}}>{error}</p>}
      </aside>

      <main className="main-content">
        <h1>Rankings {isDemo && isRanked && <span className="badge" style={{background: '#fef3c7', color: '#92400e', border: '1px solid #f59e0b', fontSize: '0.8rem', verticalAlign: 'middle', marginLeft: '1rem'}}>NON-AI</span>}</h1>
        <div className="candidate-list">
          {finalPool.map(c => (
            <div key={c.id} className="candidate-card" onClick={() => { setNewCandidate(c); setEditingId(c.id); window.scrollTo({top: 9999, behavior: 'smooth'}); }}>
              <button className="delete-btn" title="Delete candidate" onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }}>×</button>
              <div className="candidate-header"><h3>{c.name}</h3><span className="total-score">{c.total_score ?? '--'}</span></div>
              <div className="score-badges">
                <div className="badge jd">JD Match: {c.current_assessment?.jd_match_score ? `${c.current_assessment.jd_match_score}%` : 'Unranked'}</div>
              </div>
              <p className="candidate-summary">{c.current_assessment?.summary || "Awaiting ranking for this role."}</p>
              
              <div className="quirk-grid">
                {c.current_assessment?.quirk_scores ? (
                  <>
                    <RadarChart scores={c.current_assessment.quirk_scores} />
                    <div className="quirk-list">
                      {Object.entries(c.current_assessment.quirk_scores).map(([k, v]: any) => (
                        <div key={k} className="quirk-item">
                          <span style={{fontWeight: '700', textTransform: 'capitalize', color: 'var(--text-muted)'}}>{k.replace('_', ' ')}</span>
                          <span>{v.reason} <b style={{color: 'var(--primary)'}}>{v.score}/10</b></span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <span style={{color: 'var(--text-muted)', fontSize: '0.8rem'}}>No vibe data for this role.</span>
                )}
              </div>
            </div>
          ))}
        </div>

        <section className="manage-section">
          <h3>{editingId ? "Edit" : "Add"} Candidate</h3>
          <form className="candidate-form" onSubmit={handleAddCandidate}>
            <input placeholder="Name" value={newCandidate.name} onChange={e => setNewCandidate({...newCandidate, name: e.target.value})} />
            <input placeholder="LinkedIn URL" value={newCandidate.linkedin} onChange={e => setNewCandidate({...newCandidate, linkedin: e.target.value})} />
            <textarea placeholder="Resume Text" value={newCandidate.resume} onChange={e => setNewCandidate({...newCandidate, resume: e.target.value})} />
            <textarea placeholder="Cover Letter" value={newCandidate.cover_letter} onChange={e => setNewCandidate({...newCandidate, cover_letter: e.target.value})} />
            <input placeholder="GitHub URL" value={newCandidate.github} onChange={e => setNewCandidate({...newCandidate, github: e.target.value})} />
            <button type="submit" className="add-btn">{editingId ? "Update" : "Add"} Candidate</button>
          </form>
        </section>
      </main>
    </div>
  )
}

export default App
