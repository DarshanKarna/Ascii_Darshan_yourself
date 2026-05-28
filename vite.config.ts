import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';

/**
 * Vite plugin that adds a server-side proxy for the Gemini API.
 * This ensures the API key never leaves the server during development.
 */
function geminiProxyPlugin(apiKey: string): Plugin {
  return {
    name: 'gemini-api-proxy',
    configureServer(server) {
      server.middlewares.use('/api/analyze', (req, res, next) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        const chunks: Buffer[] = [];
        req.on('data', (chunk: Buffer) => chunks.push(chunk));
        req.on('end', async () => {
          try {
            const body = JSON.parse(Buffer.concat(chunks).toString());
            const { imageData } = body;

            if (!apiKey) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'GEMINI_API_KEY not configured in .env.local' }));
              return;
            }

            const { GoogleGenAI, Type } = await import('@google/genai');
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

            res.setHeader('Content-Type', 'application/json');
            res.end(text);
          } catch (error) {
            console.error('Gemini proxy error:', error);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              description: 'ANALYSIS FAILED. UNABLE TO PROCESS VISUAL DATA. RETRY INITIATED.',
              threatLevel: 'ERROR',
              tags: ['ERROR', 'NO_DATA']
            }));
          }
        });
      });
    }
  };
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        geminiProxyPlugin(env.GEMINI_API_KEY),
      ],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
