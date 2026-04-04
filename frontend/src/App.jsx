import { useState, useEffect, useMemo, useCallback } from 'react'
import Markdown from 'react-markdown'
import CitationTrendChart from './components/CitationTrendChart'
import RankingTable from './components/RankingTable'
import ProjectView from './components/ProjectView'
import CommunityView from './components/CommunityView'
import './App.css'

const CATEGORIES = [
  { id: 'all', name: 'All', icon: '\u{1F4CA}' },
  { id: 'architecture', name: 'Architecture', icon: '\u{1F9E9}' },
  { id: 'foundation_model', name: 'Foundation Model', icon: '\u{1F30D}' },
  { id: 'software', name: 'Software', icon: '\u{1F4BB}' },
  { id: 'dataset', name: 'Dataset', icon: '\u{1F4BE}' },
  { id: 'extension', name: 'Extension', icon: '\u{1F527}' },
]

const VIEW_MODES = [
  { id: 'community', name: 'Community' },
  { id: 'project', name: 'Project' },
  { id: 'paper', name: 'Paper' },
]

function App() {
  const [data, setData] = useState(null)
  const [activeTab, setActiveTab] = useState('all')
  const [viewMode, setViewMode] = useState('community')
  const [selectedItems, setSelectedItems] = useState([])
  const [theme, setTheme] = useState('light')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [showAbout, setShowAbout] = useState(false)
  const [aboutContent, setAboutContent] = useState('')
  const [error, setError] = useState(null)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/processed_data.json`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then(setData)
      .catch(err => setError(err.message))
  }, [])

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}about.md`)
      .then(res => res.ok ? res.text() : '')
      .then(setAboutContent)
      .catch(() => {})
  }, [])

  const communityMap = useMemo(() => {
    if (!data) return {}
    return Object.fromEntries(data.communities.map(c => [c.id, c]))
  }, [data])

  const uniquePapers = useMemo(() => {
    if (!data) return []
    const seen = new Set()
    return data.papers.filter(p => {
      const key = p.doi || p.title
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [data])

  const filteredPapers = useMemo(() => {
    if (!data) return []
    if (activeTab === 'all') return uniquePapers
    return data.papers.filter(p => p.category === activeTab)
  }, [data, activeTab, uniquePapers])

  const stats = useMemo(() => {
    if (!data) return {}
    const totalCitations = uniquePapers.reduce((s, p) => s + (p.cited_by_count || 0), 0)
    const communities = new Set(uniquePapers.map(p => p.community)).size
    return { papers: uniquePapers.length, totalCitations, communities }
  }, [data, uniquePapers])

  // Auto-select top items when tab or viewMode changes
  useEffect(() => {
    if (filteredPapers.length === 0) return
    if (viewMode === 'project') {
      const projects = [...new Set(filteredPapers.map(p => p.project_id || p.paper_id))]
      setSelectedItems(projects.slice(0, 5))
    } else if (viewMode === 'community') {
      const comms = [...new Set(filteredPapers.map(p => p.community || 'independent'))]
      setSelectedItems(comms.slice(0, 5))
    } else {
      setSelectedItems(filteredPapers.slice(0, 5).map(p => p.paper_id))
    }
  }, [activeTab, viewMode, filteredPapers.length])

  const toggleItem = useCallback((itemId) => {
    setSelectedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : prev.length < 10 ? [...prev, itemId] : prev
    )
  }, [])

  const handleCategoryClick = (catId) => {
    setActiveTab(catId)
    setShowAbout(false)
    // All tab has no Project view
    if (catId === 'all' && viewMode === 'project') {
      setViewMode('community')
    }
    // Sub-category tabs default to community view
    if (catId !== 'all' && viewMode === 'paper') {
      setViewMode('community')
    }
  }

  const availableViewModes = activeTab === 'all'
    ? VIEW_MODES.filter(m => m.id !== 'project')
    : VIEW_MODES

  if (error) {
    return <div className="app"><p style={{ padding: 40, textAlign: 'center' }}>Failed to load data: {error}</p></div>
  }

  if (!data) {
    return <div className="app"><p style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>Loading data...</p></div>
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <h1>MLIP Trends</h1>
          <div className="header-meta">
            <span>Data: OpenAlex</span>
            <span>Updated: {data.metadata.generated_at?.split('T')[0]}</span>
          </div>
        </div>
        <div className="header-right">
          <button
            className="theme-toggle"
            onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
            title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {theme === 'light' ? '\u{263E}' : '\u{2600}'}
          </button>
        </div>
      </header>

      <div className="layout">
        {/* Sidebar */}
        <nav className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarCollapsed(c => !c)}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? '\u{2261}' : '\u{2190}'}
          </button>

          <div className="sidebar-section">
            {!sidebarCollapsed && <div className="sidebar-section-title">Categories</div>}
            {CATEGORIES.map(cat => {
              const count = cat.id === 'all'
                ? uniquePapers.length
                : data.papers.filter(p => p.category === cat.id).length
              if (cat.id !== 'all' && count === 0) return null
              return (
                <button
                  key={cat.id}
                  className={`sidebar-item ${activeTab === cat.id && !showAbout ? 'active' : ''}`}
                  onClick={() => handleCategoryClick(cat.id)}
                  title={sidebarCollapsed ? `${cat.name} (${count})` : undefined}
                >
                  <span className="item-icon">{cat.icon}</span>
                  <span className="item-label" style={{ marginLeft: 8, flex: 1 }}>{cat.name}</span>
                  <span className="count">{count}</span>
                </button>
              )
            })}
            <button
              className={`sidebar-item ${showAbout ? 'active' : ''}`}
              onClick={() => setShowAbout(true)}
              title={sidebarCollapsed ? 'About' : undefined}
            >
              <span className="item-icon">{'\u{2139}\u{FE0F}'}</span>
              <span className="item-label" style={{ marginLeft: 8 }}>About</span>
            </button>
          </div>
        </nav>

        {/* Main content */}
        <main className="content">
          {showAbout ? (
            <div className="about-container">
              <Markdown>{aboutContent}</Markdown>
            </div>
          ) : (
            <>
              <div className="stats-bar">
                <div className="stat-card">
                  <div className="label">Papers</div>
                  <div className="value">{activeTab === 'all' ? stats.papers : filteredPapers.length}</div>
                </div>
                <div className="stat-card">
                  <div className="label">Citations</div>
                  <div className="value">
                    {(activeTab === 'all'
                      ? stats.totalCitations
                      : filteredPapers.reduce((s, p) => s + (p.cited_by_count || 0), 0)
                    )?.toLocaleString()}
                  </div>
                </div>
                <div className="stat-card">
                  <div className="label">Communities</div>
                  <div className="value">
                    {activeTab === 'all'
                      ? stats.communities
                      : new Set(filteredPapers.map(p => p.community)).size}
                  </div>
                </div>
              </div>

              <div className="main-layout">
                <div className="chart-container">
                  <h2>Citation Trends</h2>
                  <CitationTrendChart
                    papers={filteredPapers}
                    theme={theme}
                    viewMode={viewMode}
                    selectedIds={selectedItems}
                    communityMap={communityMap}
                  />
                </div>

                <div className="chart-container">
                  <div className="chart-header">
                    <h2>
                      {activeTab === 'all' ? 'Overall' : CATEGORIES.find(c => c.id === activeTab)?.name}
                      {viewMode === 'project' ? ' - By Project' : viewMode === 'community' ? ' - By Community' : ' - All Papers'}
                    </h2>
                    <div className="view-switcher">
                      {availableViewModes.map(m => (
                        <button
                          key={m.id}
                          className={`view-btn ${viewMode === m.id ? 'active' : ''}`}
                          onClick={() => setViewMode(m.id)}
                        >
                          {m.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {viewMode === 'paper' && (
                    <RankingTable
                      papers={filteredPapers}
                      communityMap={communityMap}
                      selectedPapers={selectedItems}
                      onToggle={toggleItem}
                    />
                  )}

                  {viewMode === 'project' && (
                    <ProjectView
                      papers={filteredPapers}
                      communityMap={communityMap}
                      selectedProjects={selectedItems}
                      onToggle={toggleItem}
                    />
                  )}

                  {viewMode === 'community' && (
                    <CommunityView
                      papers={filteredPapers}
                      communityMap={communityMap}
                      selectedCommunities={selectedItems}
                      onToggle={toggleItem}
                    />
                  )}
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      <footer className="footer">
        MLIP Trends &mdash; Citation data from{' '}
        <a href="https://openalex.org" target="_blank" rel="noopener">OpenAlex</a>
        {' | '}
        <a href="https://github.com/MoseyQAQ/MLIP-trends" target="_blank" rel="noopener">GitHub</a>
      </footer>
    </div>
  )
}

export default App
