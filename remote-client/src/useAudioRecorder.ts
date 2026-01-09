import { useRef, useState } from 'react';

// Common Audio Constants (Must match Extension!)
const SAMPLE_RATE = 16000;
const BUFFER_SIZE = 4096;

export function useAudioRecorder(onAudioData: (blob: Blob) => void) {
  const [isRecording, setIsRecording] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      
      streamRef.current = stream;
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      sourceRef.current = source;
      
      const processor = audioCtx.createScriptProcessor(BUFFER_SIZE, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        // Downsample to 16k and Convert to PCM Blob
        const pcmBlob = createPcmBlob(downsampleTo16k(inputData, audioCtx.sampleRate));
        onAudioData(pcmBlob);
      };

      source.connect(processor);
      processor.connect(audioCtx.destination);
      
      setIsRecording(true);
    } catch (e) {
      console.error("Mic Error", e);
      alert("Microphone access denied or failed.");
    }
  };

  const stopRecording = () => {
    if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current.onaudioprocess = null;
    }
    if (sourceRef.current) sourceRef.current.disconnect();
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(e => console.error("Error closing AudioContext", e));
    }

    setIsRecording(false);
  };

  return { isRecording, startRecording, stopRecording };
}

// --- UTILS (Copied from Extension) ---

function downsampleTo16k(buffer: Float32Array, inputRate: number): Float32Array {
  if (inputRate === SAMPLE_RATE) return buffer;
  const ratio = inputRate / SAMPLE_RATE;
  const newLength = Math.floor(buffer.length / ratio);
  const result = new Float32Array(newLength);
  for (let i = 0; i < newLength; i++) {
    const offset = i * ratio;
    const index = Math.floor(offset);
    const nextIndex = Math.min(index + 1, buffer.length - 1);
    const weight = offset - index;
    result[i] = buffer[index] * (1 - weight) + buffer[nextIndex] * weight;
  }
  return result;
}

function createPcmBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = Math.max(-1, Math.min(1, data[i])) * 32767;
  }
  // Convert Int16Array to binary string manually for Blob because Mobile Safari is weird with some formats
  // But actually, for WebSocket we can send ArrayBuffer directly or Blob.
  // The extension expects a Blob that it can read.
  // Let's return a Blob with the raw PCM data.
  return new Blob([int16], { type: 'audio/pcm' });
}
