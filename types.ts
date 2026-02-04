
export interface ConversionResult {
  html: string;
  timestamp: number;
  fileName?: string;
}

export enum ProcessingState {
  IDLE = 'IDLE',
  READING = 'READING',
  PURIFYING = 'PURIFYING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}
