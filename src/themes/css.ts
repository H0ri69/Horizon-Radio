
export const gradients_overlays = `
  :root {
    --ts-overlay-color: var(--ts-base-00-alpha-05-color);
    --ts-overlay-highlighted-color: var(--ts-base-100-alpha-005-color);
    --ts-overlay-highlighted2-color: var(--ts-base-100-alpha-01-color);
    --ts-overlay-nowplaying-color: var(--ts-base-100-alpha-005-color);
  }

  :root {
    --ytmusic-color-white1-alpha10: var(--ts-overlay-nowplaying-color);
    --ytmusic-menu-item-hover-background-color: var(--ts-overlay-highlighted-color);
  }

  /* search menu */
  #suggestions.ytmusic-search-suggestions-section>.ytmusic-search-suggestions-section:hover, ytmusic-search-suggestions-section:not([is-entity-search-suggestions-enabled]) #suggestions.ytmusic-search-suggestions-section>.selected-suggestion.ytmusic-search-suggestions-section {
    background-color: var(--ts-overlay-highlighted2-color);
  }

  ytmusic-player {
    --ytmusic-player-overlay-gradient: linear-gradient( var(--ts-overlay-color) 0%, rgb(0 0 0 / 0) 40% ) !important;
  }
`;

export const backgrounds = `
:root {
  --ts-navbar-color: #991a31;
  --ts-sidebar-color: var(--ts-navbar-color, #991a31);
  --ts-playerpage-color: #991a31;
  --ts-playerpageavtoggle-color: #991a31;
  --ts-playerbar-color: #991a31;
  --ts-body-color: #991a31;
  --ts-body-alpha-gradient-color: var(--ts-body-color);
  --ts-bgcolor-transition: background 0.3s linear;
  --yt-spec-inverted-background: var(--ts-body-color);
}

:root {
  --ytmusic-brand-background-solid: var(--ts-body-color) !important;
  --ytmusic-general-background-a: var(--ts-body-color) !important;
  --ytmusic-general-background-c: var(--ts-body-color) !important;
  --ytmusic-search-background: var(--ts-body-color) !important;
  --yt-spec-menu-background: var(--ts-playerbar-color) !important;
  --yt-spec-brand-background-solid: var(--ts-body-color) !important;
  --yt-spec-general-background-a: var(--ts-body-color) !important;
}

body {
  background: var(--ts-body-color);
  transition: var(--ts-bgcolor-transition) !important;
}

#player-page {
  background: var(--ts-playerpage-color) !important;
  transition: transform 300ms cubic-bezier(0.2,0,0.6,1), var(--ts-bgcolor-transition);
}

#song-image {
  background: var(--ts-playerpage-color) !important;
  transition: transform 300ms cubic-bezier(0.2,0,0.6,1), var(--ts-bgcolor-transition);
}

#nav-bar-background {
  background: var(--ts-navbar-color) !important;
  transition: opacity 0.2s, var(--ts-bgcolor-transition) !important;
}

#player-bar-background {
  background: var(--ts-playerbar-color) !important;
  transition: var(--ts-bgcolor-transition) !important;
}

#guide-wrapper {
  background: var(--ts-sidebar-color) !important;
  transition: var(--ts-bgcolor-transition) !important;
}

ytmusic-player-bar {
  --ytmusic-player-bar-background: var(--ts-playerbar-color) !important;
  transition: var(--ts-bgcolor-transition) !important;
}
`;

export const rulers_borders = `
  :root {
    --ts-ruler-primary-color: var(--ts-base-100-color);
    --ts-ruler-secondary-color: var(--ts-base-100-alpha-01-color);
  }
  :root {
    --ytmusic-divider: var(--ts-ruler-secondary-color, green);
    --yt-spec-10-percent-layer: var(--ts-ruler-secondary-color, purple) !important;
    --ytmusic-search-border: var(--ts-ruler-secondary-color, red) !important;
  }
  ytmusic-player-queue-item {
    border-bottom: 1px solid var(--ts-ruler-secondary-color, hotpink);
  }
  #nav-bar-divider.ytmusic-app-layout {
    border-top: 1px solid var(--ts-ruler-secondary-color, rgb(0 0 0 / 0.2));
  }
`;

export const song_image = `
:root {
  --ts-songimg-border-radius: 11px;
  --ts-songimg-thumbnail-border-radius: 5px;
  --ts-songimg-box-shadow: 0 1px 3px rgb(0 0 0 / 0.3);
}

ytmusic-player {
  box-shadow: var(--ts-songimg-box-shadow);
  border-radius: var(--ts-songimg-border-radius) !important;
}
#song-image {
  box-shadow: var(--ts-songimg-box-shadow);
  border-radius: var(--ts-songimg-border-radius);
}
#song-image img{
  border-radius: var(--ts-songimg-border-radius);
}
`;

export const misc_style_improvements = `
  ytmusic-player {
    background-color: var(--ts-playerpage-color);
    transition: var(--ts-bgcolor-transition);
  }
  tp-yt-paper-icon-button.ytmusic-settings-button {
    background-color: rgb(255 255 255 / 20%);
  }
  ytmusic-player-bar {
    color: var(--ts-base-100-alpha-06-color);
  }
  .time-info.ytmusic-player-bar {
    color: var(--ts-base-100-alpha-06-color);
  }
  .title.ytmusic-guide-entry-renderer {
    font-weight: 500;
    font-family: 'YouTube Sans';
    font-size: 17px;
  }
  ytmusic-guide-entry-renderer[active] .title.ytmusic-guide-entry-renderer {
    font-weight: 700 !important;
    color: var(--ts-primary-text-color) !important;
  }
  tp-yt-paper-listbox.ytmusic-menu-popup-renderer {
    border-radius: 10px;
  }
  tp-yt-iron-dropdown {
    border-radius: 10px;
    box-shadow: 0 0 20px rgb(0 0 0 / 15%);
  }
`;

export const base_variables = `
:root {
  /* Default Palette Fallbacks */
  --ts-palette-dominant-h: 0;
  --ts-palette-dominant-s: 0%;
  --ts-palette-dominant-l: 20%;
  --ts-palette-dominant-c: 0.05; 
  
  --ts-palette-vibrant-h: 0;
  --ts-palette-vibrant-c: 0.1;
  --ts-palette-vibrant-l: 40%;
  
  --ts-palette-lightvibrant-h: 0;
  --ts-palette-lightvibrant-c: 0.1;
  --ts-palette-lightvibrant-l: 60%;

  --ts-palette-darkvibrant-h: 0;
  --ts-palette-darkvibrant-c: 0.1;
  --ts-palette-darkvibrant-l: 20%;

  --ts-palette-muted-h: 0;
  --ts-palette-muted-c: 0.02;
  --ts-palette-muted-l: 30%;

  --ts-base-00-alpha-05-color: rgba(255,255,255,0.05);
  --ts-base-100-alpha-005-color: rgba(255,255,255,0.05);
  --ts-base-100-alpha-01-color: rgba(255,255,255,0.1);
  --ts-base-100-alpha-06-color: rgba(255,255,255,0.6);
  --ts-base-100-color: #fff;
  --ts-base-10-color: #222;
  --ts-base-40-color: #444;
  --ts-primary-text-color: #fff;
}
`;

export const appleMusicThemeCss = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap');

  :root {
    --ts-theme-apple-bg: #000000;
    --ts-theme-apple-glass: rgba(25, 25, 27, 0.45);
    --ts-theme-apple-glass-bright: rgba(255, 255, 255, 0.12);
    --ts-theme-apple-border: rgba(255, 255, 255, 0.12);
    --ts-theme-apple-text-dim: rgba(255, 255, 255, 0.55);
    --ts-theme-apple-font: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    
    --ts-ruler-secondary-color: var(--ts-theme-apple-border);

    /* FORCE OVERRIDE RED DEFAULTS */
    --ts-navbar-color: transparent !important;
    --ts-sidebar-color: var(--ts-theme-apple-glass) !important;
    --ts-playerpage-color: transparent !important;
    --ts-playerpageavtoggle-color: transparent !important;
    --ts-playerbar-color: var(--ts-theme-apple-glass) !important;
    --ts-body-color: var(--ts-theme-apple-bg) !important;
  }

  /* FORCE TRANSPARENCY ON YTM LAYOUT */
  body, 
  ytmusic-app,
  ytmusic-app-layout,
  ytmusic-browse,
  ytmusic-browse-response,
  ytmusic-section-list-renderer,
  ytmusic-playlist-shelf-renderer,
  ytmusic-grid-renderer,
  ytmusic-item-section-renderer,
  ytmusic-shelf-renderer,
  ytmusic-player-page,
  ytmusic-player-bar,
  ytmusic-nav-bar,
  #nav-bar,
  #content,
  #contents,
  #background,
  #nav-bar-background,
  #player-bar-background,
  #guide-wrapper,
  #player-page,
  .background-gradient,
  #alert-banner,
  #header.ytmusic-browse-response,
  #alerts.ytmusic-browse-response,
  #content-wrapper.ytmusic-browse-response {
    background-color: transparent !important;
    background: transparent !important;
    background-image: none !important;
  }

  /* PLAYER PAGE REFINEMENT */
  ytmusic-player-page {
    /* Keep default z-index/positioning but add glass background */
    background: transparent !important; 
  }

  ytmusic-app-layout[player-page-open] ytmusic-player-page {
    background: rgba(0, 0, 0, 0.45) !important;
    backdrop-filter: blur(100px) saturate(180%) brightness(1.0) !important;
    -webkit-backdrop-filter: blur(100px) saturate(180%) brightness(1.0) !important;
  }

  /* GLASS CONTEXT MENUS & POPUPS */
  ytmusic-menu-popup-renderer {
    background: var(--ts-theme-apple-glass) !important;
    backdrop-filter: blur(40px) saturate(210%) brightness(1.2) !important;
    -webkit-backdrop-filter: blur(40px) saturate(210%) brightness(1.2) !important;
    border: 1px solid var(--ts-theme-apple-border) !important;
    border-radius: 12px !important;
    box-shadow: 0 12px 48px rgba(0,0,0,0.7) !important;
    overflow: hidden !important;
    padding: 8px 0 !important;
  }

  /* SEARCH SUGGESTIONS */
  ytmusic-search-suggestions-section {
    background: rgba(25, 25, 27, 0.95) !important;
    backdrop-filter: blur(25px) !important;
    border: 1px solid var(--ts-theme-apple-border) !important;
    border-radius: 12px !important;
    margin-top: 8px !important;
    box-shadow: 0 12px 48px rgba(0,0,0,0.5) !important;
  }

  tp-yt-paper-listbox,
  tp-yt-iron-dropdown {
    background: transparent !important;
    backdrop-filter: none !important;
    border: none !important;
    box-shadow: none !important;
  }

  ytmusic-menu-navigation-item-renderer,
  ytmusic-menu-service-item-renderer {
    border-radius: 6px !important;
  }

  ytmusic-menu-navigation-item-renderer:hover,
  ytmusic-menu-service-item-renderer:hover {
    background-color: rgba(255, 255, 255, 0.1) !important;
  }

  /* NOISE TEXTURE OVERLAY */
  html::after {
    content: "";
    position: fixed;
    inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
    opacity: 0.04;
    pointer-events: none;
    z-index: 9999;
  }

  /* DYNAMIC VIBRANT BACKGROUND */
  html::before {
    content: "";
    position: fixed;
    top: -25%;
    left: -25%;
    width: 150%;
    height: 150%;
    /* Fallback gradient when no song is playing */
    background-image: var(--horis-album-art, linear-gradient(180deg, #1a1a1a 0%, #000000 100%));
    background-size: cover;
    background-position: center;
    filter: blur(120px) saturate(2.8) brightness(0.6);
    z-index: -10;
    transition: background-image 2.5s cubic-bezier(0.16, 1, 0.3, 1);
  }

  /* DEPTH VIGNETTE */
  html {
    background-color: #000 !important;
    font-family: var(--ts-theme-apple-font) !important;
  }
  
  body::before {
    content: "";
    position: fixed;
    inset: 0;
    background: radial-gradient(circle at center, transparent 70%, rgba(0,0,0,0.3) 160%); /* Ultra soft vignette */
    pointer-events: none;
    z-index: -5;
  }

  /* MACHINED GLASS PANELS (Glassmorphism 2.0) */
  /* Applied to standard elements without changing their position/size */
  #nav-bar-background, 
  #guide-wrapper,
  ytmusic-player-bar {
    background: linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 100%), var(--ts-theme-apple-glass) !important;
    backdrop-filter: blur(80px) saturate(240%) brightness(1.2) !important;
    -webkit-backdrop-filter: blur(80px) saturate(240%) brightness(1.2) !important;
    border-bottom: 1px solid var(--ts-theme-apple-border) !important;
    box-shadow: inset 0 -1px 1px rgba(0,0,0,0.2) !important;
    transition: none !important;
  }

  /* HIDE PLAYER BAR BACKGROUND */
  #player-bar-background {
    display: none !important;
    opacity: 0 !important;
    visibility: hidden !important;
  }

  /* FLOATING PLAYER BAR */
  ytmusic-player-bar {
    border-radius: 64px !important;
    margin: 0 !important;
    width: calc(100% - 32px) !important;
    left: 16px !important;
    bottom: 16px !important;
    position: fixed !important;
    overflow: hidden !important;
  }
  
  /* SEARCH BOX - Keep appearance but reset position */
  ytmusic-search-box {
    --ytmusic-search-background: rgba(40, 40, 42, 0.5) !important;
    border-radius: 8px !important;
    background: rgba(40, 40, 42, 0.5) !important;
    border: 1px solid rgba(255,255,255,0.1) !important;
  }
  
  ytmusic-search-box[opened] {
    border-radius: 8px 8px 0 0 !important;
    border-bottom: none !important;
  }
  
  /* TOP LEFT NAV SECTION (Logo & Menu) */
  /* Ensure this matches the sidebar theme as requested */
  #left-content.ytmusic-nav-bar {
    background: transparent !important; /* Ensure global glass shows through */
    display: flex !important;
    align-items: center !important;
  }
  
  /* FIX THE DARK BOX IN TOP LEFT CORNER */
  /* The spacer was keeping the old background color */
  #guide-spacer.ytmusic-app {
    background: transparent !important;
    display: none !important; /* Often just takes up space we don't need with this layout */
  }

  /* Style the Guide (Hamburger) Button to match sidebar items */
  #guide-button.ytmusic-nav-bar {
    border-radius: 6px !important;
    margin-right: 8px !important;
    width: 40px !important;
    height: 40px !important;
    padding: 8px !important;
  }
  
  #guide-button.ytmusic-nav-bar:hover {
    background: rgba(255,255,255,0.1) !important;
  }
  
  /* Logo adjustment */
  ytmusic-logo.ytmusic-nav-bar {
    margin-left: 4px !important;
  }

  /* Hide logo when sidebar is collapsed (Mini Guide Mode) */
  ytmusic-app-layout:not([guide-persistent-and-visible]) ytmusic-logo.ytmusic-nav-bar {
    display: none !important;
  }

  /* HIDE FULLBLEED IMAGE HARDEGES */
  ytmusic-fullbleed-thumbnail-renderer,
  ytmusic-fullbleed-thumbnail-renderer img {
    display: none !important;
    opacity: 0 !important;
    visibility: hidden !important;
  }

  /* SIDEBAR - Keep glass but reset floating layout */
  #guide-wrapper {
    margin: 0 !important;
    height: 100% !important;
    border-radius: 0 !important;
    width: 240px !important; /* Default width approx */
    background: transparent !important;
  }
  
  /* FORCE REMOVE SCROLL OVERLAY ON SIDEBAR */
  #mini-guide-background {
    opacity: 0 !important;
    display: none !important;
  }
  
  /* MINI GUIDE (Collapsed) FIXES */
  #mini-guide-renderer.ytmusic-app {
    background: var(--ts-theme-apple-glass) !important;
    backdrop-filter: blur(80px) saturate(240%) brightness(1.2) !important;
    height: 100% !important; /* Reach top */
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    padding: 64px 0 90px 0 !important; /* Header + Bottom clearance */
    box-sizing: border-box !important;
    border-right: 1px solid var(--ts-theme-apple-border) !important;
    width: 72px !important; /* Made wider as requested */
    overflow-x: hidden !important; /* No side scroll */
    z-index: 99 !important; /* Below header */
  }

  /* Remove separate background from mini guide sections */
  #mini-guide-renderer #items,
  #mini-guide-renderer #sections,
  #mini-guide-renderer .style-scope.ytmusic-guide-renderer,
  ytmusic-guide-section-renderer[is-collapsed] {
    background: transparent !important;
    margin: 0 !important;
    padding: 0 !important;
  }
  
  /* CENTER ICONS IN MINI GUIDE */
  ytmusic-guide-entry-renderer[is-collapsed] {
    margin: 0 !important;
    width: 100% !important;
    display: flex !important;
    justify-content: center !important;
    align-items: center !important;
  }

  ytmusic-guide-entry-renderer[is-collapsed] tp-yt-paper-item {
     padding: 12px 0 !important;
     justify-content: center !important;
     width: 100% !important;
     --paper-item-min-height: auto !important;
  }
  
  ytmusic-guide-entry-renderer[is-collapsed] .guide-icon {
     margin-right: 0 !important;
  }

  /* MAIN GUIDE RENDERER */
  ytmusic-guide-renderer {
    background: var(--ts-theme-apple-glass) !important;
    backdrop-filter: blur(80px) saturate(240%) brightness(1.2) !important;
    width: 100% !important;
    height: 100% !important;
    padding: 64px 0 96px 0 !important; /* Top + Bottom clearance */
    box-sizing: border-box !important;
    overflow-x: hidden !important; 
  }
  
  /* HIDE SCROLLBARS IN SIDEBAR */
  ytmusic-guide-renderer #items {
    overflow-x: hidden !important;
  }

  ytmusic-guide-renderer #items::-webkit-scrollbar {
    display: none !important;
  }
  
  /* Guide Entries */
  ytmusic-guide-entry-renderer {
    border-radius: 6px !important;
    margin: 0 8px !important;
  }
  
  /* Mini guide entries usually have different class/tag, ensuring they are covered */
  ytmusic-mini-guide-entry-renderer {
    margin: 4px 0 !important;
    background: transparent !important;
    border-radius: 6px !important;
  }
  
  ytmusic-mini-guide-entry-renderer:hover {
    background-color: rgba(255,255,255,0.1) !important;
  }

  ytmusic-guide-entry-renderer:hover {
    background: rgba(255,255,255,0.1) !important;
  }

  ytmusic-guide-entry-renderer[active] {
    background: rgba(255,255,255,0.15) !important;
  }

  /* CONTENT AREA - Reset Padding */
  #content {
    /* Reset mostly, just ensure background visibility */
    background: transparent !important;
    margin-left: 80px !important; /* Fix overlap with fixed mini-guide */
    width: auto !important;
  }
    
  ytmusic-browse-response {
    background: transparent !important;
  }

  /* HIGH-DYNAMIC PLAYER ART - Keep this as it's nice */
  ytmusic-player {
    box-shadow: 0 20px 50px rgba(0,0,0,0.5) !important;
    border-radius: 12px !important;
    overflow: hidden !important;
    background: transparent !important;
  }

  #song-image {
    border-radius: 12px !important;
  }

  /* THIN PROGRESS BARS */
  #progress-bar.ytmusic-player-bar, 
  #volume-slider.ytmusic-player-bar {
    --paper-slider-height: 4px !important;
    --paper-slider-active-color: #ffffff !important;
    --paper-slider-secondary-color: rgba(255,255,255,0.2) !important;
    --paper-slider-container-color: rgba(255,255,255,0.15) !important;
    --paper-slider-knob-color: #ffffff !important;
    --paper-slider-knob-start-color: #ffffff !important;
    --paper-slider-knob-start-border-color: #ffffff !important;
  }

  /* FORCE WHITE PROGRESS (YTM overrides) */
  #progress-bar.ytmusic-player-bar {
    --paper-slider-active-color: #fff !important;
  }
  
  #progress-bar.ytmusic-player-bar #sliderKnob,
  #volume-slider.ytmusic-player-bar #sliderKnob,
  #progress-bar.ytmusic-player-bar .slider-knob,
  #volume-slider.ytmusic-player-bar .slider-knob {
    display: none !important;
    opacity: 0 !important;
  }
  
  tp-yt-paper-slider:hover #sliderKnob,
  tp-yt-paper-slider:hover .slider-knob {
    display: block !important;
    opacity: 1 !important;
    transform: scale(0.8) !important;
  }

  /* PREMIUM SELECTION PILLS */
  ytmusic-player-queue-item[selected] {
    background: rgba(255, 255, 255, 0.15) !important;
    border-radius: 12px !important;
    backdrop-filter: brightness(1.4) contrast(1.1);
  }

  /* TYPOGRAPHY */
  .title.ytmusic-player-bar {
    font-size: 16px !important; /* Slightly larger than default but not huge */
    font-weight: 600 !important;
    color: #fff !important;
    font-family: var(--ts-theme-apple-font) !important;
  }

  .subtitle.ytmusic-player-bar {
    color: var(--ts-theme-apple-text-dim) !important;
    font-family: var(--ts-theme-apple-font) !important;
  }

  /* CLEAN UP DEV UI */
  .time-info.ytmusic-player-bar {
    font-weight: 500 !important;
    font-variant-numeric: tabular-nums !important;
  }

  /* HIDE DEV ELEMENTS */
  .hp-status-text, 
  .hp-dev-icon,
  #status-indicator,
  .status-text,
  ytmusic-player-bar [class*="dev-"],
  ytmusic-player-bar [id*="dev-"] {
    display: none !important;
  }

  /* BUTTON HOVER EFFECTS */
  tp-yt-paper-icon-button:hover {
    background-color: rgba(255, 255, 255, 0.1) !important;
    border-radius: 50% !important;
  }

  /* SCROLLBAR */
  ::-webkit-scrollbar {
    width: 8px !important;
  }
  ::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2) !important;
    border-radius: 4px !important;
  }

  /* CLEANUP */
  #nav-bar-divider, ytmusic-player-queue-item {
    border-bottom: none !important;
    border-top: none !important;
  }
`;



