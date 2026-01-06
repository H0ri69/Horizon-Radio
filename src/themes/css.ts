
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
  :root {
    --ts-theme-apple-4-color: #2c2c2c;
    --ts-theme-apple-2-color: #1f1f1f;
    --ts-theme-apple-5-color: #141414;
    --ts-theme-apple-3-color: #333333;
    
    --ts-navbar-color: linear-gradient(178deg, var(--ts-theme-apple-4-color) 60%, var(--ts-theme-apple-2-color) 140%);
    --ts-sidebar-color: linear-gradient(160deg, var(--ts-theme-apple-4-color) 20%, var(--ts-theme-apple-2-color) 45%, var(--ts-theme-apple-5-color) 70%);
    --ts-playerpage-color: radial-gradient(circle at 80% 600%, var(--ts-theme-apple-3-color) 80%, var(--ts-theme-apple-5-color) 86%, var(--ts-theme-apple-2-color) 94%, var(--ts-theme-apple-4-color) 98%);
    --ts-playerbar-color: linear-gradient(176deg, var(--ts-theme-apple-5-color) 0%, var(--ts-theme-apple-3-color) 50%);
    --ts-playerpageavtoggle-color: #444;

    --ts-bgcolor-transition: transform 300ms ease-in-out;
  }
`;
