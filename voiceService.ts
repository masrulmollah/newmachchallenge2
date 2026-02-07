
import { GoogleGenAI, Modality, LiveServerMessage, Blob } from '@google/genai';

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export class VoiceAssistant {
  private ai: any;
  private session: any;
  private audioContext: AudioContext | null = null;
  private nextStartTime = 0;
  private sources = new Set<AudioBufferSourceNode>();
  private onTranscription: (text: string) => void;
  private onFinalAnswer: (text: string) => void;
  private currentTurnTranscription: string = '';

  constructor(onTranscription: (text: string) => void, onFinalAnswer: (text: string) => void) {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    this.onTranscription = onTranscription;
    this.onFinalAnswer = onFinalAnswer;
  }

  async start() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    const sessionPromise = this.ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-12-2025',
      callbacks: {
        onopen: () => {
          const source = inputAudioContext.createMediaStreamSource(stream);
          const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
          scriptProcessor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            const l = inputData.length;
            const int16 = new Int16Array(l);
            for (let i = 0; i < l; i++) {
              int16[i] = inputData[i] * 32768;
            }
            const pcmBlob: Blob = {
              data: encode(new Uint8Array(int16.buffer)),
              mimeType: 'audio/pcm;rate=16000',
            };
            sessionPromise.then((s: any) => {
              s.sendRealtimeInput({ media: pcmBlob });
            });
          };
          source.connect(scriptProcessor);
          scriptProcessor.connect(inputAudioContext.destination);
        },
        onmessage: async (message: LiveServerMessage) => {
          if (message.serverContent?.inputTranscription) {
            const text = message.serverContent.inputTranscription.text;
            this.currentTurnTranscription += text;
            this.onTranscription(this.currentTurnTranscription);
          }

          if (message.serverContent?.turnComplete) {
            if (this.currentTurnTranscription.trim()) {
              this.onFinalAnswer(this.currentTurnTranscription);
            }
            this.currentTurnTranscription = '';
          }
          
          const audioBase64 = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
          if (audioBase64 && this.audioContext) {
            this.nextStartTime = Math.max(this.nextStartTime, this.audioContext.currentTime);
            const audioBuffer = await decodeAudioData(
              decode(audioBase64),
              this.audioContext,
              24000,
              1
            );
            const source = this.audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(this.audioContext.destination);
            source.start(this.nextStartTime);
            this.nextStartTime += audioBuffer.duration;
            this.sources.add(source);
          }
        },
        onerror: (e: any) => console.error('Voice Error:', e),
        onclose: () => console.log('Voice session closed'),
      },
      config: {
        responseModalities: [Modality.AUDIO],
        inputAudioTranscription: {},
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } }
        },
        systemInstruction: 'You are a math answer extractor. Listen to the child and extract ONLY the number answer. Convert words to digits (e.g., "forty two" -> "42"). Output only the digits.',
      }
    });

    this.session = await sessionPromise;
  }

  stop() {
    if (this.session) {
      this.session.close();
    }
    this.sources.forEach(s => s.stop());
    this.sources.clear();
  }
}
