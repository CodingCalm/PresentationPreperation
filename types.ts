export interface VocalDataPoint {
  time: number; // in seconds or milliseconds
  pitch: number; // in Hz
  intensity: number; // e.g., 0.0 to 1.0
}

export enum PracticeMode {
  SJÄLVSAKER = "Självsäker", // Confident
  FRÅGANDE = "Frågande",     // Questioning
  ENTUSIASTISK = "Entusiastisk",// Enthusiastic
  LUGN = "Lugn",            // Calm
  BESTÄMD = "Bestämd"       // Assertive
}

export interface ScriptPromptPayload {
  tone: PracticeMode;
  customInstructions?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

export interface AudioRecorderRefActions {
  triggerStartRecording: () => void;
}

export interface WordMarkerPoint {
  time: number;
  pitch: number;
  intensity: number;
  word: string;
}
