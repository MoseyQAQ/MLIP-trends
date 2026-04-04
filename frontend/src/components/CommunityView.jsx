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

export default function CommunityView({ papers, communityMap, selectedCommunities, onToggle }) {
  const [expanded, setExpanded] = useState({})

  const groups = useMemo(() => {
    const map = {}
    for (const p of papers) {
      const cid = p.community || 'independent'
      if (!map[cid]) {
        map[cid] = { community_id: cid, papers: [], totalCitations: 0 }
      }
      map[cid].papers.push(p)
      map[cid].totalCitations += p.cited_by_count || 0
    }
    for (const g of Object.values(map)) {
      g.papers.sort((a, b) => (b.cited_by_count || 0) - (a.cited_by_count || 0))
    }
    return Object.values(map).sort((a, b) => b.totalCitations - a.totalCitations)
  }, [papers])

  if (groups.length === 0) {
    return <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: 24 }}>No papers in this category yet.</p>
  }

  const toggleExpand = (cid) => {
    setExpanded(prev => ({ ...prev, [cid]: !prev[cid] }))
  }

  return (
    <div>
      {groups.map(group => {
        const community = communityMap[group.community_id]
        const isSelected = selectedCommunities.includes(group.community_id)
        const isOpen = !!expanded[group.community_id]
        return (
          <div className="community-group" key={group.community_id}>
            <div className="community-header" onClick={() => toggleExpand(group.community_id)} style={{ cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggle(group.community_id)}
                onClick={e => e.stopPropagation()}
                style={{ cursor: 'pointer' }}
              />
              <span className={`expand-icon ${isOpen ? 'expanded' : ''}`}>&#9654;</span>
              <span
                className="community-color-dot"
                style={{ backgroundColor: community?.color || '#8c8c8c' }}
              />
              <span className="community-name">{community?.name || group.community_id}</span>
              <span className="community-stats">
                {group.papers.length} paper{group.papers.length > 1 ? 's' : ''}
                {' \u00B7 '}
                {group.totalCitations.toLocaleString()} citations
              </span>
            </div>
            {isOpen && (
              <table className="ranking-table">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>#</th>
                    <th>Paper</th>
                    <th>Year</th>
                    <th style={{ textAlign: 'right' }}>Citations</th>
                  </tr>
                </thead>
                <tbody>
                  {group.papers.map((paper, i) => (
                    <tr key={paper.paper_id}>
                      <td className="rank-num">{i + 1}</td>
                      <td>
                        <div className="paper-title">
                          {paper.title || paper.paper_id}
                          {paper.project_id && (
                            <span className="project-tag">{paper.project_id}</span>
                          )}
                        </div>
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
            )}
          </div>
        )
      })}
    </div>
  )
}
