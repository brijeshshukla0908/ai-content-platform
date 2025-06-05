import React, { useState, useEffect } from 'react';
import './App.css';

const API_BASE = 'https://ai-platform-api.brijesh-ai-platform.workers.dev';

function App() {
  const [text, setText] = useState('');
  const [summary, setSummary] = useState('');
  const [prompt, setPrompt] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [title, setTitle] = useState('');
  const [savedContent, setSavedContent] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch saved content on component mount
  useEffect(() => {
    fetchSavedContent();
  }, []);

  const fetchSavedContent = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/retrieve`);
      const data = await response.json();
      setSavedContent(data.summaries || []);
    } catch (error) {
      console.error('Error fetching saved content:', error);
    }
  };

  const handleSummarize = async () => {
    if (!text.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/summarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      
      // FIX: Destructure 'summary' directly to avoid 'data' being unused
      const { summary } = await response.json(); 
      setSummary(summary || 'Summary not available');
    } catch (error) {
      console.error('Error summarizing:', error);
      setSummary('Error generating summary');
    }
    setLoading(false);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      
      const data = await response.json();
      setGeneratedContent(data.generated || 'Content not available');
    } catch (error) {
      console.error('Error generating content:', error);
      setGeneratedContent('Error generating content');
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!title.trim() || !text.trim() || !summary.trim()) {
      alert('Please fill in title, original text, and generate a summary first');
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE}/api/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          originalText: text,
          summary,
          generatedContent
        })
      });
      
      const data = await response.json();
      alert('Content saved successfully!');
      
      // Clear form and refresh saved content
      setTitle('');
      setText('');
      setSummary('');
      setGeneratedContent('');
      setPrompt('');
      fetchSavedContent();
    } catch (error) {
      console.error('Error saving content:', error);
      alert('Error saving content');
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>🤖 AI Content Platform</h1>
        <p>Powered by Cloudflare Workers AI</p>
      </header>

      <main className="container">
        {/* Text Summarization Section */}
        <section className="section">
          <h2>📝 Text Summarization</h2>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter text to summarize..."
            rows="6"
            className="textarea"
          />
          <button 
            onClick={handleSummarize} 
            disabled={loading || !text.trim()}
            className="button primary"
          >
            {loading ? 'Summarizing...' : 'Summarize Text'}
          </button>
          
          {summary && (
            <div className="result">
              <h3>Summary:</h3>
              <p>{summary}</p>
            </div>
          )}
        </section>

        {/* Content Generation Section */}
        <section className="section">
          <h2>✨ Content Generation</h2>
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter a prompt for content generation..."
            className="input"
          />
          <button 
            onClick={handleGenerate} 
            disabled={loading || !prompt.trim()}
            className="button primary"
          >
            {loading ? 'Generating...' : 'Generate Content'}
          </button>
          
          {generatedContent && (
            <div className="result">
              <h3>Generated Content:</h3>
              <p>{generatedContent}</p>
            </div>
          )}
        </section>

        {/* Save Content Section */}
        <section className="section">
          <h2>💾 Save Content</h2>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter a title for your content..."
            className="input"
          />
          <button 
            onClick={handleSave}
            disabled={!title.trim() || !text.trim() || !summary.trim()}
            className="button success"
          >
            Save Content
          </button>
        </section>

        {/* Saved Content Section */}
        <section className="section">
          <h2>📚 Saved Content</h2>
          <button onClick={fetchSavedContent} className="button secondary">
            Refresh
          </button>
          
          {savedContent.length === 0 ? (
            <p>No saved content yet.</p>
          ) : (
            <div className="saved-content">
              {savedContent.map((item) => (
                <div key={item.id} className="content-card">
                  <h3>{item.title}</h3>
                  <p>{item.summary_text}</p>
                  <small>Saved: {new Date(item.created_at).toLocaleString()}</small>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;