/* Restored css.ts */

export const gradients_overlays = /*css*/ `
  :root {
    --ts-overlay-color: var(--ts-base-00-alpha-05-color);
    --ts-overlay-highlighted-color: var(--ts-base-100-alpha-005-color);
    --ts-overlay-highlighted2-color: var(--ts-base-100-alpha-01-color);
    --ts-overlay-nowplaying-color: var(--ts-base-100-alpha-005-color);
  }

  :root {
    /* highlighted now playing song on playerpage */
    --ytmusic-color-white1-alpha10: var(--ts-overlay-nowplaying-color);

    /* right click menu hover */
    --ytmusic-menu-item-hover-background-color: var(--ts-overlay-highlighted-color);
  }

  /* search menu search item hover */
  #suggestions.ytmusic-search-suggestions-section>.ytmusic-search-suggestions-section:hover, ytmusic-search-suggestions-section:not([is-entity-search-suggestions-enabled]) #suggestions.ytmusic-search-suggestions-section>.selected-suggestion.ytmusic-search-suggestions-section {
    background-color: var(--ts-overlay-highlighted2-color);
  }

  /* start PlayPage song img styling */
  ytmusic-player {
    /* below is like an accent gradient for the song img */
    --ytmusic-player-overlay-gradient: linear-gradient( var(--ts-overlay-color) 0%, rgb(0 0 0 / 0) 40% ) !important;
  }
  /* end PlayPage song img styling */

  /* miniplayer hover overlay */
  ytmusic-player[player-ui-state=MINIPLAYER] .song-media-controls.ytmusic-player {
    background: var(--ts-overlay-color);
  }

  /* sidebar active bg */
  ytmusic-guide-entry-renderer[active] tp-yt-paper-item.ytmusic-guide-entry-renderer {
    background-color: var(--ts-overlay-highlighted-color);
  }

  /*sidebar hamburger icon hover */
  ytmusic-nav-bar[is-bauhaus-sidenav-enabled] .left-content.ytmusic-nav-bar yt-icon-button.ytmusic-nav-bar:hover {
    background-color: var(--ts-overlay-highlighted-color);
  }

  /* add to playlist menu */
  ytmusic-playlist-add-to-option-renderer:hover {
    background-color: var(--ts-overlay-highlighted-color);
  }

  /* user menu */
  #items.yt-multi-page-menu-section-renderer>*.yt-multi-page-menu-section-renderer:not([compact-link-style=compact-link-style-type-disclaimer]):not([component-style=RENDER_STYLE_SIMPLE_HEADER]):hover {
    background-color: var(--ts-overlay-highlighted-color);
  }

  .category-menu-item.iron-selected.ytmusic-settings-page {
    background: var(--ts-overlay-highlighted-color);
  }

  ytmusic-responsive-list-item-renderer[is-playlist-detail-page][is-checked], ytmusic-responsive-list-item-renderer[is-album-detail-page][is-checked] {
    background-color: var(--ts-overlay-highlighted-color);
  }

  ytmusic-responsive-list-item-renderer[is-checked] {
    background-color: var(--ts-overlay-highlighted-color);
  }

  .yt-list-item-view-model__container--tappable:hover {
    background-color: var(--ts-overlay-highlighted-color);
  }

  ytmusic-player-bar[is-web-delhi-icons-enabled] yt-icon-button.ytmusic-player-bar:hover {
      background-color: var(--ts-overlay-highlighted2-color);
  }
`;

export const backgrounds = /*css*/ `

:root {
  --ts-navbar-color: #991a31;
  --ts-sidebar-color: var(--ts-navbar-color, #991a31);
  --ts-playerpage-color: #991a31;
  --ts-playerpageavtoggle-color: #991a31;
  --ts-playerbar-color: #991a31;
  --ts-body-color: #991a31;

  /* if an alpha color is specified, this will let the "hue" lights on the homepage show through */
  --ts-body-alpha-gradient-color: var(--ts-body-color);

  /* PERF: avoid animating large surfaces via CSS variables; this caused constant repaints when palette vars update */
  --ts-bgcolor-transition: none;
  --yt-spec-inverted-background: var(--ts-body-color);
}

:root {
  --ytmusic-brand-background-solid: var(--ts-body-color) !important;
  --ytmusic-general-background-a: var(--ts-body-color) !important;
  --ytmusic-general-background-c: var(--ts-body-color) !important;
  --ytmusic-search-background: var(--ts-body-color) !important;
  --yt-spec-menu-background: var(--ts-playerbar-color) !important;

  /* share menu */
  --yt-spec-brand-background-solid: var(--ts-body-color) !important;
  --yt-spec-general-background-a: var(--ts-body-color) !important;
}

body {
  background: var(--ts-body-color);
}

ytmusic-browse-response[has-background]:not([disable-gradient]) .background-gradient.ytmusic-browse-response {
  background-image: linear-gradient(
    to bottom,
    var(--ts-body-alpha-gradient-color),
    var(--ts-body-color) 40%
  );
  background-size: 100vw 100vh;
}

ytmusic-browse-response[has-background]:not([disable-gradient])[page-type=MUSIC_PAGE_TYPE_PODCAST_SHOW_DETAIL_PAGE] .background-gradient.ytmusic-browse-response, ytmusic-browse-response[has-background]:not([disable-gradient])[page-type=MUSIC_PAGE_TYPE_NON_MUSIC_AUDIO_TRACK_PAGE] .background-gradient.ytmusic-browse-response, ytmusic-browse-response[has-background]:not([disable-gradient])[is-bauhaus-web-playlist-detail-page-redesign-enabled] .background-gradient.ytmusic-browse-response, ytmusic-browse-response[has-background]:not([disable-gradient])[is-bauhaus-web-album-detail-page-redesign-enabled] .background-gradient.ytmusic-browse-response {
  background-image: linear-gradient(
    to bottom,
    var(--ts-body-alpha-gradient-color),
    var(--ts-body-color)
  );
}

ytmusic-player-page,
#player-page {
  background: var(--ts-playerpage-color) !important;
  /* PERF: keep the open/close transform animation, drop background transitions */
  transition: transform 300ms cubic-bezier(0.2,0,0.6,1);
}

#main-panel {
  background: transparent !important;
}

#song-image {
  background: var(--ts-playerpage-color) !important;
  /* PERF: keep transform only */
  transition: transform 300ms cubic-bezier(0.2,0,0.6,1);
}

#nav-bar-background {
  background: var(--ts-navbar-color) !important;
  transition: opacity 0.2s !important;
}

#player-bar-background {
  background: var(--ts-playerbar-color) !important;
}

/* sidebar */
#guide-wrapper {
  background: var(--ts-sidebar-color) !important;
}

#mini-guide-background {
  background: var(--ts-sidebar-color) !important;
}

ytmusic-player-bar {
  --ytmusic-player-bar-background: var(--ts-playerbar-color) !important;
}

ytmusic-app-layout[player-fullscreened] > [slot=player-bar] {
  background: var(--ts-playerbar-color) !important;
}

tp-yt-paper-listbox {
  background: var(--ts-playerbar-color);
}

ytmusic-item-section-renderer.stuck #header.ytmusic-item-section-renderer {
  background: var(--ts-body-color);
}

ytmusic-tabs.stuck {
  background: var(--ts-navbar-color);
  box-shadow: rgb(0 0 0 / 0.3) 0px 3px 6px -3px !important;
}

/* av toggle start */
ytmusic-av-toggle[playback-mode=ATV_PREFERRED] .song-button.ytmusic-av-toggle {
  background: var(--ts-playerpageavtoggle-color);
}

ytmusic-av-toggle[playback-mode=OMV_PREFERRED] .video-button.ytmusic-av-toggle {
  background: var(--ts-playerpageavtoggle-color);
}

.song-button.ytmusic-av-toggle, .video-button.ytmusic-av-toggle {
  background-color: var(--ts-base-10-color);
}

.av-toggle.ytmusic-av-toggle {
  background-color: var(--ts-base-10-color);
}

ytmusic-av-toggle[toggle-disabled] .video-button.ytmusic-av-toggle {
  color: var(--ts-base-100-alpha-04-color);
}

ytmusic-av-toggle[toggle-disabled] .song-button.ytmusic-av-toggle {
  color: var(--ts-base-100-alpha-04-color);
}

.song-button.ytmusic-av-toggle, .video-button.ytmusic-av-toggle {
  color: var(--ts-base-100-color);
  --yt-endpoint-color: var(--ts-base-100-color);
  --yt-endpoint-hover-color: var(--ts-base-100-color);
  --yt-endpoint-visited-color: var(--ts-base-100-color);
}
/* av toggle end */

ytmusic-search-suggestions-section.ytmusic-search-box {
  border-top: 1px solid var(--ts-base-100-alpha-02-color);
}

ytmusic-search-box[is-bauhaus-sidenav-enabled] {
  --ytmusic-search-background: var(--ts-body-color);
}

ytmusic-search-suggestions-section {
  background: var(--ts-body-color);
}

#suggestion-list {
  background-color: var(--ts-body-color) !important;
}

/* artist image white filter */
/* aside from the gradient, there's also a default dark filter applied to the artist image header on the artist page */
/* this needs to be set to a white/light filter on light themes or else it wont look right */
.image.ytmusic-immersive-header-renderer~.content-container-wrapper.ytmusic-immersive-header-renderer {
  background-color: var(--ts-base-00-alpha-04-color) !important;
}

/* when searching a song, the Top Result has a bg gradient applied */
.immersive-background.ytmusic-card-shelf-renderer:before {
  background-image: linear-gradient(180deg,rgb(0 0 0 / 0.05) 0%, var(--ts-base-10-color) 86.67%);
}

/* settings menu */
.content.ytmusic-settings-page {
  background-color: var(--ts-body-color);
}

/* search bar new sidebar layout */
ytmusic-search-box[is-bauhaus-sidenav-enabled][is-mobile-view][opened], ytmusic-search-box[is-bauhaus-sidenav-enabled][is-mobile-view][has-query] {
  --ytmusic-search-background: var(--ts-playerbar-color) !important;
}

ytmusic-search-box[is-bauhaus-sidenav-enabled]:not([opened]):not([has-query]) .search-box.ytmusic-search-box {
  background: var(--ts-base-100-alpha-005-color);
}

/* new playlist form */
ytmusic-playlist-form {
  background: var(--ts-base-10-color);
}

.dropdown-content.ytmusic-dropdown-renderer {
  --paper-listbox-background-color: var(--ts-base-10-color);
}

/* toast color. like when "saved to playlist" thing pops up */
tp-yt-paper-toast {
  background-color: var(--ts-base-10-color);
}

ytmusic-notification-text-renderer[toast-style=TOAST_STYLE_GRADIENT] #toast.ytmusic-notification-text-renderer {
  background-color: var(--ts-base-10-color);
}

/* PERF: filters on large images are expensive during scroll and palette updates */
.immersive-background ytmusic-fullbleed-thumbnail-renderer {
  filter: none !important;
}

/* pick artists you like footer */
.buttons.ytmusic-tastebuilder-renderer {
  background: var(--ts-base-10-color);
}

/* Explore -> Big buttons hover */
ytmusic-navigation-button-renderer:not([button-style=STYLE_OUTLINE_BORDER]):hover button.ytmusic-navigation-button-renderer, ytmusic-navigation-button-renderer:not([button-style=STYLE_OUTLINE_BORDER]) button.ytmusic-navigation-button-renderer:focus-within {
  background: var(--ts-base-100-alpha-02-color);
}

/* mobile layout */
html {
  --ytmusic-overlay-background-medium: var(--ts-base-00-alpha-05-color);
}

ytmusic-player-page[is-mweb-modernization-enabled][player-page-ui-state=TABS_VIEW] #side-panel.ytmusic-player-page {
  background: var(--ts-body-color);
}

ytmusic-player-page[is-mweb-modernization-enabled] .background-thumbnail.ytmusic-player-page {
  /* PERF: remove huge blur (very costly on large layers). Keep subtle ambience via opacity only. */
  filter: none !important;
  opacity: 0.25;
}

/* playlist layout */
ytmusic-browse-response[has-background][page-type=MUSIC_PAGE_TYPE_NON_MUSIC_AUDIO_TRACK_PAGE] .immersive-background.ytmusic-browse-response ytmusic-fullbleed-thumbnail-renderer.ytmusic-browse-response, ytmusic-browse-response[has-background][page-type=MUSIC_PAGE_TYPE_PODCAST_SHOW_DETAIL_PAGE] .immersive-background.ytmusic-browse-response ytmusic-fullbleed-thumbnail-renderer.ytmusic-browse-response, ytmusic-browse-response[has-background][is-bauhaus-web-playlist-detail-page-redesign-enabled] .immersive-background.ytmusic-browse-response ytmusic-fullbleed-thumbnail-renderer.ytmusic-browse-response, ytmusic-browse-response[has-background][is-bauhaus-web-album-detail-page-redesign-enabled] .immersive-background.ytmusic-browse-response ytmusic-fullbleed-thumbnail-renderer.ytmusic-browse-response {
  /* PERF: remove blur/saturate filter work from scrolling lists */
  filter: none !important;
  opacity: 0.25;
}

/* when searching for something */
html[light] .immersive-background.ytmusic-card-shelf-renderer ytmusic-fullbleed-thumbnail-renderer.ytmusic-card-shelf-renderer {
  /* PERF: remove expensive blur/brightness */
  filter: none !important;
  opacity: 0.25;
}

ytmusic-network-status-banner[current-state=OFFLINE] {
  background-color: var(--ts-playerbar-color);
  border-top: 1px solid #00000033;
}
`;

export const rulers_borders = /*css*/ `
  :root {
    --ts-ruler-primary-color: var(--ts-base-100-color);
    --ts-ruler-secondary-color: var(--ts-base-100-alpha-01-color);
  }


  :root {
    /* player page sidebar */
    --ytmusic-divider: var(--ts-ruler-secondary-color, green);

    /* random borders and overlays. related to a11y. */
    /* i can just switch the attribute on the root from "dark=true" to "light=true" but its alot to just change 1 or 2 css properties */
    --yt-spec-10-percent-layer: var(--ts-ruler-secondary-color, purple) !important;
  }

  tp-yt-paper-tabs.ytmusic-player-page {
    --paper-tabs-selection-bar-color: var(--ts-ruler-primary-color, blue);
  }

  ytmusic-player-queue-item {
    border-bottom: 1px solid var(--ts-ruler-secondary-color, hotpink);
  }

  /* navbar border bottom */
  #nav-bar-divider.ytmusic-app-layout {
    border-top: 1px solid var(--ts-ruler-secondary-color, rgb(0 0 0 / 0.2));
  }

  ytmusic-app-layout[is-bauhaus-sidenav-enabled] #nav-bar-divider.ytmusic-app-layout {
    border-top: 1px solid var(--ts-ruler-secondary-color, rgb(0 0 0 / 0.2));
  }

  ytmusic-app-layout[is-bauhaus-sidenav-enabled] #nav-bar-background.ytmusic-app-layout {
    border-bottom: 1px solid var(--ts-ruler-secondary-color, rgb(0 0 0 / 0.2));
  }

  tp-yt-paper-listbox.ytmusic-menu-popup-renderer {
    border: 1px solid var(--ts-ruler-secondary-color, rgb(0 0 0 / 0.2));
  }

  /* search box border */
  :root {
    --ytmusic-search-border: var(--ts-ruler-secondary-color, red) !important;
  }

  /* search box */
  ytmusic-search-box[is-bauhaus-sidenav-enabled] {
    --ytmusic-search-border: var(--ts-ruler-secondary-color, red) !important;;
  }

  tp-yt-paper-icon-button.ytmusic-carousel-shelf-renderer {
    border: solid 1px var(--ts-ruler-secondary-color, tomato);
  }

  /* 'recent activity' dropdown buttons */
  button.ytmusic-sort-filter-button-renderer {
    border: 1px solid var(--ts-ruler-secondary-color, green);
  }

  /* 'recent activity' dropdowns */
  #container.ytmusic-multi-select-menu-renderer {
    border: 1px solid var(--ts-ruler-secondary-color, steelblue);
  }

  #title.ytmusic-multi-select-menu-renderer {
    border-bottom: 1px solid var(--ts-ruler-secondary-color, steelblue);
  }

  /* search page that comes up */
  ytmusic-tabs.iron-selected .tab.ytmusic-tabs, .tab.selected.ytmusic-tabs {
    border-bottom: 2px solid var(--ts-ruler-primary-color);
  }

  .tab-container.ytmusic-tabs {
    border-bottom: 1px solid var(--ts-ruler-secondary-color);
  }

  /* sidebar */
  #divider.ytmusic-guide-section-renderer {
    border-top: 1px solid var(--ts-ruler-secondary-color);
  }

  ytmusic-guide-signin-promo-renderer[is-collapsed] {
    border-top: 1px solid var(--ts-ruler-secondary-color);
  }

  ytmusic-app-layout[is-bauhaus-sidenav-enabled] #mini-guide-background.ytmusic-app-layout {
    border-right: 1px solid var(--ts-ruler-secondary-color);
  }

  ytmusic-app[is-bauhaus-sidenav-enabled] #guide-wrapper.ytmusic-app {
    border-right: none;
}

  /* add to playlist menu */
  ytmusic-add-to-playlist-renderer {
    border: 1px solid var(--ts-ruler-secondary-color);
  }
  
  .top-bar.ytmusic-add-to-playlist-renderer {
    border-bottom: 1px solid var(--ts-ruler-secondary-color);
  }

  ytmusic-carousel-shelf-renderer.ytmusic-add-to-playlist-renderer:not(:empty) {
    border-bottom: 1px solid var(--ts-ruler-secondary-color);
  }

  ytmusic-playlist-form[tabbed-ui-enabled] iron-pages.ytmusic-playlist-form .content.ytmusic-playlist-form {
    border-top: 1px solid var(--ts-base-40-color);
    border-bottom: 1px solid var(--ts-ruler-secondary-color);
  }

  .top-bar.ytmusic-dismissable-dialog-renderer {
    border-bottom: 1px solid var(--ts-ruler-secondary-color);
  }

  ytmusic-responsive-list-item-renderer[is-album-detail-page], ytmusic-playlist-shelf-renderer[is-playlist-detail-page] #contents.ytmusic-playlist-shelf-renderer>*.ytmusic-playlist-shelf-renderer:not(:last-child) {
    padding-top: 4px;
    padding-bottom: 4px;
    margin-bottom: 0;
  }

  ytmusic-shelf-renderer:not([is-playlist-detail-page]):not([is-album-detail-page]) #contents.ytmusic-shelf-renderer>*.ytmusic-shelf-renderer:not(:last-child) {
    border-bottom: 1px solid var(--ts-ruler-secondary-color);
  }
`;

export const scrollbars = /*css*/ `
:root {
  --ts-scrollbar-color: var(--ts-base-100-alpha-01-color);
}
/* scrollbars */
::-webkit-scrollbar-thumb {
  background-color: var(--ts-scrollbar-color) !important;
}

/* new scrollbar properties? chrome version > 120 */
html {
  scrollbar-color: var(--ts-scrollbar-color) var(--ts-base-100-alpha-005-color);
}

body {
  scrollbar-color: var(--ts-scrollbar-color) transparent;
}

/* carousel on homepage and stuff */
ytmusic-carousel:hover, ytmusic-carousel:active, ytmusic-carousel:focus {
  scrollbar-color: var(--ts-scrollbar-color) transparent;
}

/* pills and chips */
#chips.ytmusic-chip-cloud-renderer {
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
}

#chips.ytmusic-chip-cloud-renderer:hover {
  scrollbar-color: var(--ts-scrollbar-color) transparent;
}

/* sidebar playlist list */
#items.ytmusic-guide-section-renderer {
  scrollbar-width: none;
}

#items.ytmusic-guide-section-renderer:hover {
  scrollbar-width: auto;
}

/* popup menu when right clicking a song */
ytmusic-menu-popup-renderer {
  scrollbar-width: thin;
}
`;

export const playerbar_progressbar = /*css*/ `
:root {
  --ts-playprogress-color: var(--ts-base-100-color, #ffffff);
  --ts-playprogress-secondary-color: var(--ts-base-100-alpha-02-color, rgb(255 255 255 / 0.2));
  --ts-playprogress-container-color: var(--ts-base-100-alpha-01-color, rgb(255 255 255 / 0.1));

  --ts-playprogress-knob-color: var(--ts-playprogress-color);
}

#progress-bar.ytmusic-player-bar {
  --paper-slider-active-color: var(--ts-playprogress-color) !important;
  --paper-slider-secondary-color: var(--ts-playprogress-secondary-color) !important;
  --paper-slider-container-color: var(--ts-playprogress-container-color) !important;
}

#progress-bar.ytmusic-player-bar[focused], ytmusic-player-bar:hover #progress-bar.ytmusic-player-bar {
  --paper-slider-knob-color: var(--ts-playprogress-knob-color) !important;
  --paper-slider-knob-start-color: var(--ts-playprogress-knob-color) !important;
  --paper-slider-knob-start-border-color: var(--ts-playprogress-knob-color) !important;
}

#progress-bar.ytmusic-player-controls {
  --paper-slider-knob-color: var(--ts-playprogress-color);
  --paper-slider-knob-start-color: var(--ts-playprogress-color);
  --paper-slider-knob-start-border-color: var(--ts-playprogress-color);
  --paper-slider-active-color: var(--ts-playprogress-color);
  --paper-slider-secondary-color: var(--ts-base-100-alpha-05-color);
  --paper-slider-container-color: var(--ts-base-100-alpha-02-color);
}

ytmusic-player-bar[is-mweb-player-bar-modernization-enabled] #progress-bar.ytmusic-player-bar, ytmusic-player-bar[is-mweb-player-bar-modernization-enabled] #progress-bar.ytmusic-player-bar[focused] {
  --paper-slider-disabled-active-color: var(--ts-playprogress-color);
  --paper-slider-disabled-secondary-color: var(--ts-playprogress-secondary-color);
}
`;

export const song_image = /*css*/ `
:root {
  --ts-songimg-border-radius: 11px;
  --ts-songimg-thumbnail-border-radius: 5px;
  --ts-songimg-box-shadow: 0 1px 3px rgb(0 0 0 / 0.3);
}

/* start image thumbnails */
ytmusic-two-row-item-renderer[aspect-ratio=MUSIC_TWO_ROW_ITEM_THUMBNAIL_ASPECT_RATIO_SQUARE] .image.ytmusic-two-row-item-renderer {
  border-radius: var(--ts-songimg-thumbnail-border-radius);
}

ytmusic-two-row-item-renderer[aspect-ratio=MUSIC_TWO_ROW_ITEM_THUMBNAIL_ASPECT_RATIO_SQUARE] .image-wrapper.ytmusic-two-row-item-renderer {
  border-radius: var(--ts-songimg-thumbnail-border-radius);
}

#ytmusic-carousel ytmusic-two-row-item-renderer[aspect-ratio=MUSIC_TWO_ROW_ITEM_THUMBNAIL_ASPECT_RATIO_SQUARE] .image-wrapper.ytmusic-two-row-item-renderer {
  border-radius: 8px;
}

#ytmusic-carousel ytmusic-two-row-item-renderer[aspect-ratio=MUSIC_TWO_ROW_ITEM_THUMBNAIL_ASPECT_RATIO_SQUARE] .image.ytmusic-two-row-item-renderer {
  border-radius: 8px;
}

.image-wrapper.ytmusic-two-row-item-renderer {
  border-radius: var(--ts-songimg-thumbnail-border-radius);
}
/* end image thumbnails */

/* some video thumbnails on homepage */
ytmusic-two-row-item-renderer[aspect-ratio=MUSIC_TWO_ROW_ITEM_THUMBNAIL_ASPECT_RATIO_RECTANGLE_16_9] .image-wrapper.ytmusic-two-row-item-renderer {
  border-radius: 10px;
}

/* start PlayPage song img styling */
ytmusic-player {
  box-shadow: var(--ts-songimg-box-shadow);
  border-radius: var(--ts-songimg-border-radius) !important;
}
ytmusic-player[player-ui-state="FULLSCREEN"] {
  border-radius: 0px !important;
}
#song-image {
  box-shadow: var(--ts-songimg-box-shadow);
  border-radius: var(--ts-songimg-border-radius);
}
#song-image img{
  border-radius: var(--ts-songimg-border-radius);
  /* object-fit: contain; */
}
#song-video {
  box-shadow: var(--ts-songimg-box-shadow);
  border-radius: var(--ts-songimg-border-radius);
}
#song-video .html5-video-player {
  border-radius: var(--ts-songimg-border-radius);
}
ytmusic-player .song-media-controls {
  border-radius: var(--ts-songimg-border-radius);
}

ytmusic-player[player-ui-state=MINIPLAYER] {
  border-radius: var(--ts-songimg-border-radius);
}

ytmusic-player[player-ui-state=FULLSCREEN] {
  border-radius: 0;
}

ytmusic-player[player-ui-state=FULLSCREEN] #song-image {
  height: 100%;
  border-radius: 0;
}

ytmusic-player[player-ui-state=FULLSCREEN] #thumbnail {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
}

ytmusic-player[player-ui-state=FULLSCREEN] #song-image #img {
  background-color: var(--ts-palette-dominant-hex);
  border-radius: var(--ts-songimg-border-radius);
  box-shadow: var(--ts-songimg-box-shadow);
  /* filter: drop-shadow(0px 0px 200px hsl(var(--ts-palette-dominant-hue), var(--ts-palette-dominant-saturation), 50%)); */
  width: 700px;
  height: 700px;
  margin: 0;
}
/* end PlayPage song img styling */

/* Your likes and playlists and albums image */
#thumbnail {
  border-radius: 7px !important;
}

ytmusic-responsive-header-renderer {
  --yt-img-border-radius: 7px;
}

/* searching for a song */
.thumbnail-container.ytmusic-card-shelf-renderer {
  border-radius: var(--ts-songimg-thumbnail-border-radius);
}

/* list thumbnails */
.left-items.ytmusic-responsive-list-item-renderer {
  border-radius: 3px;
}
`;

/* when pressing fullscreen on the player page album art, the img goes to COVER. */
export const coloredPlayerBg = /*css*/ `
  ytmusic-player {
    background-color: var(--ts-playerpage-color);
    /* PERF: avoid background transitions on large surfaces */
    transition: none !important;
  }
`;

/* on user icon on top right corner, the grey bg is causing a strange grey outline that looks bad */
export const noGreyBgOnUserIcon = /*css*/ `
  tp-yt-paper-icon-button.ytmusic-settings-button {
    background-color: rgb(255 255 255 / 20%);
  }
`;

export const fixWeirdMarginWhenFullScreenPlayer = /*css*/ `
  ytmusic-player[player-ui-state=FULLSCREEN] {
    margin: auto 0 !important;
  }
`;

/* the color for the playbarbg icons and text is too dark when we're not using the default black theme */
/* also when fullscreen, the transparent bg on the playbarbg is hard to see */
export const playBarTextAndIconsColor = /*css*/ `
  ytmusic-player-bar {
    color: var(--ts-base-100-alpha-06-color);
  }

  .time-info.ytmusic-player-bar {
    color: var(--ts-base-100-alpha-06-color);
  }

  .menu.ytmusic-player-bar {
    --iron-icon-fill-color: var(--ts-base-100-alpha-06-color);
  }

  ytmusic-app-layout[player-fullscreened_] > [slot=player-bar] {
    background: var(--ts-playerbar-color);
    width: 100%;
  }
`;

/* June 2023. Album image on player page is directly touching the player bar. */
export const fixNoMarginBottomOnNowPlayingAlbumImage = /*css*/ `
  /*
    PERF: Container queries force additional style resolution work and this block had many breakpoints.
    Replace with a small set of media queries + clamp() to keep layout stable with far fewer rules.
  */

  .av.ytmusic-player-page {
    padding-bottom: 12px !important;
  }

  @media (max-width: 839px) {
    .av.ytmusic-player-page {
      padding-bottom: 16px !important;
    }
  }

  /* Keep player reasonably sized on typical viewports */
  ytmusic-player-page:not([video-mode]):not([player-fullscreened]) #player.ytmusic-player-page {
    max-width: min(900px, 92vw);
  }

  /* Smooth, responsive padding without a cascade of breakpoints */
  #main-panel {
    padding-left: clamp(0px, 3vw, 64px) !important;
    padding-right: clamp(0px, 3vw, 64px) !important;
  }
`;

/* the box-shadow on the new sidebar-layout Search input doesn't look so good. it only looks good on dark or Off because you can't see it haha */
export const removeSearchBoxShadow = /*css*/ `
  ytmusic-search-box[has-query] .search-container.ytmusic-search-box, ytmusic-search-box[opened] .search-container.ytmusic-search-box {
    box-shadow: none;
  }
`;

/* 11.30.2023 some weird stuff when focusing sidebar buttons. just pure white bg and no border-radius. gonna fix it*/
export const sidebarFocus = /*css*/ `
tp-yt-paper-item:focus:before, .tp-yt-paper-item.tp-yt-paper-item:focus:before {
  background: none;
  border-radius: inherit;
}`;

/* opinion. bold sidebar headers. it looks nice imo */
export const boldSidebarHeaders = /*css*/ `
.title.ytmusic-guide-entry-renderer {
  font-weight: 500;
  font-family: 'YouTube Sans';
  font-size: 17px;
}

ytmusic-guide-entry-renderer[active] .title.ytmusic-guide-entry-renderer {
  font-weight: 700 !important;
  color: var(--ts-primary-text-color) !important;
}

ytmusic-guide-entry-renderer:not([is-primary]) .title.ytmusic-guide-entry-renderer {
  color: var(--ts-primary-text-color) !important;
}
`;

export const popupStyling = /*css*/ `
  tp-yt-paper-listbox.ytmusic-menu-popup-renderer {
    border-radius: 10px;
  }

  tp-yt-iron-dropdown {
    border-radius: 10px;
    box-shadow: 0 0 20px rgb(0 0 0 / 15%);
  }

  /* popup dialog - Share and Save to Playlist */
  tp-yt-paper-dialog {
    border-radius: 10px;
  }
`;

/* on playerpage, when collapsing and un-collapsing sidebar, 
a scrollbar track shows up on the right. */
export const playerPageScrollbarShowsWhenSidebar = /*css*/ `
  /* PERF: Avoid using the :has() relational selector. Use the existing state class instead. */
  html[os="windows"].ts-player-page-open {
    scrollbar-width: none;
    margin-right: 17px;
  }
`;

/* sidebar a little too narrow at 240px.
  apple music web's sidebar is 260px. 
  spotify's is adjustable but min at 280px.
*/
export const sidebarALittleTooNarrow = /*css*/ `
  ytmusic-guide-renderer {
    width: 260px;
  }

  ytmusic-app[is-bauhaus-sidenav-enabled]:not([guide-collapsed]) {
    --ytmusic-guide-width: 260px;
  }
`;

export const adjustPlayerPagePadding = /*css*/ `
@media(max-width: 615px) {
  ytmusic-player-page {
      --ytmusic-player-page-vertical-padding:24px;
      --ytmusic-player-page-horizontal-padding: 0px;
      --ytmusic-player-page-content-gap: 32px;
      --ytmusic-player-page-side-panel-width: 100%
  }

  ytmusic-player-page[has-info-panel] {
      --ytmusic-player-page-vertical-padding: 24px;
      --ytmusic-player-page-horizontal-padding: 0px;
      --ytmusic-player-page-content-gap: 104px;
      --ytmusic-player-page-side-panel-width: 100%
  }

  ytmusic-player-page[has-info-panel][video-mode] {
      --ytmusic-player-page-vertical-padding: 16px
  }
}

@media(min-width: 616px) and (max-width:935px) {
  ytmusic-player-page {
      --ytmusic-player-page-vertical-padding:16px;
      --ytmusic-player-page-horizontal-padding: 32px;
      --ytmusic-player-page-content-gap: 64px;
      --ytmusic-player-page-side-panel-width: 100%
  }
}

@media(min-width: 936px) and (max-width:1149px) {
  ytmusic-player-page {
      --ytmusic-player-page-vertical-padding:24px;
      --ytmusic-player-page-horizontal-padding: 48px;
      --ytmusic-player-page-content-gap: 48px;
      --ytmusic-player-page-side-panel-width: 40%
  }
}

@media(min-width: 1150px) and (max-width:1363px) {
  ytmusic-player-page {
      --ytmusic-player-page-vertical-padding:32px;
      --ytmusic-player-page-horizontal-padding: 46px;
      --ytmusic-player-page-content-gap: 46px;
      --ytmusic-player-page-side-panel-width: 36%
  }
}

@media(min-width: 1364px) and (max-width:1577px) {
  ytmusic-player-page {
      --ytmusic-player-page-vertical-padding:40px;
      --ytmusic-player-page-horizontal-padding: 46px;
      --ytmusic-player-page-content-gap: 46px;
      --ytmusic-player-page-side-panel-width: 36%
  }
}

@media(min-width: 1578px) {
  ytmusic-player-page {
      --ytmusic-player-page-vertical-padding:44px;
      --ytmusic-player-page-horizontal-padding: 54px;
      --ytmusic-player-page-content-gap: 54px;
      --ytmusic-player-page-side-panel-width: 36%
  }
}

@media(min-width: 1800px) {
  ytmusic-player-page {
      --ytmusic-player-page-vertical-padding: 44px;
      --ytmusic-player-page-horizontal-padding: 76px;
      --ytmusic-player-page-content-gap: 76px;
      --ytmusic-player-page-side-panel-width: 36%
  }
}
`;

/* the popup listbox when right-clicking a song (or 3 dots menu), is a little too loose and padding too big */
export const compactListBox = /*css*/ `
  tp-yt-paper-listbox.ytmusic-menu-popup-renderer {
    padding: 8px 0;
  }

  .yt-simple-endpoint.ytmusic-menu-navigation-item-renderer {
    height: 38px;
  }

  ytmusic-menu-service-item-renderer {
    height: 38px;
  }

  ytmusic-toggle-menu-service-item-renderer {
    height: 38px;
  }

  tp-yt-paper-listbox yt-icon, tp-yt-paper-listbox .yt-icon-container.yt-icon {
    width: var(--iron-icon-width, 19px);
    height: var(--iron-icon-height, 19px);
  }

  tp-yt-paper-item.ytmusic-menu-service-item-download-renderer {
    --paper-item-min-height: 38px;
    padding: 0 14px;
  }

  yt-icon.ytmusic-menu-service-item-download-renderer {
    margin-right: 13px;
  }
`;

export const largerPlayerbarImg = /*css*/ `
.thumbnail-image-wrapper.ytmusic-player-bar {
  height: 46px;
}

.image.ytmusic-player-bar {
  height: 46px;
  border-radius: 4px;
}
`;

/* the dark gradient for the top song controls stays active on fullscreen. im just setting it to no background */
export const noGradientOnFullScreen = /*css*/ `
ytmusic-player[player-ui-state=FULLSCREEN] .song-media-controls.ytmusic-player {
  background: 0;
}
`;

export const misc_style_improvements = /*css*/ `
  /* ThemeSong */
  /* universal styles */

  \${coloredPlayerBg}
  \${noGreyBgOnUserIcon}
  \${fixWeirdMarginWhenFullScreenPlayer}
  \${playBarTextAndIconsColor}
  \${fixNoMarginBottomOnNowPlayingAlbumImage}
  \${removeSearchBoxShadow}
  \${sidebarFocus}
  \${boldSidebarHeaders}
  \${popupStyling}
  \${playerPageScrollbarShowsWhenSidebar}
  \${sidebarALittleTooNarrow}
  \${adjustPlayerPagePadding}
  \${compactListBox}
  \${largerPlayerbarImg}
  \${noGradientOnFullScreen}
`;

export const zebra_stripes = /*css*/ `
:root {
  --ts-zebra-stripes-color: var(--ts-base-100-alpha-005-color, rgb(0 0 0 / 0.04));
}

.ytmusic-section-list-renderer #contents ytmusic-responsive-list-item-renderer:nth-of-type(odd) {
  background-color: var(--ts-zebra-stripes-color);
  border-radius: 5px;
}

/* remove border-bottom / ruler from lists */
#contents.ytmusic-shelf-renderer>*.ytmusic-shelf-renderer:not(:last-child) {
  border-bottom: none !important;
}

#contents.ytmusic-playlist-shelf-renderer>*.ytmusic-playlist-shelf-renderer:not(:last-child) {
  border-bottom: none !important;
}

/* need a bit of margin between last-child and "Show All" button */
.ytmusic-section-list-renderer #contents ytmusic-responsive-list-item-renderer:last-child {
  margin-bottom: 6px;
}

/* remove lines from playerpage list */
ytmusic-player-queue-item {
  border-bottom: none;
}

ytmusic-player-queue-item[play-button-state=loading], ytmusic-player-queue-item[play-button-state=playing], ytmusic-player-queue-item[play-button-state=paused] {
  border-radius: 6px;
}

ytmusic-playlist-shelf-renderer[is-bauhaus-web-playlist-detail-page-redesign-enabled] #contents.ytmusic-playlist-shelf-renderer>*.ytmusic-playlist-shelf-renderer:not(:last-child) {
  margin-bottom: 0px;
  padding: 4px 16px;
}

ytmusic-responsive-list-item-renderer[is-album-detail-page], ytmusic-playlist-shelf-renderer[is-playlist-detail-page] #contents.ytmusic-playlist-shelf-renderer>*.ytmusic-playlist-shelf-renderer:not(:last-child) {
  padding-top: 4px;
  padding-bottom: 4px;
  margin-bottom: 0;
}
`;

export const nowplaying_overlay = /*css*/ `
:root {
  --ts-nowplaying-background-color: #ff2134;
  --ts-nowplaying-text-color: #ffffff;
}

ytmusic-responsive-list-item-renderer[play-button-state=loading], 
ytmusic-responsive-list-item-renderer[play-button-state=playing], 
ytmusic-responsive-list-item-renderer[play-button-state=paused] {
  background-color: var(--ts-nowplaying-background-color) !important;
  border-radius: 5px !important;
}

ytmusic-responsive-list-item-renderer[play-button-state=loading] a, 
ytmusic-responsive-list-item-renderer[play-button-state=playing] a, 
ytmusic-responsive-list-item-renderer[play-button-state=paused] a {
  color: var(--ts-nowplaying-text-color) !important;
}

ytmusic-responsive-list-item-renderer[play-button-state=loading] yt-formatted-string, 
ytmusic-responsive-list-item-renderer[play-button-state=playing] yt-formatted-string, 
ytmusic-responsive-list-item-renderer[play-button-state=paused] yt-formatted-string {
  color: var(--ts-nowplaying-text-color) !important;
}

ytmusic-responsive-list-item-renderer[play-button-state=loading] #button-shape-like button, 
ytmusic-responsive-list-item-renderer[play-button-state=playing] #button-shape-like button, 
ytmusic-responsive-list-item-renderer[play-button-state=paused] #button-shape-like button {
  color: var(--ts-nowplaying-text-color) !important;
}

ytmusic-responsive-list-item-renderer[play-button-state=loading] button, 
ytmusic-responsive-list-item-renderer[play-button-state=playing] button, 
ytmusic-responsive-list-item-renderer[play-button-state=paused] button {
  color: var(--ts-nowplaying-text-color) !important;
}

ytmusic-responsive-list-item-renderer[play-button-state=loading] yt-checkbox-renderer, 
ytmusic-responsive-list-item-renderer[play-button-state=playing] yt-checkbox-renderer, 
ytmusic-responsive-list-item-renderer[play-button-state=paused] yt-checkbox-renderer {
  color: var(--ts-nowplaying-text-color) !important;
}

ytmusic-responsive-list-item-renderer[play-button-state=loading] yt-icon, 
ytmusic-responsive-list-item-renderer[play-button-state=playing] yt-icon, 
ytmusic-responsive-list-item-renderer[play-button-state=paused] yt-icon {
  fill: var(--ts-nowplaying-text-color);
}
`;

export const frosted_glass = /*css*/ `
/*
  PERF:
  - backdrop-filter is one of the most expensive CSS effects in Chrome.
  - The previous implementation applied blur to sticky headers/nav/search and caused continuous
    repaint/compositing during scroll.
  - We keep this module but make it a cheap “frosted” look with NO blur.
*/

#nav-bar-background,
#player-bar-background,
ytmusic-item-section-renderer.stuck #header.ytmusic-item-section-renderer,
ytmusic-tabs.stuck,
ytmusic-search-box {
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}

/* Dropdowns should remain lightweight */
tp-yt-iron-dropdown {
  background: var(--ts-playerbar-color) !important;
}
`;

export const texts_selection = /*css*/ `
  :root {
    --ts-texts-selection-color: dodgerblue;
  }

  ::selection {
    background: var(--ts-texts-selection-color); /* WebKit/Blink Browsers */
  }
  ::-moz-selection {
    background: var(--ts-texts-selection-color); /* Gecko Browsers */
  }
`;

export const base_variables = /*css*/ `
:root {
  /* Base Colors (Dark Variant from Inspiration) */
  --ts-base-00-color: #000000;
  --ts-base-10-color: #1a1a1a;
  --ts-base-20-color: #333333;
  --ts-base-30-color: #4d4d4d;
  --ts-base-40-color: #666666;
  --ts-base-50-color: #808080;
  --ts-base-60-color: #999999;
  --ts-base-70-color: #b3b3b3;
  --ts-base-80-color: #cccccc;
  --ts-base-90-color: #e6e6e6;
  --ts-base-100-color: #ffffff;

  --ts-base-00-alpha-005-color: rgb(0 0 0 / 0.05);
  --ts-base-00-alpha-00-color: rgb(0 0 0 / 0.0);
  --ts-base-00-alpha-01-color: rgb(0 0 0 / 0.1);
  --ts-base-00-alpha-02-color: rgb(0 0 0 / 0.2);
  --ts-base-00-alpha-03-color: rgb(0 0 0 / 0.3);
  --ts-base-00-alpha-04-color: rgb(0 0 0 / 0.4);
  --ts-base-00-alpha-05-color: rgb(0 0 0 / 0.5);
  --ts-base-00-alpha-06-color: rgb(0 0 0 / 0.6);
  --ts-base-00-alpha-07-color: rgb(0 0 0 / 0.7);
  --ts-base-00-alpha-08-color: rgb(0 0 0 / 0.8);
  --ts-base-00-alpha-09-color: rgb(0 0 0 / 0.9);
  --ts-base-00-alpha-10-color: rgb(0 0 0 / 1);

  --ts-base-100-alpha-005-color: rgb(255 255 255 / 0.05);
  --ts-base-100-alpha-00-color: rgb(255 255 255 / 0.0);
  --ts-base-100-alpha-01-color: rgb(255 255 255 / 0.1);
  --ts-base-100-alpha-02-color: rgb(255 255 255 / 0.2);
  --ts-base-100-alpha-03-color: rgb(255 255 255 / 0.3);
  --ts-base-100-alpha-04-color: rgb(255 255 255 / 0.4);
  --ts-base-100-alpha-05-color: rgb(255 255 255 / 0.5);
  --ts-base-100-alpha-06-color: rgb(255 255 255 / 0.6);
  --ts-base-100-alpha-07-color: rgb(255 255 255 / 0.7);
  --ts-base-100-alpha-08-color: rgb(255 255 255 / 0.8);
  --ts-base-100-alpha-09-color: rgb(255 255 255 / 0.9);
  --ts-base-100-alpha-10-color: rgb(255 255 255 / 1);

  --ts-image-filter-brightness: brightness(1);

  --ts-base-blue: #3ea6ff;
  --ts-base-strong-blue: #263850;

  /* Accent Color (Defaulting to Indigo/Blue) */
  --ts-accent-color: #818cf8;
  --ts-accent-color-alpha-10: rgba(129, 140, 248, 0.1);
  --ts-accent-color-alpha-20: rgba(129, 140, 248, 0.2);
  --ts-accent-color-alpha-30: rgba(129, 140, 248, 0.3);
  --ts-accent-color-alpha-50: rgba(129, 140, 248, 0.5);
}

@property --ts-theme-apple-2-color {
  syntax: '<color>';
  inherits: true;
  initial-value: #1a1a1a;
}
@property --ts-theme-apple-3-color {
  syntax: '<color>';
  inherits: true;
  initial-value: #1a1a1a;
}
@property --ts-theme-apple-4-color {
  syntax: '<color>';
  inherits: true;
  initial-value: #1a1a1a;
}
@property --ts-theme-apple-5-color {
  syntax: '<color>';
  inherits: true;
  initial-value: #1a1a1a;
}
@property --ts-body-color {
  syntax: '<color>';
  inherits: true;
  initial-value: #1a1a1a;
}
@property --ts-playerpage-color {
  syntax: '<color> | <image>';
  inherits: true;
  initial-value: #1a1a1a;
}
@property --ts-navbar-color {
  syntax: '<color> | <image>';
  inherits: true;
  initial-value: #1a1a1a;
}
@property --ts-playerbar-color {
  syntax: '<color> | <image>';
  inherits: true;
  initial-value: #1a1a1a;
}
@property --ts-sidebar-color {
  syntax: '<color> | <image>';
  inherits: true;
  initial-value: #1a1a1a;
}
`;

export const icons_buttons = /*css*/ `
  :root {
    --ts-primary-icon-color: var(--ts-base-100-color);
    --ts-secondary-icon-color: var(--ts-base-100-alpha-08-color);
    --ts-tertiary-icon-color: var(--ts-base-70-color);
    --ts-inverse-icon-color: var(--ts-base-00-color);

    --ts-colored-button-color: var(--ts-base-100-color);

    --ts-icon-accent-color: var(--ts-base-100-color);

    --ts-pill-color: var(--ts-base-100-alpha-005-color);
    --ts-pill-hover-color: var(--ts-base-100-alpha-02-color);
  }

  :root {
    /* hovering a button like on the artist or album page */
    --yt-spec-mono-filled-hover: var(--ts-primary-icon-color) !important;
  }

  /* sidebar icons; and when collapsed */
  #mini-guide yt-icon {
    fill: var(--ts-secondary-icon-color);
  }

  .left-controls-buttons tp-yt-iron-icon {
    fill: var(--ts-primary-icon-color, green);
  }

  .middle-controls-buttons tp-yt-iron-icon {
    fill: var(--ts-primary-icon-color, teal);
  }

  .menu.ytmusic-player-bar {
    --iron-icon-fill-color: var(--ts-secondary-icon-color, blue);
  }

  .middle-controls-buttons {
    --iron-icon-fill-color: var(--ts-secondary-icon-color, purple);
  }

  .search-icon #icon {
    fill: var(--ts-secondary-icon-color, crimson);
  }

  ytmusic-search-suggestion {
    --iron-icon-fill-color: var(--ts-secondary-icon-color, crimson);
  }

  .cast-button.ytmusic-cast-button {
    --iron-icon-fill-color: var(--ts-secondary-icon-color, blue);
  }


  tp-yt-paper-listbox .icon {
    fill: var(--ts-secondary-icon-color, rebeccapurple) !important;
  }

  ytd-multi-page-menu-renderer.ytmusic-popup-container {
    --yt-compact-link-icon-color: var(--ts-secondary-icon-color, rgb(200, 100, 100));
  } 

  ytmusic-player-bar:not([repeat-mode=NONE]) .repeat.ytmusic-player-bar {
    color: var(--ts-base-100-color);
  }

  /* volume slider */
  .volume-slider.ytmusic-player-bar, .expand-volume-slider.ytmusic-player-bar {
    width: 100px;
    --paper-slider-active-color: var(--ts-primary-icon-color);
    --paper-slider-knob-color: var(--ts-primary-icon-color);
    --paper-slider-disabled-knob-color: var(--ts-primary-icon-color);
    --paper-slider-knob-start-color: var(--ts-primary-icon-color);
    --paper-slider-knob-start-border-color: var(--ts-primary-icon-color);
  }


  /* playerbar caret */
  .toggle-player-page-button #icon {
    fill: var(--ts-secondary-icon-color, currentcolor);
  }

  /* buttons / like buttons with colored backgrounds and inverse text */
  .yt-spec-button-shape-next--mono.yt-spec-button-shape-next--filled {
    color: var(--yt-spec-text-primary-inverse);
    background-color: var(--ts-colored-button-color);
  }

  /* like buttons on a list like "your likes" */
  .yt-spec-button-shape-next--mono.yt-spec-button-shape-next--text {
    color: var(--ts-icon-accent-color);
  }

  /* some pills on the home page */
  ytmusic-chip-cloud-chip-renderer[enable-bauhaus-style][chip-style=STYLE_LARGE_TRANSLUCENT_AND_SELECTED_WHITE] a.ytmusic-chip-cloud-chip-renderer {
    background: var(--ts-pill-color);
    border: 1px solid var(--ts-base-100-alpha-005-color);
  }

  ytmusic-chip-cloud-chip-renderer[enable-bauhaus-style][chip-style=STYLE_LARGE_TRANSLUCENT_AND_SELECTED_WHITE] a.ytmusic-chip-cloud-chip-renderer:hover {
    background-color: var(--ts-pill-hover-color);
  } 

  ytmusic-chip-cloud-chip-renderer[enable-bauhaus-style][chip-style=STYLE_UNKNOWN] a.ytmusic-chip-cloud-chip-renderer, ytmusic-chip-cloud-chip-renderer[enable-bauhaus-style][chip-style=STYLE_DEFAULT] a.ytmusic-chip-cloud-chip-renderer {
    background-color: var(--ts-pill-color);
    border: 1px solid var(--ts-base-100-alpha-005-color);
  }

  tp-yt-paper-icon-button.ytmusic-carousel-shelf-renderer {
    background-color: var(--ts-pill-color);
    border: 1px solid var(--ts-base-100-alpha-005-color);
  }

  tp-yt-paper-icon-button.ytmusic-carousel-shelf-renderer:hover {
    background-color: var(--ts-pill-color);
  }

  ytmusic-menu-renderer[show-hover] #button.ytmusic-menu-renderer:hover {
    background: var(--ts-pill-color);
  }

  ytmusic-chip-cloud-chip-renderer[enable-bauhaus-style][chip-style=STYLE_UNKNOWN] a.ytmusic-chip-cloud-chip-renderer:hover, ytmusic-chip-cloud-chip-renderer[enable-bauhaus-style][chip-style=STYLE_DEFAULT] a.ytmusic-chip-cloud-chip-renderer:hover {
    background-color: var(--ts-pill-hover-color) !important;
  }

  /* selected pill */
  ytmusic-chip-cloud-chip-renderer[enable-bauhaus-style][chip-style=STYLE_LARGE_TRANSLUCENT_AND_SELECTED_WHITE][is-selected]:not(.iron-selected) a.ytmusic-chip-cloud-chip-renderer {
    background-color: var(--ts-primary-icon-color);
  }

  ytmusic-chip-cloud-chip-renderer[enable-bauhaus-style][chip-style=STYLE_LARGE_TRANSLUCENT_AND_SELECTED_WHITE][is-selected]:not(.iron-selected) a.ytmusic-chip-cloud-chip-renderer .text {
    color: var(--ts-inverse-icon-color) !important;
  }


  /* 'recent activity' dropdown buttons */
  button.ytmusic-sort-filter-button-renderer {
    background: var(--ts-pill-color);
  }

  /* some buttons on explore */
  button.ytmusic-navigation-button-renderer {
    background: var(--ts-pill-color);
  }

  /* icons on top 3 buttons on Explore page */
  yt-icon.ytmusic-navigation-button-renderer {
    color: var(--ts-secondary-icon-color);
  }

  /* sidebar icons */
  tp-yt-app-drawer yt-icon, tp-yt-app-drawer .yt-icon-container.yt-icon {
    fill: var(--ts-secondary-icon-color);
  }

  /* sidebar circle play button */
  tp-yt-app-drawer ytmusic-play-button-renderer[icon="yt-sys-icons:play_arrow"] .icon.ytmusic-play-button-renderer {
    fill: var(--ts-inverse-icon-color);
  }

  ytmusic-guide-entry-renderer:not([is-primary]) #play-button.ytmusic-guide-entry-renderer {
    background-color: var(--ts-primary-icon-color);
  }

  /* top bar icons */
  ytmusic-nav-bar yt-icon, tp-yt-app-drawer .yt-icon-container.yt-icon {
    fill: var(--ts-secondary-icon-color);
  }

  #menu-button.ytmusic-nav-bar {
    color: var(--ts-secondary-icon-color);
  }

  /* sidebar buttons ("sign in", "New Playlist") */
  .yt-spec-button-shape-next--mono.yt-spec-button-shape-next--tonal {
    background-color: var(--ts-base-100-alpha-005-color);
  }

  .yt-spec-touch-feedback-shape--touch-response .yt-spec-touch-feedback-shape__fill {
    background-color: var(--ts-primary-icon-color);
  }

  /* filter pills */
  ytmusic-chip-cloud-chip-renderer[enable-bauhaus-style][chip-style=STYLE_PRIMARY] a.ytmusic-chip-cloud-chip-renderer, ytmusic-chip-cloud-chip-renderer[enable-bauhaus-style][chip-style=STYLE_SECONDARY] a.ytmusic-chip-cloud-chip-renderer, ytmusic-chip-cloud-chip-renderer[enable-bauhaus-style][chip-style=STYLE_UNKNOWN][is-selected] a.ytmusic-chip-cloud-chip-renderer {
    background-color: var(--ts-secondary-icon-color) !important;
  }

  /* selected item */
  .menu-bar-icon.ytmusic-multi-select-menu-bar {
    color: var(--ts-secondary-icon-color);
  }

  /* artist page subscribed button */
  ytmusic-subscribe-button-renderer[is-subscribed] {
    --ytmusic-subscribe-button-color: var(--ts-secondary-icon-color);
    --ytmusic-subscribe-button-outline-color: var(--ts-secondary-icon-color);
  }

  /* little pin on add-to-playlist menu */
  yt-icon.ytmusic-playlist-add-to-option-renderer {
    fill: var(--ts-primary-icon-color);
  }

  /* icons on settings popup */
  yt-icon.ytd-compact-link-renderer {
    fill: var(--ts-secondary-icon-color);
  }

  /* share menu next circle */
  :root {
    --yt-spec-brand-background-primary: var(--ts-inverse-icon-color) !important;
  }

  /* x close butto on share menu */
  .close-icon.ytmusic-unified-share-panel-renderer {
    color: var(--ts-primary-icon-color);
  }
  
  /* sidebar Sign In hover */
  :root {
    --yt-spec-mono-tonal-hover: var(--ts-base-100-alpha-03-color) !important;
  }

  /* sidebar menu items hover */
  tp-yt-paper-item.ytmusic-guide-entry-renderer:hover {
    --ytmusic-guide-entry-background-color: var(--ts-base-100-alpha-01-color) !important;
  }

  /* explicit icon on explore page */
  yt-icon.ytmusic-inline-badge-renderer {
    color: var(--ts-primary-icon-color);
  }

  /* dropdown icon in New playlist */
  ytmusic-dropdown-renderer[dropdown-style=underline] .icon.ytmusic-dropdown-renderer {
    color: var(--ts-tertiary-icon-color);
  }

  /* some icon buttons like the "x" in "saved to playlist" toast */
  button.yt-icon-button {
    color: var(--ts-primary-icon-color);
  }

  /* Save button on up next player page */
  ytmusic-chip-cloud-chip-renderer[chip-style=STYLE_TRANSPARENT] a.ytmusic-chip-cloud-chip-renderer {
    color: var(--ts-inverse-icon-color);
    background: var(--ts-secondary-icon-color);
  }

  ytmusic-chip-cloud-chip-renderer[chip-style=STYLE_TRANSPARENT] a.ytmusic-chip-cloud-chip-renderer .text {
    color: var(--ts-inverse-icon-color) !important;
  }

  /* bottom right fullscreen button (when in fullscreen) */
  ytmusic-player-bar[player-fullscreened] .exit-fullscreen-button.ytmusic-player-bar {
    color: var(--ts-primary-icon-color);
  }

  /* 3 dot icon when hovering thumbnail album cover */
  .thumbnail-overlay .yt-spec-button-shape-next--mono.yt-spec-button-shape-next--text {
    color: #fff;
  }

  /* icons on dialog popup when selecting checkbox from library */
  #multiSelectMenu.ytmusic-multi-select-menu-bar {
    --iron-icon-fill-color: var(--ts-primary-icon-color);
  }

  /* player page: up next, lyrics, related. paper ripple focus */
  tp-yt-paper-tab.ytmusic-player-page {
    --paper-tab-ink: var(--ts-base-100-color);
  }

  /* playerbar icons hover. like button. 3 dots */
  .yt-spec-button-shape-next--mono.yt-spec-button-shape-next--text:hover {
    background-color: var(--ts-pill-hover-color);
  }

  /* home page. "more" button hover */
  .yt-spec-button-shape-next--mono.yt-spec-button-shape-next--outline:hover {
    background-color: var(--ts-pill-hover-color);
  }

  /* playlist. shuffle button hover */
  .yt-spec-button-shape-next--mono.yt-spec-button-shape-next--filled:hover {
    background-color: var(--ts-base-70-color);
  }

  /* sidebar New Playlist button hover color */
  .yt-spec-button-shape-next--mono.yt-spec-button-shape-next--tonal:hover {
    background-color: var(--ts-base-100-alpha-03-color);
  }

  /* blue toggle buttons */
  /* active */
  html {
    --paper-toggle-button-checked-bar-color: var(--ytmusic-setting-item-toggle-active) !important;
    --ytmusic-setting-item-toggle-active: #3131ff;
  }
  
  /* disabled */
  html {
    --yt-spec-icon-disabled: var(--ts-base-50-color) !important;
  }

  /* volume bar container bg */
  .volume-slider.ytmusic-player-bar, .expand-volume-slider.ytmusic-player-bar {
    width: 100px;
    --paper-slider-container-color: var(--ts-base-100-alpha-04-color);
  }

  /* mobile layout */
  ytmusic-player-page[is-mweb-modernization-enabled] .collapse-button.ytmusic-player-page {
    color: var(--ts-primary-icon-color);
  }

  .controls.ytmusic-player-controls {
    color: var(--ts-primary-icon-color);
  }

  .play-pause-button-wrapper.ytmusic-player-controls tp-yt-paper-icon-button.ytmusic-player-controls {
    --iron-icon-fill-color: var(--ts-inverse-icon-color);
  }

  .play-pause-button-wrapper.ytmusic-player-controls {
    background: var(--ts-primary-icon-color);
  }

  .current-time.ytmusic-player-controls, .total-time.ytmusic-player-controls {
    color: var(--ts-base-100-alpha-07-color);
  }

  ytmusic-player-bar[is-mweb-player-bar-modernization-enabled] .right-controls.ytmusic-player-bar tp-yt-paper-icon-button.ytmusic-player-bar {
    --iron-icon-fill-color: var(--ts-primary-icon-color);
  }

  ytmusic-responsive-header-renderer[num-header-buttons="3"] .action-buttons.ytmusic-responsive-header-renderer .ytmusic-responsive-header-renderer:nth-child(2), ytmusic-responsive-header-renderer[num-header-buttons="5"][is-bauhaus-detail-pages-redesign-download-buttons-enabled] .action-buttons.ytmusic-responsive-header-renderer .ytmusic-responsive-header-renderer:nth-child(3) {
    --yt-button-color: var(--ts-inverse-icon-color);
    background-color: var(--ts-base-100-color);
  }

  ytmusic-responsive-header-renderer[is-bauhaus-web-playlist-detail-page-redesign-enabled][num-header-buttons="3"] .action-buttons.ytmusic-responsive-header-renderer *.ytmusic-responsive-header-renderer:not(:nth-child(2)), ytmusic-responsive-header-renderer[is-bauhaus-web-playlist-detail-page-redesign-enabled][num-header-buttons="3"] .action-buttons.ytmusic-responsive-header-renderer yt-button-renderer.ytmusic-responsive-header-renderer:nth-child(2), ytmusic-responsive-header-renderer[is-bauhaus-web-playlist-detail-page-redesign-enabled][num-header-buttons="4"] .action-buttons.ytmusic-responsive-header-renderer>*.ytmusic-responsive-header-renderer, ytmusic-responsive-header-renderer[is-bauhaus-web-playlist-detail-page-redesign-enabled][num-header-buttons="5"] .action-buttons.ytmusic-responsive-header-renderer *.ytmusic-responsive-header-renderer:not(:nth-child(3)), ytmusic-responsive-header-renderer[is-bauhaus-web-album-detail-page-redesign-enabled][num-header-buttons="3"] .action-buttons.ytmusic-responsive-header-renderer *.ytmusic-responsive-header-renderer:not(:nth-child(2)), ytmusic-responsive-header-renderer[is-bauhaus-web-album-detail-page-redesign-enabled][num-header-buttons="3"] .action-buttons.ytmusic-responsive-header-renderer yt-button-renderer.ytmusic-responsive-header-renderer:nth-child(2), ytmusic-responsive-header-renderer[is-bauhaus-web-album-detail-page-redesign-enabled][num-header-buttons="4"] .action-buttons.ytmusic-responsive-header-renderer>*.ytmusic-responsive-header-renderer, ytmusic-responsive-header-renderer[is-bauhaus-web-album-detail-page-redesign-enabled][num-header-buttons="5"] .action-buttons.ytmusic-responsive-header-renderer *.ytmusic-responsive-header-renderer:not(:nth-child(3)) {
    background-color: var(--ts-base-100-alpha-01-color);
  }
  
  .left-items ytmusic-play-button-renderer {
    --ytmusic-play-button-icon-color: oklch(0.75 var(--ts-palette-0-c) var(--ts-palette-0-h)) !important;
  }

  .top-bar.ytmusic-dismissable-dialog-renderer {
    color: #000;
    --yt-endpoint-color: var(--ts-primary-icon-color);
    --yt-endpoint-hover-color: var(--ts-primary-icon-color);
    --yt-endpoint-visited-color: var(--ts-primary-icon-color);
  }

  yt-icon.ytmusic-menu-service-item-download-renderer {
    fill: var(--ts-secondary-icon-color);
  }

  .yt-spec-button-shape-next--call-to-action.yt-spec-button-shape-next--text:hover {
    background-color: var(--ts-base-strong-blue);
  }

  yt-icon[icon="yt-icons:close"] {
    color: var(--ts-primary-icon-color);
  }

  ytmusic-responsive-header-renderer[is-playlist-detail-page][num-header-buttons="3"] .action-buttons.ytmusic-responsive-header-renderer *.ytmusic-responsive-header-renderer:not(:nth-child(2)), ytmusic-responsive-header-renderer[is-playlist-detail-page][num-header-buttons="3"] .action-buttons.ytmusic-responsive-header-renderer yt-button-renderer.ytmusic-responsive-header-renderer:nth-child(2), ytmusic-responsive-header-renderer[is-playlist-detail-page][num-header-buttons="4"] .action-buttons.ytmusic-responsive-header-renderer>*.ytmusic-responsive-header-renderer, ytmusic-responsive-header-renderer[is-playlist-detail-page][num-header-buttons="5"] .action-buttons.ytmusic-responsive-header-renderer *.ytmusic-responsive-header-renderer:not(:nth-child(3)), ytmusic-responsive-header-renderer[is-album-detail-page][num-header-buttons="3"] .action-buttons.ytmusic-responsive-header-renderer *.ytmusic-responsive-header-renderer:not(:nth-child(2)), ytmusic-responsive-header-renderer[is-album-detail-page][num-header-buttons="3"] .action-buttons.ytmusic-responsive-header-renderer yt-button-renderer.ytmusic-responsive-header-renderer:nth-child(2), ytmusic-responsive-header-renderer[is-album-detail-page][num-header-buttons="4"] .action-buttons.ytmusic-responsive-header-renderer>*.ytmusic-responsive-header-renderer, ytmusic-responsive-header-renderer[is-album-detail-page][num-header-buttons="5"] .action-buttons.ytmusic-responsive-header-renderer *.ytmusic-responsive-header-renderer:not(:nth-child(3)) {
    background-color: var(--ts-pill-color);
  }

  ytmusic-responsive-header-renderer[num-header-buttons="3"] .action-buttons.ytmusic-responsive-header-renderer .ytmusic-responsive-header-renderer:nth-child(2), ytmusic-responsive-header-renderer[num-header-buttons="5"] .action-buttons.ytmusic-responsive-header-renderer .ytmusic-responsive-header-renderer:nth-child(3) {
    background-color: var(--ts-primary-icon-color);
  }

  ytmusic-play-button-renderer[icon="yt-sys-icons:play_arrow"] .icon.ytmusic-play-button-renderer {
    fill: var(--ts-inverse-icon-color);
  }

  ytmusic-responsive-list-item-renderer .icon , ytmusic-responsive-list-item-renderer ytmusic-play-button-renderer[icon="yt-sys-icons:play_arrow"] .icon.ytmusic-play-button-renderer {
    fill: #b3b3b3;
  }

  yt-icon.ytmusic-inline-badge-renderer {
    fill: var(--ts-primary-icon-color);
  }

  yt-icon-button.ytmusic-carousel-shelf-renderer {
    border: 1px solid var(--ts-base-100-alpha-03-color);
  }

  yt-icon-button.ytmusic-carousel-shelf-renderer:hover {
    background-color: var(--ts-base-100-alpha-01-color);
  }

  ytmusic-play-button-renderer:not([icon=PLAY_ARROW]) .icon.ytmusic-play-button-renderer {
    color: #b3b3b3;
  }

  #song-media-window yt-icon {
    fill: #fff;
  }

  ytmusic-menu-service-item-download-renderer {
    --iron-icon-fill-color: var(--ts-secondary-icon-color);
    --icon-color: var(--ts-primary-icon-color);
  }

  ytmusic-guide-entry-renderer {
      color: var(--ts-secondary-icon-color);
      --yt-endpoint-color: var(--ts-secondary-icon-color);
      --yt-endpoint-hover-color: var(--ts-secondary-icon-color);
      --yt-endpoint-visited-color: var(--ts-secondary-icon-color);
  }

  .icon.ytmusic-menu-service-item-renderer {
    --icon-color: var(--ts-primary-icon-color);
  }

  ytmusic-toggle-menu-service-item-renderer {
    --iron-icon-fill-color: var(--ts-primary-icon-color);
    --icon-color: var(--ts-primary-icon-color);
  }

  .cast-button.ytmusic-cast-button {
    height: 32px;
    --iron-icon-fill-color: var(--ts-primary-icon-color);
    --icon-color: var(--ts-primary-icon-color);
  }

  .ytmusicMultiPageMenuRendererDelhiIconsEnabled {
    --yt-compact-link-icon-color: var(--ts-primary-icon-color);
  }

  #song-media-window button.yt-icon-button {
    color: #fff;
  }
`;

export const texts = /*css*/ `
:root {
  --ts-primary-text-color: var(--ts-base-100-color);
  --ts-secondary-text-color: var(--ts-base-80-color);
  --ts-tertiary-text-color: var(--ts-base-70-color);
  --ts-inverse-text-color: var(--ts-base-00-color);
  --ts-primary-text-alpha-color: var(--ts-base-100-alpha-07-color);
  --ts-secondary-text-alpha-color: var(--ts-base-100-alpha-03-color);
  --yt-spec-static-overlay-text-secondary: var(--ts-base-100-alpha-07-color);

  /* PERF: prefer updating a small set of platform tokens instead of painting over many element selectors */
  --yt-spec-text-primary: var(--ts-primary-text-color) !important;
  --yt-spec-text-secondary: var(--ts-secondary-text-color) !important;
  --yt-spec-text-disabled: var(--ts-tertiary-text-color) !important;
  --ytmusic-text-primary: var(--ts-primary-text-color) !important;
  --ytmusic-text-secondary: var(--ts-secondary-text-color) !important;
}

:root {
  /* secondary texts on lists like "your likes" */
  --ytmusic-overlay-text-secondary: var(--ts-secondary-text-color, steelblue);

  /* some button texts such as "Shuffle" on a playlist. should generally be inverse */
  --yt-spec-text-primary-inverse: var(--ts-inverse-text-color, gold) !important;

  /* saved to liked music */
  --yt-spec-static-overlay-text-primary: var(--ts-primary-text-color);
}

/* 'recent activity' dropdown buttons */
button.ytmusic-sort-filter-button-renderer {
  color: var(--ts-primary-text-color, red);
}

/* getting the rest of the texts like when clicking on user avatar menu */
:root {
  --ytmusic-text-primary: var(--ts-primary-text-color, tomato) !important;
}

/* large navbar texts (Home, Explore etc) */
ytmusic-pivot-bar-item-renderer yt-formatted-string:hover, ytmusic-pivot-bar-item-renderer.iron-selected {
  color: var(--ts-primary-text-color, yellow) !important;
}

ytmusic-pivot-bar-item-renderer yt-formatted-string {
  color: var(--ts-tertiary-text-color, hotpink) !important;
}

/* on playerpage */
.song-title {
  color: var(--ts-primary-text-color, mediumslateblue) !important;
}


/* "Search" on navbar */

ytmusic-search-box:not([opened]):hover {
  color: var(--ts-primary-text-color, indianred);
}

ytmusic-search-box {
  color: var(--ts-secondary-text-color, purple);
}

ytmusic-search-box[opened] input.ytmusic-search-box::placeholder {
  color: var(--ts-secondary-text-color, peru) !important;
}

ytmusic-search-box[has-query] input.ytmusic-search-box, ytmusic-search-box[opened] input.ytmusic-search-box {
  color: var(--ts-secondary-text-color, purple);
}

tp-yt-paper-icon-button.ytmusic-search-box, input.ytmusic-search-box, input.ytmusic-search-box::placeholder {
  color: var(--ts-secondary-text-color, purple);
}

/* playpage. up next subtitles like artists and time */
/* also subtitles on the playbar */
.duration, .byline {
  color: var(--ts-secondary-text-color, #e62e5f) !important;
  --yt-endpoint-color: var(--ts-secondary-text-color, rgb(200,100,100)) !important;
  --yt-endpoint-hover-color: var(--ts-secondary-text-color, blue) !important;
  --yt-endpoint-visited-color: var(--ts-secondary-text-color, purple) !important;
}



.time-info.ytmusic-player-bar {
  color: var(--ts-secondary-text-color, red) !important;
}

/* some new additions. "More" button on the home page */
.yt-spec-button-shape-next--mono.yt-spec-button-shape-next--outline {
  color: var(--ts-primary-text-color, #8a3b96);
  border-color: var(--ts-secondary-text-alpha-color, blue);
}

/* player page sidebar headers */
tp-yt-paper-tab.iron-selected.ytmusic-player-page {
  color: var(--ts-primary-text-color, red);
}

tp-yt-paper-tab.ytmusic-player-page {
  color: var(--ts-primary-text-alpha-color, rgba(255,50,100,0.7));
}

tp-yt-paper-tab.ytmusic-player-page[disabled] {
  color: var(--ts-secondary-text-alpha-color, rgba(55,55,255,0.3));
}


button.ytmusic-navigation-button-renderer {
  color: var(--ts-primary-text-alpha-color, blue);
}

.container.ytmusic-custom-index-column-renderer {
  color: var(--ts-primary-text-alpha-color, red);
}

/* search page that comes up */
ytmusic-tabs.iron-selected .tab.ytmusic-tabs, .tab.selected.ytmusic-tabs {
  color: var(--ts-primary-text-color);
}

.tab.ytmusic-tabs {
  color: var(--ts-primary-text-alpha-color);
}

/* artists page. 'more', 'less' */
.more-button.ytmusic-detail-header-renderer {
  --ytmusic-toggle-button-color: var(--ts-primary-text-color);
}

/* time info when hovering playerbar progressbar */
#hover-time-info.ytmusic-player-bar {
  color: var(--ts-primary-text-color);
}

/* sidebar */
/* "sign in , new playlist button texts" */
.yt-spec-button-shape-next--mono.yt-spec-button-shape-next--tonal {
  color: var(--ts-primary-text-color);
}

/* dropdown texts. Like picking region in settins */
tp-yt-paper-dropdown-menu.ytmusic-setting-single-option-menu-renderer .input-content.tp-yt-paper-input-container>input, tp-yt-paper-dropdown-menu.ytmusic-setting-single-option-menu-renderer .input-content.tp-yt-paper-input-container>iron-input, tp-yt-paper-dropdown-menu.ytmusic-setting-single-option-menu-renderer .input-content.tp-yt-paper-input-container>textarea, tp-yt-paper-dropdown-menu.ytmusic-setting-single-option-menu-renderer .input-content.tp-yt-paper-input-container>iron-autogrow-textarea, tp-yt-paper-dropdown-menu.ytmusic-setting-single-option-menu-renderer .input-content.tp-yt-paper-input-container>.paper-input-input {
  color: var(--ts-primary-text-color);
}

ytmusic-dropdown-renderer[dropdown-style=underline] tp-yt-paper-dropdown-menu.ytmusic-dropdown-renderer .input-content.tp-yt-paper-input-container>input, ytmusic-dropdown-renderer[dropdown-style=underline] tp-yt-paper-dropdown-menu.ytmusic-dropdown-renderer .input-content.tp-yt-paper-input-container>iron-input, ytmusic-dropdown-renderer[dropdown-style=underline] tp-yt-paper-dropdown-menu.ytmusic-dropdown-renderer .input-content.tp-yt-paper-input-container>textarea, ytmusic-dropdown-renderer[dropdown-style=underline] tp-yt-paper-dropdown-menu.ytmusic-dropdown-renderer .input-content.tp-yt-paper-input-container>iron-autogrow-textarea, ytmusic-dropdown-renderer[dropdown-style=underline] tp-yt-paper-dropdown-menu.ytmusic-dropdown-renderer .input-content.tp-yt-paper-input-container>.paper-input-input {
  color: var(--ts-primary-text-color);
}

/* input texts (e.g. New playlist) */
.input.ytmusic-playlist-form:not(tp-yt-paper-textarea) .input-content.tp-yt-paper-input-container>input, .input.ytmusic-playlist-form:not(tp-yt-paper-textarea) .input-content.tp-yt-paper-input-container>iron-input, .input.ytmusic-playlist-form:not(tp-yt-paper-textarea) .input-content.tp-yt-paper-input-container>textarea, .input.ytmusic-playlist-form:not(tp-yt-paper-textarea) .input-content.tp-yt-paper-input-container>iron-autogrow-textarea, .input.ytmusic-playlist-form:not(tp-yt-paper-textarea) .input-content.tp-yt-paper-input-container>.paper-input-input {
  color: var(--ts-primary-text-color);
}

tp-yt-paper-textarea.ytmusic-playlist-form .input-content.tp-yt-paper-input-container>input, tp-yt-paper-textarea.ytmusic-playlist-form .input-content.tp-yt-paper-input-container>iron-input, tp-yt-paper-textarea.ytmusic-playlist-form .input-content.tp-yt-paper-input-container>textarea, tp-yt-paper-textarea.ytmusic-playlist-form .input-content.tp-yt-paper-input-container>iron-autogrow-textarea, tp-yt-paper-textarea.ytmusic-playlist-form .input-content.tp-yt-paper-input-container>.paper-input-input {
  color: var(--ts-primary-text-color);
}

.input.ytmusic-playlist-form #labelAndInputContainer#labelAndInputContainer.label-is-floating>label, .input.ytmusic-playlist-form #labelAndInputContainer#labelAndInputContainer.label-is-floating>.paper-input-label {
  color: var(--ts-secondary-text-color);
}

ytmusic-dropdown-renderer[dropdown-style=underline] tp-yt-paper-dropdown-menu.ytmusic-dropdown-renderer #labelAndInputContainer#labelAndInputContainer.label-is-floating>label, ytmusic-dropdown-renderer[dropdown-style=underline] tp-yt-paper-dropdown-menu.ytmusic-dropdown-renderer #labelAndInputContainer#labelAndInputContainer.label-is-floating>.paper-input-label {
  color: var(--ts-secondary-text-color);
}

/* toast that pops up when a song is played next */
tp-yt-paper-toast {
  color: var(--ts-primary-text-color);
}

/* button texts when you try to delete an uploaded song */
.yt-spec-button-shape-next--overlay.yt-spec-button-shape-next--text {
  color: var(--ts-primary-text-color) !important;
}

/* song pills. selected. (All, Familiar, Discover, etc) */
ytmusic-chip-cloud-chip-renderer[enable-bauhaus-style][chip-style=STYLE_PRIMARY] a.ytmusic-chip-cloud-chip-renderer, ytmusic-chip-cloud-chip-renderer[enable-bauhaus-style][chip-style=STYLE_SECONDARY] a.ytmusic-chip-cloud-chip-renderer, ytmusic-chip-cloud-chip-renderer[enable-bauhaus-style][chip-style=STYLE_UNKNOWN][is-selected] a.ytmusic-chip-cloud-chip-renderer .text {
  color: var(--ts-inverse-text-color) !important;
}

ytmusic-chip-cloud-chip-renderer[enable-bauhaus-style][chip-style=STYLE_PRIMARY] a.ytmusic-chip-cloud-chip-renderer, ytmusic-chip-cloud-chip-renderer[enable-bauhaus-style][chip-style=STYLE_SECONDARY] a.ytmusic-chip-cloud-chip-renderer, ytmusic-chip-cloud-chip-renderer[enable-bauhaus-style][chip-style=STYLE_UNKNOWN][is-selected] a.ytmusic-chip-cloud-chip-renderer {
  color: var(--ts-inverse-text-color) !important;
}

/* links. blue links. "manage your account" */
ytd-multi-page-menu-renderer.ytmusic-popup-container {
  --yt-spec-call-to-action: var(--ts-base-blue);
  --yt-endpoint-hover-color: var(--ts-base-blue);
}

/* Libary - Artists - Sort */
ytmusic-dropdown-renderer[dropdown-style=default] tp-yt-paper-dropdown-menu.ytmusic-dropdown-renderer .input-content.tp-yt-paper-input-container>input, ytmusic-dropdown-renderer[dropdown-style=default] tp-yt-paper-dropdown-menu.ytmusic-dropdown-renderer .input-content.tp-yt-paper-input-container>iron-input, ytmusic-dropdown-renderer[dropdown-style=default] tp-yt-paper-dropdown-menu.ytmusic-dropdown-renderer .input-content.tp-yt-paper-input-container>textarea, ytmusic-dropdown-renderer[dropdown-style=default] tp-yt-paper-dropdown-menu.ytmusic-dropdown-renderer .input-content.tp-yt-paper-input-container>iron-autogrow-textarea, ytmusic-dropdown-renderer[dropdown-style=default] tp-yt-paper-dropdown-menu.ytmusic-dropdown-renderer .input-content.tp-yt-paper-input-container>.paper-input-input {
  color: var(--ts-primary-text-color);
  --yt-endpoint-color: var(--ts-primary-text-color);
  --yt-endpoint-hover-color: var(--ts-primary-text-color);
  --yt-endpoint-visited-color: var(--ts-primary-text-color);
}
ytmusic-dropdown-renderer[dropdown-style=default] {
  background-color: var(--ts-base-100-alpha-01-color);
  border: 1px solid var(--ts-base-100-alpha-01-color);
}

/* form - like editing playlists */
tp-yt-paper-tab.iron-selected.ytmusic-playlist-form {
  color: var(--ts-primary-text-color);
}
tp-yt-paper-tab.ytmusic-playlist-form {
  color: var(--ts-base-100-alpha-06-color);
}
tp-yt-paper-tabs.ytmusic-playlist-form {
  --paper-tabs-selection-bar-color: var(--ts-primary-text-color);
}

/* add to playlist menu */
.section-heading.ytmusic-add-to-playlist-renderer {
  color: var(--ts-primary-text-color);;
}

#title.ytmusic-playlist-add-to-option-renderer {
  color: var(--ts-primary-text-color);;
}

/* settings menu */
.summary.ytmusic-setting-boolean-renderer {
  color: var(--ts-primary-text-color);
}

.summary.ytmusic-setting-action-renderer {
  color: var(--ts-primary-text-color);
}

.summary.ytmusic-setting-read-only-item-renderer {
  color: var(--ts-primary-text-color);
}

/* pick artists you like */
.primary-text.ytmusic-tastebuilder-renderer {
  color: var(--ts-primary-text-color);
  --yt-endpoint-color: var(--ts-primary-text-color);
  --yt-endpoint-hover-color: var(--ts-primary-text-color);
  --yt-endpoint-visited-color: var(--ts-primary-text-color);
}

/* numbered tracks in album view */
.index.ytmusic-responsive-list-item-renderer {
  color: var(--ts-secondary-text-color);
}

/* lyrics Source subtitle */
.footer.ytmusic-description-shelf-renderer {
  color: var(--ts-secondary-text-color);
}

/* privacy dropdown when creating playlist */
.label.ytmusic-dropdown-item-renderer {
  color: var(--ts-primary-text-color);
  --yt-endpoint-color: var(--ts-primary-text-color);
  --yt-endpoint-hover-color: var(--ts-primary-text-color);
  --yt-endpoint-visited-color: var(--ts-primary-text-color);
}

/* texts when there's no lyrics */
.text.ytmusic-message-renderer, .subtext.ytmusic-message-renderer {
  color: var(--ts-secondary-text-color);
}

yt-formatted-string.ytmusic-guide-signin-promo-renderer {
  color: var(--ts-secondary-text-color);
}

/* */
.strapline-text.ytmusic-responsive-header-renderer {
  color: var(--ts-tertiary-text-color);
  --yt-endpoint-color: var(--ts-tertiary-text-color);
  --yt-endpoint-hover-color: var(--ts-tertiary-text-color);
  --yt-endpoint-visited-color: var(--ts-tertiary-text-color);
}


ytmusic-responsive-header-renderer[is-bauhaus-web-playlist-detail-page-redesign-enabled] .strapline-text.ytmusic-responsive-header-renderer, ytmusic-responsive-header-renderer[is-bauhaus-web-album-detail-page-redesign-enabled] .strapline-text.ytmusic-responsive-header-renderer {
  color: var(--ts-primary-text-color);
  --yt-endpoint-color: var(--ts-primary-text-color);
  --yt-endpoint-hover-color: var(--ts-primary-text-color);
  --yt-endpoint-visited-color: var(--ts-primary-text-color);
}

ytmusic-shelf-renderer[is-bauhaus-web-detail-page-redesign-enabled] .title.ytmusic-shelf-renderer>yt-formatted-string.ytmusic-shelf-renderer {
  color: var(--ts-primary-text-color);
  --yt-endpoint-color: var(--ts-primary-text-color);
  --yt-endpoint-hover-color: var(--ts-primary-text-color);
  --yt-endpoint-visited-color: var(--ts-primary-text-color);
}

.yt-spec-button-shape-next--call-to-action.yt-spec-button-shape-next--text {
  color: var(--ts-base-blue);
}

yt-formatted-string.ytmusic-menu-service-item-download-renderer {
  color: var(--ts-primary-text-color);
}

yt-formatted-string.ytmusic-menu-service-item-download-renderer {
  color: var(--ts-primary-text-color);
}

#text.yt-notification-action-renderer, #sub-text.yt-notification-action-renderer {
  color: var(--ts-primary-text-color);
}

ytmusic-responsive-header-renderer[is-playlist-detail-page] .strapline-text.ytmusic-responsive-header-renderer, ytmusic-responsive-header-renderer[is-album-detail-page] .strapline-text.ytmusic-responsive-header-renderer {
    color: var(--ts-primary-text-color);
    --yt-endpoint-color: var(--ts-primary-text-color);
    --yt-endpoint-hover-color: var(--ts-primary-text-color);
    --yt-endpoint-visited-color: var(--ts-primary-text-color);
}

ytmusic-shelf-renderer[is-playlist-detail-page] .title.ytmusic-shelf-renderer>yt-formatted-string.ytmusic-shelf-renderer, ytmusic-shelf-renderer[is-album-detail-page] .title.ytmusic-shelf-renderer>yt-formatted-string.ytmusic-shelf-renderer {
    color: var(--ts-primary-text-color);
    --yt-endpoint-color: var(--ts-primary-text-color);
    --yt-endpoint-hover-color: var(--ts-primary-text-color);
    --yt-endpoint-visited-color: var(--ts-primary-text-color);
}

tp-yt-iron-input.tp-yt-paper-input>input.tp-yt-paper-input {
  color: var(--ts-primary-text-color);
}

.ytmusicMultiPageMenuRendererHost {
    --yt-spec-call-to-action: var(--ts-base-blue);
    --yt-endpoint-hover-color: var(--ts-base-blue);
}

.section-title.ytmusic-dismissable-dialog-renderer {
    color: var(--ts-primary-text-color);
}

.yt-list-item-view-model__title {
    color: var(--ts-primary-text-color);
}
`;

export const appleMusicThemeCss = /*css*/ `
  /* Core Theme Colors with Robust Hue Fallbacks */
  :root {
    --applemusic-color: #fa233b;
    
    /* Core Theme Colors with Robust Hue Fallbacks */
    /* We use the specific swatch's hue if it's not 0, otherwise we use the dominant hue */
    --ts-main-hue: var(--ts-palette-dominant-h);
    
    --ts-theme-apple-4-color: oklch(45% calc(var(--ts-palette-lightvibrant-c) * 0.5) var(--ts-palette-lightvibrant-h, var(--ts-main-hue)));
    --ts-theme-apple-2-color: oklch(40% calc(var(--ts-palette-vibrant-c) * 0.4) var(--ts-palette-vibrant-h, var(--ts-main-hue)));
    --ts-theme-apple-5-color: oklch(35% calc(var(--ts-palette-darkvibrant-c) * 0.35) var(--ts-palette-darkvibrant-h, var(--ts-main-hue)));
    --ts-theme-apple-3-color: oklch(32% calc(var(--ts-palette-muted-c) * 0.3) var(--ts-palette-muted-h, var(--ts-main-hue)));
    
    /* PERF: avoid transitions on palette-driven variables and large surfaces */
    --ts-bgcolor-transition: none;
    transition: none !important;
  }




  /* Shared Properties */
  :root {
    --ts-body-color: hsl(0 0% 10%);
    --ts-body-alpha-gradient-color: hsl(0 0% 10% / 0.7);
    --ts-overlay-color: rgb(0 0 0 / 0.6);
    --ts-nowplaying-background-color: var(--applemusic-color);
    --ts-texts-selection-color: #1665b5;
    --ts-songimg-box-shadow: 0 10px 50px rgb(0 0 0 / 0.6);
    --ts-ruler-secondary-color: var(--ts-base-100-alpha-01-color);
  }

  /* --- STATE: BROWSE MODE (Default) --- */
  :root {
    --ts-navbar-color: linear-gradient(180deg, hsl(0 0% 14%) 0%, hsl(0 0% 14% / 0.95) 100%);
    --ts-playerbar-color: hsl(0 0% 15% / 0.85);
    --ts-playerpage-color: hsl(0 0% 10%);
    --ts-sidebar-color: hsl(0 0% 13% / 0.5);
    --ts-secondary-icon-color: var(--applemusic-color);
    --ts-primary-icon-color: rgb(240 240 240);
    --ts-pill-color: var(--ts-base-100-alpha-005-color);
  }

  /* --- STATE: PLAYER PAGE / FULLSCREEN (Dynamic) --- */
  html.ts-player-page-open,
  html.ts-player-fullscreened,
  ytmusic-app-layout[player-page-open],
  ytmusic-app-layout[player-fullscreened] {
    --ts-body-color: var(--ts-theme-apple-5-color) !important;
    --ts-navbar-color: linear-gradient(178deg, var(--ts-theme-apple-4-color) 0%, var(--ts-theme-apple-5-color) 100%);
    --ts-sidebar-color: linear-gradient(180deg, var(--ts-theme-apple-4-color) 0%, var(--ts-theme-apple-5-color) 100%);
    --ts-playerpage-color: linear-gradient(135deg, var(--ts-theme-apple-4-color) 0%, var(--ts-theme-apple-3-color) 40%, var(--ts-theme-apple-5-color) 100%);
    --ts-playerbar-color: linear-gradient(180deg, var(--ts-theme-apple-5-color) 0%, var(--ts-theme-apple-3-color) 100%);
    --ts-playerpageavtoggle-color: var(--ts-theme-apple-2-color);
    
    /* Re-map YTM internals when player is open to ensure no black gaps */
    --ytmusic-general-background-c: var(--ts-theme-apple-5-color) !important;
    --ytmusic-player-page-background: var(--ts-playerpage-color) !important;
  }

  /* Force background overrides on specific elements */
  ytmusic-player-page {
    background: var(--ts-playerpage-color) !important;
  }

  /* Navigation elements when player is active */
  ytmusic-app-layout[player-page-open] #nav-bar-background,
  ytmusic-app-layout[player-fullscreened] #nav-bar-background {
    background: var(--ts-navbar-color) !important;
  }

  ytmusic-app-layout[player-page-open] #guide-wrapper,
  ytmusic-app-layout[player-fullscreened] #guide-wrapper,
  ytmusic-app-layout[player-page-open] #mini-guide-background {
    background: var(--ts-sidebar-color) !important;
  }

  /* Sidebar/Guide Overrides */
  ytmusic-guide-entry-renderer[active] .item.ytmusic-guide-entry-renderer yt-icon {
    fill: var(--applemusic-color) !important;
  }
  
  ytmusic-guide-entry-renderer[active] .title.ytmusic-guide-entry-renderer {
    color: var(--applemusic-color) !important;
  }

  /* Player Elements Polish */
  ytmusic-player[player-ui-state=FULLSCREEN] {
    box-shadow: none !important;
    background: transparent !important;
  }

  #main-panel {
    background: transparent !important;
  }

  ytmusic-player-page,
  #player-page {
    background: var(--ts-playerpage-color) !important;
    transition: none !important;
  }

  /* Force AV Toggle to use dynamic color when player is open */
  html.ts-player-page-open .song-button.ytmusic-av-toggle[aria-pressed=true],
  html.ts-player-page-open .video-button.ytmusic-av-toggle[aria-pressed=true],
  html.ts-player-fullscreened .song-button.ytmusic-av-toggle[aria-pressed=true],
  html.ts-player-fullscreened .video-button.ytmusic-av-toggle[aria-pressed=true] {
    background-color: var(--ts-playerpageavtoggle-color) !important;
  }


  ytmusic-player[player-ui-state=PLAYER_PAGE_OPEN] {
    background: transparent !important;
    transition: none !important;
  }

  /* Global Browse Mode Overrides */
  ytmusic-tabs.stuck {
    border-top: 1px solid #454545;
    border-bottom: 1px solid #454545;
  }

  #button-shape-like button {
    color: var(--applemusic-color);
  }

  body::-webkit-scrollbar-track {
    background-color: rgb(255 255 255 / 0.03);
  }
  
  ytmusic-search-box[is-bauhaus-sidenav-enabled]:not([opened]):not([has-query]) .search-box.ytmusic-search-box {
    background: rgb(20 20 20 / 60%);
  }

  #background.ytmusic-item-thumbnail-overlay-renderer, #content.ytmusic-item-thumbnail-overlay-renderer {
    border-radius: 6px;
  }

  ytmusic-item-thumbnail-overlay-renderer:not([play-button-has-background_]):not([play-button-state=default]) #background.ytmusic-item-thumbnail-overlay-renderer, ytmusic-item-thumbnail-overlay-renderer[indexed] #background.ytmusic-item-thumbnail-overlay-renderer {
    border-radius: 0;
  }

  /* PERF: remove :has(); apply shadow directly to the thumbnail */
  ytmusic-thumbnail-renderer[thumbnail-crop="MUSIC_THUMBNAIL_CROP_UNSPECIFIED"] {
    box-shadow: 0 4px 8px rgb(0 0 0 / 0.2);
  }

  /* Sidebar Active Icon Color Override */
  ytmusic-guide-entry-renderer[active] .item.ytmusic-guide-entry-renderer yt-icon {
    fill: var(--applemusic-color) !important;
  }
  
  ytmusic-guide-entry-renderer[active] .title.ytmusic-guide-entry-renderer {
    color: var(--applemusic-color) !important;
  }

  /* Progress Bar Color Override */
  :root {
    --ts-playprogress-color: #b3b3b3;
    --ts-playprogress-knob-color: #b3b3b3;
    --ts-playprogress-secondary-color: #4c4c4c;
    --ts-playprogress-container-color: #383838;
  }

  /* Fix for player image padding */
  ytmusic-player[player-ui-state=FULLSCREEN] #song-image.ytmusic-player {
    padding-top: 0;
  }

  /* Overwriting the icon color for the img hovers */
  .thumbnail-overlay .icon {
    fill: #0080ff;
  }

  .icon.ytmusic-play-button-renderer {
    fill: #0080ff;
  }

  /* Fullscreen player should be transparent */
  ytmusic-player[player-ui-state=FULLSCREEN] {
    box-shadow: none !important;
    background: transparent !important;
  }

  /* Player page open state - make sure it uses the global variable */
  ytmusic-player[player-ui-state=PLAYER_PAGE_OPEN] {
    background: transparent !important;
    transition: none !important;
  }

  /* Apple Music Theme Accent Color */
  :root {
    --ts-accent-color: #fa233b;
    --ts-accent-color-alpha-10: rgba(250, 35, 59, 0.1);
    --ts-accent-color-alpha-20: rgba(250, 35, 59, 0.2);
    --ts-accent-color-alpha-30: rgba(250, 35, 59, 0.3);
    --ts-accent-color-alpha-50: rgba(250, 35, 59, 0.5);
  }
`;

export const modalStyles = /*css*/ `
  .modal-backdrop {
    background-color: rgba(0, 0, 0, 0.4);
    /* PERF: backdrop-filter removed */
  }

  .modal-container {
    background: var(--ts-playerbar-color);
    border: 1px solid var(--ts-base-100-alpha-01-color);
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 1px 1px rgba(255, 255, 255, 0.05) inset;
  }

  .modal-header, .modal-footer {
    background: rgba(255, 255, 255, 0.02);
  }

  .modal-section {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    transition: background 0.3s ease, border-color 0.3s ease;
  }

  .modal-input {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: white;
    transition: background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
  }

  .modal-input:focus {
    border-color: var(--ts-accent-color-alpha-50);
    box-shadow: 0 0 0 1px var(--ts-accent-color-alpha-30);
    background: rgba(0, 0, 0, 0.4);
  }

  .modal-input-dark {
    background: rgba(0, 0, 0, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.05);
  }

  .modal-dropdown {
    background: var(--ts-playerbar-color);
    /* PERF: backdrop-filter removed */
    border: 1px solid var(--ts-base-100-alpha-01-color);
    box-shadow: 10px 10px 20px rgba(0,0,0,0.5);
  }
`;
