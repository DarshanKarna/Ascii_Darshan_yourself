import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Parse JSON bodies up to 10MB (base64 images can be large)
app.use(express.json({ limit: '10mb' }));

// Serve static files from the Vite build output
app.use(express.static(path.join(__dirname, 'dist')));

/**
 * POST /api/analyze
 * Proxies image analysis requests to the Gemini API.
 * The API key is read from the GEMINI_API_KEY environment variable.
 */
app.post('/api/analyze', async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY environment variable is not set' });
    }

    const { imageData } = req.body;
    if (!imageData) {
      return res.status(400).json({ error: 'imageData is required' });
    }

    const ai = new GoogleGenAI({ apiKey });
    const cleanBase64 = imageData.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');

    const prompt = `
      You are a futuristic cyberpunk security AI. 
      Analyze this visual feed of a person or object. 
      Provide a brief, robotic assessment of what you see.
      Determine a 'Threat Level' (e.g., LOW, MODERATE, CRITICAL, UNKNOWN).
      Extract key identifier tags.
      
      Respond in JSON format.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/png', data: cleanBase64 } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING, description: 'A robotic, 2-sentence analysis of the subject.' },
            threatLevel: { type: Type.STRING, description: 'The calculated threat level.' },
            tags: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'List of 3-5 keywords identifying features.' }
          },
          required: ['description', 'threatLevel', 'tags']
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error('No response from AI');

    res.json(JSON.parse(text));
  } catch (error) {
    console.error('Gemini API Error:', error);
    res.status(500).json({
      description: 'ANALYSIS FAILED. UNABLE TO PROCESS VISUAL DATA. RETRY INITIATED.',
      threatLevel: 'ERROR',
      tags: ['ERROR', 'NO_DATA']
    });
  }
});

// SPA fallback — serve index.html for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✓ Ascii_Darshan server running on http://localhost:${PORT}`);
});
