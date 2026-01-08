import React, { useMemo } from "react";
import {
  base_variables,
  gradients_overlays,
  backgrounds,
  rulers_borders,
  song_image,
  misc_style_improvements,
  appleMusicThemeCss,
  zebra_stripes,
  nowplaying_overlay,
  frosted_glass,
  texts_selection,
  texts,
  modalStyles,
} from "./css.ts";

interface ThemeManagerProps {
  theme: string; // 'Standard', 'Apple Music', etc
}

export const ThemeManager: React.FC<ThemeManagerProps> = ({ theme }) => {
  const css = useMemo(() => {
    if (theme !== "Apple Music") {
      return "";
    }

    return `
        ${base_variables}
        ${gradients_overlays}
        ${backgrounds}
        ${rulers_borders}
        ${song_image}
        ${misc_style_improvements}
        ${zebra_stripes}
        ${nowplaying_overlay}
        ${frosted_glass}
        ${texts_selection}
        ${texts}
        ${modalStyles}
        ${appleMusicThemeCss}
    `;
  }, [theme]);

  if (!css) return null;

  return <style id="horis-theme-manager">{css}</style>;
};
