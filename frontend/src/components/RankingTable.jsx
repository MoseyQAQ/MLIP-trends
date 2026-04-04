import ReactECharts from 'echarts-for-react'

function Sparkline({ data }) {
  if (!data || data.length === 0) return <span style={{ color: 'var(--text-secondary)' }}>-</span>

  const values = data.map(d => d.citations)
  const option = {
    grid: { top: 2, right: 2, bottom: 2, left: 2 },
    xAxis: { type: 'category', show: false, data: data.map(d => d.year) },
    yAxis: { type: 'value', show: false },
    series: [{
      type: 'line',
      data: values,
      smooth: true,
      symbol: 'none',
      lineStyle: { width: 1.5, color: '#2563eb' },
      areaStyle: { color: 'rgba(37,99,235,0.12)' },
    }],
  }

  return (
    <ReactECharts
      option={option}
      style={{ width: 100, height: 30 }}
      opts={{ renderer: 'canvas' }}
    />
  )
}

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

export default function RankingTable({ papers, communityMap, selectedPapers, onToggle }) {
  if (!papers || papers.length === 0) {
    return <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: 24 }}>No papers in this category yet.</p>
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="ranking-table">
        <thead>
          <tr>
            <th style={{ width: 40 }}>#</th>
            <th style={{ width: 30 }}></th>
            <th>Paper</th>
            <th>Community</th>
            <th>Year</th>
            <th style={{ textAlign: 'right' }}>Citations</th>
            <th className="sparkline-cell">Trend</th>
          </tr>
        </thead>
        <tbody>
          {papers.map((paper, i) => {
            const community = communityMap[paper.community]
            const isSelected = selectedPapers.includes(paper.paper_id)
            return (
              <tr
                key={paper.paper_id}
                onClick={() => onToggle(paper.paper_id)}
                style={{
                  cursor: 'pointer',
                  background: isSelected ? 'var(--bg-hover)' : undefined,
                }}
              >
                <td className="rank-num">{i + 1}</td>
                <td>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggle(paper.paper_id)}
                    onClick={e => e.stopPropagation()}
                    style={{ cursor: 'pointer' }}
                  />
                </td>
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
                <td>
                  <span
                    className="community-badge"
                    style={{
                      backgroundColor: (community?.color || '#8c8c8c') + '20',
                      color: community?.color || '#8c8c8c',
                    }}
                  >
                    {community?.name || paper.community}
                  </span>
                </td>
                <td style={{ color: 'var(--text-secondary)' }}>{paper.publication_year || '-'}</td>
                <td className="citation-count" style={{ textAlign: 'right' }}>
                  {(paper.cited_by_count || 0).toLocaleString()}
                </td>
                <td className="sparkline-cell">
                  <Sparkline data={paper.citation_history} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
