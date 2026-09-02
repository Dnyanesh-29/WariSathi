import { GoogleGenerativeAI } from '@google/generative-ai';

// IMPORTANT: Paste your actual API key here temporarily until we set up env vars
const API_KEY: string = 'YOUR_GEMINI_API_KEY_HERE';

const genAI = new GoogleGenerativeAI(API_KEY);

const SYSTEM_INSTRUCTION = `
You are a helpful, respectful, and friendly guide for the Warkari pilgrims (Wari). 
Your name is "WariSathi Guide".
Respond in the language the user speaks to you (Marathi or English).
Keep your answers brief, supportive, and highly relevant to the Wari pilgrimage, Dindi tracking, routes, and emergency assistance.
If the user speaks in Marathi, always reply in fluent Marathi.
`;

export const getGeminiResponse = async (prompt: string): Promise<string> => {
  if (API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
    return "मला माफ करा, पण कृपया पहिले तुमचा Gemini API Key सेट करा. (Please set your Gemini API Key first.)";
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.5-flash',
      systemInstruction: SYSTEM_INSTRUCTION,
    });
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    return `मला क्षमा करा, नेटवर्क त्रुटी आली आहे. (Error: ${error?.message || JSON.stringify(error)})`;
  }
};
