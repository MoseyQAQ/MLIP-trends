import { useMemo } from 'react'
import ReactECharts from 'echarts-for-react'

// Distinct color palette for up to 10 lines
const LINE_COLORS = [
  '#2563eb', '#dc2626', '#16a34a', '#9333ea', '#ea580c',
  '#0891b2', '#ca8a04', '#db2777', '#4f46e5', '#65a30d',
]

/**
 * Aggregate papers into groups and merge their citation_history.
 * Returns array of { id, label, citation_history: [{year, citations}] }
 */
function aggregateByKey(papers, keyFn, labelFn) {
  const map = {}
  for (const p of papers) {
    const key = keyFn(p)
    if (!map[key]) {
      map[key] = { id: key, label: labelFn(p), yearMap: {} }
    }
    for (const h of (p.citation_history || [])) {
      map[key].yearMap[h.year] = (map[key].yearMap[h.year] || 0) + h.citations
    }
  }
  return Object.values(map).map(g => ({
    id: g.id,
    label: g.label,
    citation_history: Object.entries(g.yearMap)
      .map(([y, c]) => ({ year: Number(y), citations: c }))
      .sort((a, b) => a.year - b.year),
  }))
}

export default function CitationTrendChart({ papers, theme, viewMode, selectedIds, communityMap }) {
  const groups = useMemo(() => {
    if (!papers || papers.length === 0) return []

    if (viewMode === 'project') {
      // Aggregate by project_id
      const all = aggregateByKey(
        papers,
        p => p.project_id || p.paper_id,
        p => p.project_id || p.paper_id,
      )
      return selectedIds ? all.filter(g => selectedIds.includes(g.id)) : all
    }

    if (viewMode === 'community') {
      // Aggregate by community
      const all = aggregateByKey(
        papers,
        p => p.community || 'independent',
        p => communityMap?.[p.community]?.name || p.community || 'Independent',
      )
      return selectedIds ? all.filter(g => selectedIds.includes(g.id)) : all
    }

    // Paper mode — each paper is its own group
    const filtered = selectedIds
      ? papers.filter(p => selectedIds.includes(p.paper_id))
      : papers
    return filtered.map(p => ({
      id: p.paper_id,
      label: p.paper_id,
      fullTitle: p.title || p.paper_id,
      citation_history: p.citation_history || [],
    }))
  }, [papers, viewMode, selectedIds, communityMap])

  if (groups.length === 0) {
    return (
      <div style={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
        Select items from the table below to compare citation trends
      </div>
    )
  }

  const isDark = theme === 'dark'

  // Collect all years
  const allYears = new Set()
  groups.forEach(g => {
    g.citation_history?.forEach(h => allYears.add(h.year))
  })
  const years = [...allYears].sort()

  if (years.length === 0) {
    return (
      <div style={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
        No citation history available
      </div>
    )
  }

  const series = groups.map((group, idx) => {
    const color = LINE_COLORS[idx % LINE_COLORS.length]
    const yearMap = Object.fromEntries(
      (group.citation_history || []).map(h => [h.year, h.citations])
    )
    return {
      name: group.label,
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      lineStyle: { width: 2 },
      itemStyle: { color },
      data: years.map(y => yearMap[y] ?? 0),
    }
  })

  // For paper mode, map short label -> full title for tooltip
  const titleMap = viewMode === 'paper'
    ? Object.fromEntries(groups.map(g => [g.label, g.fullTitle || g.label]))
    : {}

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: isDark ? '#1c2128' : '#ffffff',
      borderColor: isDark ? '#30363d' : '#d1d5db',
      textStyle: { color: isDark ? '#e6edf3' : '#1f2937', fontSize: 13 },
      formatter: (params) => {
        const year = params[0]?.axisValue
        let html = `<div style="font-weight:600;margin-bottom:4px">${year}</div>`
        for (const p of params) {
          const displayName = titleMap[p.seriesName] || p.seriesName
          html += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">`
          html += `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color}"></span>`
          html += `<span style="flex:1">${displayName}</span>`
          html += `<span style="font-weight:600;margin-left:12px">${p.value}</span>`
          html += `</div>`
        }
        return html
      },
    },
    legend: {
      type: 'scroll',
      bottom: 0,
      textStyle: { color: isDark ? '#8b949e' : '#6b7280', fontSize: 12 },
      pageTextStyle: { color: isDark ? '#8b949e' : '#6b7280' },
      pageIconColor: isDark ? '#8b949e' : '#6b7280',
      pageIconInactiveColor: isDark ? '#30363d' : '#d1d5db',
    },
    grid: {
      top: 20,
      right: 20,
      bottom: 60,
      left: 50,
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: years,
      axisLine: { lineStyle: { color: isDark ? '#30363d' : '#d1d5db' } },
      axisLabel: { color: isDark ? '#8b949e' : '#6b7280' },
    },
    yAxis: {
      type: 'value',
      name: 'Citations / Year',
      nameTextStyle: { color: isDark ? '#8b949e' : '#6b7280', fontSize: 12 },
      axisLine: { lineStyle: { color: isDark ? '#30363d' : '#d1d5db' } },
      axisLabel: { color: isDark ? '#8b949e' : '#6b7280' },
      splitLine: { lineStyle: { color: isDark ? '#21262d' : '#f3f4f6' } },
    },
    series,
  }

  return (
    <ReactECharts
      option={option}
      style={{ height: 400, width: '100%' }}
      opts={{ renderer: 'canvas' }}
      notMerge={true}
    />
  )
}
