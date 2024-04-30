import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) throw new Error("OpenAI API Key not found");

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
