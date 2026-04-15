import { useTheme } from '../contexts/ThemeContext';

/**
 * Returns chart-safe color values that work on both dark and light backgrounds.
 * Use these instead of hardcoded rgba(255,255,255,...) values in Recharts props.
 */
export function useChartTheme() {
  const ctx = useTheme();
  const isLight = ctx?.theme === 'light';

  return {
    // Grid lines
    gridStroke:   isLight ? 'rgba(0,0,0,0.07)'  : 'rgba(255,255,255,0.05)',

    // Axis tick labels
    tickFill:     isLight ? '#52525b' : '#71717a',   // zinc-600 / zinc-500
    tickFillMd:   isLight ? '#3f3f46' : '#a1a1aa',   // zinc-700 / zinc-400 (for lighter slots)

    // Recharts cursor on hover
    cursorFill:   isLight ? 'rgba(0,0,0,0.04)'  : 'rgba(255,255,255,0.03)',
    cursorStroke: isLight ? 'rgba(0,0,0,0.08)'  : 'rgba(255,255,255,0.07)',

    // Polar / radar
    polarGrid:    isLight ? 'rgba(0,0,0,0.09)'  : 'rgba(255,255,255,0.06)',

    // Generic white-ish radar / area fill (use a neutral tint instead)
    radarFill:    isLight ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.08)',
    radarStroke:  isLight ? '#6366f1'              : 'rgba(255,255,255,0.5)',

    // Dot border on area/line charts
    dotStroke:    isLight ? '#ffffff' : '#18181b',

    // Anonymous bar fills (class performance chart — avg / top)
    barAvg:       isLight ? 'rgba(99,102,241,0.45)'  : 'rgba(255,255,255,0.35)',
    barTop:       isLight ? 'rgba(99,102,241,0.85)'  : 'rgba(255,255,255,0.85)',

    // Legend text colour
    legendColor:  isLight ? '#52525b' : '#9ca3af',

    // Reference-line labels
    refLabelFill: isLight ? '#52525b' : '#9ca3af',

    // Area gradient (individual progress chart)
    areaGradStart: isLight ? 'rgba(99,102,241,1)' : 'rgba(255,255,255,1)',
    areaStroke:    isLight ? '#6366f1'             : 'rgba(255,255,255,0.6)',
  };
}
