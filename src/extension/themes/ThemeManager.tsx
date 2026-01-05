import React from 'react';
import {
    base_variables,
    gradients_overlays,
    backgrounds,
    rulers_borders,
    song_image,
    misc_style_improvements,
    appleMusicThemeCss
} from './css';

interface ThemeManagerProps {
    theme: string; // 'Standard', 'Apple Music', etc
}

export const ThemeManager: React.FC<ThemeManagerProps> = ({ theme }) => {
    if (theme !== 'Apple Music') {
        return null; // Don't render styles if standard
    }

    // Combine all styles
    const css = `
        ${base_variables}
        ${gradients_overlays}
        ${backgrounds}
        ${rulers_borders}
        ${song_image}
        ${misc_style_improvements}
        ${appleMusicThemeCss}
    `;

    return (
        <style id="horis-theme-manager">
            {css}
        </style>
    );
};
