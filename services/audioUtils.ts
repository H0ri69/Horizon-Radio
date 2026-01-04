import { Song } from '../types';
import { parseBlob } from 'music-metadata';
import { identifySongMetadata } from './geminiService';

// Smart analyzer that tries ID3 tags, then AI guessing
export const analyzeTrack = async (file: File): Promise<Partial<Song>> => {
  let title = file.name.replace(/\.[^/.]+$/, "");
  let artist = 'Unknown Artist';
  let duration = 0;
  let cover: string | undefined = undefined;

  // 1. Try reading ID3 Tags
  try {
    const metadata = await parseBlob(file);
    if (metadata.common.title) title = metadata.common.title;
    if (metadata.common.artist) artist = metadata.common.artist;
    if (metadata.format.duration) duration = metadata.format.duration;
    
    // Extract Cover Art
    const picture = metadata.common.picture?.[0];
    if (picture) {
      const blob = new Blob([picture.data], { type: picture.format });
      cover = URL.createObjectURL(blob);
    }
  } catch (e) {
    // Silently fail on metadata errors
  }

  // 2. If artist is still unknown, use AI on the filename
  if (artist === 'Unknown Artist' || !artist) {
     const aiData = await identifySongMetadata(file.name);
     if (aiData.artist && aiData.artist !== 'Unknown Artist') {
       artist = aiData.artist;
       title = aiData.title || title;
     }
  }

  return {
    title,
    artist,
    duration,
    cover
  };
};
