import { AnalysisResult } from '../types';

/**
 * Calls the server-side API proxy to analyze an image using Gemini.
 * The API key is kept on the server — never exposed to the browser.
 */
export const analyzeImage = async (base64Image: string): Promise<AnalysisResult> => {
  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageData: base64Image }),
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    return await response.json() as AnalysisResult;
  } catch (error) {
    console.error('Analysis error:', error);
    return {
      description: 'ANALYSIS FAILED. UNABLE TO PROCESS VISUAL DATA. RETRY INITIATED.',
      threatLevel: 'ERROR',
      tags: ['ERROR', 'NO_DATA'],
    };
  }
};