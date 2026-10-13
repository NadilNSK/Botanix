import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(request: Request) {
  try {
    // 1. Verify Environment Variables
    const plantNetApiKey = process.env.PLANTNET_API_KEY || process.env.PLANT_ID_API_KEY;
    if (!plantNetApiKey) {
      return NextResponse.json({ error: 'PLANTNET_API_KEY is missing in .env.local.' }, { status: 500 });
    }
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is missing in .env.local.' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const formData = await request.formData();
    const file = formData.get('image') as File;
    
    if (!file) return NextResponse.json({ error: 'No image file was provided.' }, { status: 400 });

    // 2. Format Image for Pl@ntNet (Ensures mimetype is retained)
    const buffer = await file.arrayBuffer();
    const imageBlob = new Blob([buffer], { type: file.type || 'image/jpeg' });
    const plantNetFormData = new FormData();
    
    plantNetFormData.append('images', imageBlob, file.name || 'upload.jpg');
    plantNetFormData.append('organs', 'auto'); 

    // 3. Call Pl@ntNet API
    const plantNetUrl = `https://my-api.plantnet.org/v2/identify/all?api-key=${plantNetApiKey}`;
    const plantNetResponse = await fetch(plantNetUrl, { method: 'POST', body: plantNetFormData });
    
    if (!plantNetResponse.ok) {
      const errorText = await plantNetResponse.text();
      return NextResponse.json({ error: `Pl@ntNet API Error (${plantNetResponse.status}): ${errorText}` }, { status: 500 });
    }

    const plantData = await plantNetResponse.json();
    const bestMatch = plantData.results?.[0];
    
    if (!bestMatch) return NextResponse.json({ error: 'Plant could not be identified.' }, { status: 404 });

    const scientificName = bestMatch.species.scientificNameWithoutAuthor || bestMatch.species.scientificName;
    const probability = (bestMatch.score * 100).toFixed(1);

    // 4. Call Gemini API
    const prompt = `You are a botanist. Provide a JSON profile for the plant "${scientificName}". 
    Include exactly these keys: commonName, description, wateringSchedule, sunlightRequirements, toxicityWarning. 
    Output raw JSON only, no markdown formatting.`;

    // Cascade candidate models to avoid 404 on retired versions and 503 on high load
    const candidateModels = ['gemini-2.5-flash', 'gemini-3.1-flash-lite', 'gemini-3.8-flash'];
    type GeminiResponseType = Awaited<ReturnType<typeof ai.models.generateContent>>;
    let geminiResponse: GeminiResponseType | null = null;
    let lastGeminiError: unknown = null;

    for (const model of candidateModels) {
      try {
        geminiResponse = await ai.models.generateContent({
          model,
          contents: prompt,
          config: { responseMimeType: "application/json" }
        });
        if (geminiResponse) break;
      } catch (err: unknown) {
        lastGeminiError = err;
        const errMessage = err instanceof Error ? err.message : String(err);
        console.warn(`Gemini model ${model} unavailable: ${errMessage}`);
      }
    }

    if (!geminiResponse) {
      const msg = lastGeminiError instanceof Error ? lastGeminiError.message : String(lastGeminiError);
      throw new Error(`Gemini API Error: ${msg}`);
    }

    let careGuide: Record<string, unknown> = {};
    const rawText = geminiResponse.text || '{}';
    try {
      careGuide = JSON.parse(rawText.replace(/```json/g, '').replace(/```/g, '').trim());
    } catch {
       return NextResponse.json({ error: `Gemini JSON failed to parse: ${rawText}` }, { status: 500 });
    }

    return NextResponse.json({ scientificName, matchProbability: probability, ...careGuide });

  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("API Route Crash:", error);
    return NextResponse.json({ error: `Server Exception: ${errorMsg}` }, { status: 500 });
  }
}
