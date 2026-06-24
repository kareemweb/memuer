import { GoogleGenAI } from "@google/genai";

export async function askAI(prompt: string, history?: string): Promise<string> {
  // First, attempt to contact our server proxy to keep API keys hidden (if server-side environment is active)
  try {
    const rawResponse = await fetch("/api/ask-ai", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ prompt, history })
    });

    if (rawResponse.ok) {
      const data = await rawResponse.json();
      if (data && data.response) {
        return data.response;
      }
    }

    // Capture non-200 responses to fall back (e.g., 404 when hosted as static SPA site)
    console.warn(`Server proxy returned non-OK status: ${rawResponse.status}. Attempting client-side neural fallback...`);
  } catch (err) {
    console.warn("Server proxy endpoint not reachable. Attempting client-side neural fallback...", err);
  }

  // Dual-mode Fallback: Browser-direct execution
  // This ensures the AI continues to function flawlessly even if the application is compiled/deployed
  // as a static SPA or static web app without an active Node.js server container.
  try {
    const env = (import.meta as any).env || {};
    // Extract VITE_ prefixed variables first to support static bundles
    let apiKey = env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY || '';

    if (!apiKey) {
      // Direct LocalStorage Override for static hosting installations without server companion
      try {
        apiKey = localStorage.getItem('VITE_GEMINI_API_KEY') || localStorage.getItem('GEMINI_API_KEY') || '';
      } catch (_) {}
    }

    if (!apiKey) {
      // Fallback check on process.env in case of custom bundlers
      try {
        apiKey = (process as any).env?.GEMINI_API_KEY || (process as any).env?.VITE_GEMINI_API_KEY || '';
      } catch (_) {}
    }

    if (apiKey) {
      apiKey = apiKey.replace(/^["']|["']$/g, '');
    }

    if (!apiKey) {
      return `⚠️ [Neural Key Link Missing]
Memuer AI is running as a client-side static application because the backend server proxy is unreachable (404).

To resolve this and activate your private AI:
1. Set the environment variable 'VITE_GEMINI_API_KEY' in your web hosting dashboard (such as Vercel, Netlify, Cloud Run, Cloudflare Pages, etc.) and trigger a rebuild.
2. Or, for a quick secure local session, run this command in your browser's Developer Console and reload:
   localStorage.setItem('VITE_GEMINI_API_KEY', 'YOUR_GEMINI_API_KEY_HERE')`;
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });

    const systemInstruction = `You are Memuer AI, a secure and private AI companion embedded within Memuer (an E2EE end-to-end encrypted messaging application). Maintain high confidentiality. Since you are talking in a secure, encrypted chat room, respect the privacy and do not leak user keys. Be helpful, concise, and professional.`;

    const fullPrompt = history 
      ? `Chat History:\n${history}\n\nUser: ${prompt}` 
      : prompt;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: fullPrompt,
      config: {
        systemInstruction,
      }
    });

    return response.text || "No response received from GenAI subnet.";
  } catch (fallbackError: any) {
    console.error("Browser-side direct Gemini call failed:", fallbackError);
    return `Error: Could not secure responses from neural subnet proxy or client fallback. (${fallbackError?.message || fallbackError})`;
  }
}
