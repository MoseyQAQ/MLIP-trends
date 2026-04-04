import { useState, useMemo } from 'react'

function DoiLink({ doi }) {
  if (!doi) return null
  const bare = doi.replace(/^https?:\/\/doi\.org\//, '')
  return (
    <a href={`https://doi.org/${bare}`} target="_blank" rel="noopener" onClick={e => e.stopPropagation()}>
      DOI
    </a>
  )
}

function ExternalLinks({ links }) {
  if (!links || Object.keys(links).length === 0) return null
  return (
    <>
      {Object.entries(links).map(([name, url]) => (
        <a key={name} href={url} target="_blank" rel="noopener" onClick={e => e.stopPropagation()} style={{ marginLeft: 6 }}>
          {name}
        </a>
      ))}
    </>
  )
}

export default function ProjectView({ papers, communityMap, selectedProjects, onToggle }) {
  const [expanded, setExpanded] = useState({})

  const projects = useMemo(() => {
    const map = {}
    for (const p of papers) {
      const pid = p.project_id || p.paper_id
      if (!map[pid]) {
        map[pid] = {
          project_id: pid,
          community: p.community,
          papers: [],
          totalCitations: 0,
        }
      }
      map[pid].papers.push(p)
      map[pid].totalCitations += p.cited_by_count || 0
    }
    for (const proj of Object.values(map)) {
      proj.papers.sort((a, b) => (a.publication_year || 9999) - (b.publication_year || 9999))
    }
    return Object.values(map).sort((a, b) => b.totalCitations - a.totalCitations)
  }, [papers])

  if (projects.length === 0) {
    return <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: 24 }}>No papers in this category yet.</p>
  }

  const toggleExpand = (pid) => {
    setExpanded(prev => ({ ...prev, [pid]: !prev[pid] }))
  }

  return (
    <div>
      {projects.map((proj) => {
        const isOpen = !!expanded[proj.project_id]
        const isSelected = selectedProjects.includes(proj.project_id)
        const community = communityMap[proj.community]
        return (
          <div className="project-group" key={proj.project_id}>
            <div className="project-header" onClick={() => toggleExpand(proj.project_id)}>
              <div className="project-header-left">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggle(proj.project_id)}
                  onClick={e => e.stopPropagation()}
                  style={{ cursor: 'pointer' }}
                />
                <span className={`expand-icon ${isOpen ? 'expanded' : ''}`}>&#9654;</span>
                <span
                  className="community-badge"
                  style={{
                    backgroundColor: (community?.color || '#8c8c8c') + '20',
                    color: community?.color || '#8c8c8c',
                  }}
                >
                  {community?.name || proj.community}
                </span>
                <span className="project-name">{proj.project_id}</span>
              </div>
              <div className="project-stats">
                {proj.papers.length} paper{proj.papers.length > 1 ? 's' : ''}
                {' \u00B7 '}
                {proj.totalCitations.toLocaleString()} citations
              </div>
            </div>
            {isOpen && (
              <div className="project-papers">
                <table className="ranking-table">
                  <thead>
                    <tr>
                      <th>Paper</th>
                      <th>Year</th>
                      <th style={{ textAlign: 'right' }}>Citations</th>
                    </tr>
                  </thead>
                  <tbody>
                    {proj.papers.map(paper => (
                      <tr key={paper.paper_id}>
                        <td>
                          <div className="paper-title">{paper.title || paper.paper_id}</div>
                          <div className="paper-links">
                            <DoiLink doi={paper.doi} />
                            <ExternalLinks links={paper.links} />
                          </div>
                        </td>
                        <td style={{ color: 'var(--text-secondary)' }}>{paper.publication_year || '-'}</td>
                        <td className="citation-count" style={{ textAlign: 'right' }}>
                          {(paper.cited_by_count || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
