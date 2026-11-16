/**
 * Application Constants
 *
 * Centralized constants to avoid magic numbers scattered throughout the codebase.
 * Organized by domain for easy discovery and maintenance.
 */

// =============================================================================
// ANIMATION & TIMING
// =============================================================================

export const ANIMATION = {
  /** Delay before hiding tooltip after mouse leaves (ms) */
  TOOLTIP_HIDE_DELAY: 300,
  /** Default camera animation duration (ms) */
  CAMERA_DURATION: 600,
  /** Camera animation duration for quick transitions (ms) */
  CAMERA_DURATION_FAST: 300,
  /** Camera animation duration for slow/smooth transitions (ms) */
  CAMERA_DURATION_SLOW: 800,
  /** Delay before showing demo toast on first load (ms) */
  TOAST_SHOW_DELAY: 3000,
  /** Time to let ForceAtlas2 stabilize before stopping (ms) */
  LAYOUT_STABILIZE: 2000,
  /** Debounce delay for search input (ms) */
  SEARCH_DEBOUNCE: 300,
} as const;

// =============================================================================
// GRAPH VISUALIZATION
// =============================================================================

export const GRAPH = {
  /** Size multiplier for edges connected to hovered node */
  HOVER_EDGE_SIZE_MULTIPLIER: 1.6,
  /** Size for edges not connected to hovered node */
  UNHOVER_EDGE_SIZE: 0.35,
  /** Default camera zoom ratio for focus operations */
  CAMERA_ZOOM_RATIO: 0.5,
  /** Tight zoom ratio for focusing on single node */
  FOCUS_ZOOM_RATIO: 0.1,
  /** Minimum number of nodes to fetch */
  MIN_NODE_COUNT: 5,
  /** Maximum number of nodes to fetch */
  MAX_NODE_COUNT: 200,
  /** Default number of nodes to load */
  DEFAULT_NODE_COUNT: 25,
  /** Z-index for highlighted elements */
  HIGHLIGHT_Z_INDEX: 10,
  /** Default node size */
  DEFAULT_NODE_SIZE: 7,
  /** Default edge size */
  DEFAULT_EDGE_SIZE: 0.85,
  /** Edge flow animation settings */
  EDGE_FLOW: {
    /** Normal flow animation duration (ms) - subtle slow flow */
    SPEED_NORMAL: 10000,
    /** Flow animation duration when edge is hovered (ms) - faster for visibility */
    SPEED_HOVER: 4000,
    /** Flow animation for contradict edges (ms) - pulsing effect */
    SPEED_CONTRADICT: 6000,
    /** Dash pattern size for flowing animation */
    DASH_LENGTH: 8,
    /** Gap between dashes for flowing animation */
    DASH_GAP: 8,
    /** Opacity of flowing dashes (subtle) */
    DASH_OPACITY: 0.6,
  },
} as const;

// =============================================================================
// FILTERS
// =============================================================================

export const FILTERS = {
  /** Minimum year for publication filter (dynamic, supports historical foundations) */
  MIN_YEAR: 1900,
  /** Maximum year for publication filter (current year + 1 for preprints) */
  get MAX_YEAR() {
    return new Date().getFullYear() + 1;
  },
  /** Minimum citations for filter */
  MIN_CITATIONS: 0,
  /** Maximum citations for filter (will be dynamically calculated from data) */
  DEFAULT_MAX_CITATIONS: 1000,
} as const;

// =============================================================================
// COLORS
// =============================================================================

export const COLORS = {
  /** Edge color for supporting relationships (Sage / Forest Emerald) */
  SUPPORTS: "#2D7D46",
  /** Edge color for contradicting relationships (Burnt Terracotta / Venetian Red) */
  CONTRADICTS: "#C0392B",
  /** Edge color for extending relationships (Warm Lapis / Slate Indigo) */
  EXTENDS: "#2B6CB0",
  /** Edge color for unknown/uncertain relationships */
  UNKNOWN: "#8C827A",
  /** Edge color for neutral citation (default warm taupe graphite) */
  CITES: "#8C827A",
  /** Cluster colors for node grouping (Amber Ochre, Slate Lapis, Terracotta, Forest Moss, Cognac) */
  CLUSTERS: ["#9A5B27", "#2B6CB0", "#C0392B", "#2D7D46", "#7C5295"] as const,
  /** High-contrast jewel tones for light mode nodes */
  CLUSTERS_LIGHT: ["#854D0E", "#1E40AF", "#991B1B", "#166534", "#6B21A8"] as const,
  /** Luminous tones for dark mode nodes */
  CLUSTERS_DARK: ["#D97724", "#3B82F6", "#E11D48", "#10B981", "#A855F7"] as const,
  /** Theme-calibrated edge colors */
  EDGES: {
    LIGHT: {
      CITES: "#78716C", // warm stone hairline on #F8F6F0
      CONTRADICTS: "#C0392B", // burnt terracotta / venetian red
      SUPPORTS: "#2D7D46", // rich forest moss / sage
      EXTENDS: "#2B6CB0", // warm slate indigo
      UNKNOWN: "#A8A29E",
    },
    DARK: {
      CITES: "rgba(168, 162, 158, 0.40)", // luminous warm taupe filament on #151311
      CONTRADICTS: "#E05D50", // radiant terracotta coral, legible on espresso
      SUPPORTS: "#48BB78", // luminous sage moss
      EXTENDS: "#4299E1", // luminous lapis
      UNKNOWN: "rgba(168, 162, 158, 0.30)",
    },
  },
  /** Ghost node opacity (hex alpha suffix) */
  GHOST_ALPHA: "40",
  /** Dimmed color opacity factor */
  DIM_FACTOR: 0.3,
  /** Path visualization colors */
  PATH: {
    /** Default/shortest path color (lapis) */
    DEFAULT: "#2B6CB0",
    /** Conflict trail path color (terracotta) */
    CONFLICT: "#C0392B",
    /** No direct conflict path color (warm stone) */
    NO_CONFLICT: "#8C827A",
    /** Consensus lineage path color (sage) */
    CONSENSUS: "#2D7D46",
  },
} as const;

// =============================================================================
// SESSION & AUTH
// =============================================================================

export const SESSION = {
  /** Session duration in seconds (7 days) */
  EXPIRES_IN: 60 * 60 * 24 * 7,
  /** Session update frequency in seconds (24 hours) */
  UPDATE_AGE: 60 * 60 * 24,
  /** Cookie cache duration in seconds (5 minutes) */
  COOKIE_CACHE_MAX_AGE: 5 * 60,
} as const;

// =============================================================================
// RATE LIMITING
// =============================================================================

export const RATE_LIMIT = {
  /** Rate limit window in seconds */
  WINDOW: 60,
  /** Maximum requests per window */
  MAX_REQUESTS: 10,
  /** Default max attempts for custom rate limiting */
  DEFAULT_MAX_ATTEMPTS: 5,
  /** Default window for custom rate limiting (15 minutes in ms) */
  DEFAULT_WINDOW_MS: 15 * 60 * 1000,
} as const;

// =============================================================================
// UI
// =============================================================================

export const UI = {
  /** Maximum width for paper inspector on mobile */
  INSPECTOR_WIDTH_SM: "sm:max-w-xl",
  /** Maximum width for paper inspector on tablet */
  INSPECTOR_WIDTH_MD: "md:max-w-2xl",
  /** Maximum width for paper inspector on desktop */
  INSPECTOR_WIDTH_LG: "lg:max-w-4xl",
  /** Command bar max width */
  COMMAND_BAR_MAX_WIDTH: "max-w-sm",
  /** Maximum tags to show before overflow */
  MAX_VISIBLE_TAGS: 5,
} as const;

// =============================================================================
// LABELS
// =============================================================================

export const LABELS = {
  /** Sigma label density setting */
  DENSITY: 0.07,
  /** Sigma label grid cell size - enlarged to prevent colliding/overlapping text */
  GRID_CELL_SIZE: 85,
  /** Sigma label size threshold - adaptive LOD so zoomed-out graph stays crisp */
  SIZE_THRESHOLD: 8.5,
  /** Sigma label font */
  FONT: "Inter, system-ui, sans-serif",
  /** Sigma label weight */
  WEIGHT: "500",
} as const;

// =============================================================================
// CONTROVERSY
// =============================================================================

export const CONTROVERSY = {
  /** Minimum contradicting edges to mark node as controversial */
  THRESHOLD: 1,
} as const;
