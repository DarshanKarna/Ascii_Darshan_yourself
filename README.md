# Ascii_Darshan

A premium, highly interactive, retro-futuristic cyberpunk web application that converts live camera feeds or local image uploads into real-time stylized **ASCII art** with dynamic **Sobel edge detection overlays** and **AI-powered neural analysis** powered by Google Gemini.

Designed and developed by **Darshan Karna**.

---

## Key Features

*   **Real-Time Webcam Processing**: Instantly transforms your webcam stream into beautiful monospace ASCII character configurations rendered at 60 FPS.
*   **Outline Edge Detection (Sobel Gradients)**: Employs a custom real-time gradient filter that outlines fine facial elements, glasses, hair, and outlines using structural characters (`|`, `-`, `/`, `\`) aligned dynamically to local pixel vectors.
*   **AI Cybernetic Voice & Threat Assessment**: 
    *   Generates futuristic robotic assessments, cybersecurity tags, and threat classification levels from captured frames via the Google Gemini API.
    *   Speaks the assessments out loud in a low-pitched, digitized voice using the browser's native **SpeechSynthesis API**!
*   **Consolidated Settings & Input HUD**: 
    *   **Input Feed Control**: Drag and drop local images directly onto the window, or click `UPLOAD FILES` inside the panel to run real-time ASCII conversion on any photo. Switch back to live feeds with the `USE LIVE CAMERA` trigger.
    *   **Rich Controls**: Dynamically calibrate Font Size (Resolution), Gain (Brightness), Contrast, Palette Modes (CRT Green Matrix, Amber Retro, Grayscale, Full Color), and custom ASCII charset densities (Simple, Complex, Binary, Solid Blocks, and detailed 70-character grayscale ramps).
*   **Multi-Format Exports**: Save snapshots as raw `.png` images, copy the raw characters directly to your clipboard, or export fully stylized `.html` documents preserving precise layouts and glowing CSS highlights.
*   **CRT Monitor Aesthetics & Audio Synthesizer**: 
    *   Includes flickering glassmorphic scanlines, CRT screens curvature overlays, and custom sci-fi sound waves (ambient LFO dark drone hum, bleeps, major triad startup flourishes) synthesized procedurally via the **Web Audio API**.

---

## Tech Stack & Architecture

This application is built with a highly optimized, modern, no-build-step/esm module structure designed for light, instant execution:

1.  **Frontend Core**: [React](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), and [Vite](https://vite.dev/).
2.  **Modular Dependency Management**: Standard ESM import mappings (using standard HTML `<script type="importmap">` pointing directly to `esm.sh`) are used to completely skip heavy bundlers and resolve packages (`react`, `react-dom`, `@google/genai`, and `lucide-react`) directly inside the browser.
3.  **Styles**: Standard Tailwind CSS compiled via CDN, combined with bespoke CRT phosphor screen overlay styling.
4.  **Audio Engine**: Web Audio API oscillator nodes and envelope controls (no static file assets needed!).

---

## Running Locally

### Prerequisites
*   [Node.js](https://nodejs.org/) installed on your machine.
*   A Google Gemini API Key.

### Setup Instructions

1.  **Clone this Repository**:
    ```bash
    git clone https://github.com/DarshanKarna/Ascii_Darshan_yourself.git
    cd Ascii_Darshan_yourself
    ```

2.  **Install Package Dependencies**:
    ```bash
    npm install
    ```

3.  **Configure your API Key**:
    Create a `.env.local` file in the root directory (which is already pre-configured to be excluded by `.gitignore`):
    ```env
    GEMINI_API_KEY=your_actual_gemini_api_key_here
    ```

4.  **Launch the Development Server**:
    ```bash
    npm run dev
    ```
    Open **[http://localhost:3000/](http://localhost:3000/)** in your web browser to enjoy!

5.  **Build/Preview for Production**:
    ```bash
    npm run build
    npm run preview
    ```


