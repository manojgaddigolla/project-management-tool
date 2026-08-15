require("dotenv").config();
const { GoogleGenAI } = require("@google/genai");

async function run() {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: "Hello world",
    });
    console.log("Success:", response.text);
  } catch (e) {
    console.error("Error:", e);
  }
}
run();
