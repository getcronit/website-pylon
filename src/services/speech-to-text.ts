import { requireAuth } from "@cronitio/pylon";
import { openai } from "./openai";

export class SpeechToText {
  static async convert(file: File, language: string = "de") {
    console.log("file", file);
    const response = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
      language,
    });

    return response.text;
  }
}
