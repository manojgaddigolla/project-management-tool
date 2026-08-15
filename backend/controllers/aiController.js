const { GoogleGenAI } = require("@google/genai");

// Initialize Gemini SDK
// Note: If GEMINI_API_KEY is not in env, this will throw when called.
let ai;
try {
  ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
} catch (e) {
  console.warn("Could not initialize GoogleGenAI. Is GEMINI_API_KEY set?");
}

const generateSummary = async (req, res) => {
  try {
    if (!ai) {
      return res.status(500).json({ msg: "AI provider is not configured. Missing GEMINI_API_KEY." });
    }

    const { analyticsText } = req.body;
    if (!analyticsText) {
      return res.status(400).json({ msg: "Analytics data is required." });
    }

    const prompt = `
You are an expert, professional, and direct Executive Project Manager. 
Analyze the following project analytics data and provide a concise, high-level executive summary.
Highlight key insights, identify any major bottlenecks (e.g. overdue tasks or overloaded team members), and provide 1-2 actionable recommendations.
Keep it strictly under 3 paragraphs and format it nicely in Markdown using bullet points where appropriate. Do not repeat the raw numbers verbatim, interpret them.

Data:
${analyticsText}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    res.json({ summary: response.text });
  } catch (err) {
    console.error("AI Summary Error:", err);
    res.status(500).json({ msg: "Failed to generate AI summary." });
  }
};

const generateTaskBreakdown = async (req, res) => {
  try {
    if (!ai) {
      return res.status(500).json({ msg: "AI provider is not configured. Missing GEMINI_API_KEY." });
    }

    const { title, description } = req.body;
    if (!title) {
      return res.status(400).json({ msg: "Card title is required for breakdown." });
    }

    const prompt = `
You are a senior technical project manager. 
Your job is to take a task and break it down into a checklist of small, actionable sub-tasks.
Only output a raw JSON array of strings representing the sub-tasks. Do not output any markdown formatting, backticks, or explanation.

Task Title: ${title}
Task Description: ${description || "No description provided."}

Output format example:
["Setup database schema", "Create API endpoint", "Write unit tests"]
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    let rawText = response.text.trim();
    // Clean up potential markdown formatting if the LLM disobeys
    if (rawText.startsWith('```json')) {
      rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    } else if (rawText.startsWith('```')) {
      rawText = rawText.replace(/```/g, '').trim();
    }

    let subtasks = [];
    try {
      subtasks = JSON.parse(rawText);
      if (!Array.isArray(subtasks)) {
        throw new Error("Output was not an array");
      }
    } catch (parseError) {
      console.error("Failed to parse LLM JSON:", rawText);
      return res.status(500).json({ msg: "AI generated malformed JSON." });
    }

    res.json({ subtasks });
  } catch (err) {
    console.error("AI Breakdown Error:", err);
    res.status(500).json({ msg: "Failed to generate task breakdown." });
  }
};

module.exports = {
  generateSummary,
  generateTaskBreakdown,
};
