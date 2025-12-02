import { TextToSpeechClient } from "@google-cloud/text-to-speech";
import { AgentState } from "../types";
import * as fs from "fs";
import * as path from "path";

/**
 * Tool 6: Generate Audio Narration
 * Creates a professional audio narration of the rich description
 * using Google Cloud Text-to-Speech
 */
export async function generateAudioNarration(
  state: AgentState
): Promise<Partial<AgentState>> {
  console.log(
    "🔧 Tool: generate_audio_narration - Creating audio narration..."
  );

  try {
    const { description, validationResult } = state;

    if (!description) {
      console.warn("⚠️ No description available for audio narration");
      return {
        currentStep: "generate_audio_narration_skipped",
        next: "generate_embeddings",
      };
    }

    if (!validationResult?.card_data?.cert_number) {
      console.warn("⚠️ No cert number available for audio file naming");
      return {
        currentStep: "generate_audio_narration_skipped",
        next: "generate_embeddings",
      };
    }

    const certNumber = validationResult.card_data.cert_number;

    // Check for Google Cloud credentials
    const googleApiKey =
      process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY;
    const googleCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;

    if (!googleApiKey && !googleCredentials) {
      console.warn(
        "⚠️ Google Cloud credentials not configured for TTS. Skipping audio generation."
      );
      return {
        currentStep: "generate_audio_narration_skipped",
        errors: [
          ...(state.errors || []),
          "Audio narration skipped: Google Cloud credentials not configured",
        ],
        next: "generate_embeddings",
      };
    }

    // Initialize Text-to-Speech client
    let client: TextToSpeechClient;

    try {
      if (googleCredentials) {
        // Use service account credentials
        client = new TextToSpeechClient();
      } else if (googleApiKey) {
        // Try to use API key (limited TTS support)
        client = new TextToSpeechClient({
          apiKey: googleApiKey,
        });
      } else {
        throw new Error("No valid credentials for TTS");
      }
    } catch (clientError) {
      console.warn(
        "⚠️ Could not initialize TTS client:",
        clientError instanceof Error ? clientError.message : "Unknown error"
      );
      return {
        currentStep: "generate_audio_narration_failed",
        errors: [
          ...(state.errors || []),
          `TTS client initialization failed: ${
            clientError instanceof Error ? clientError.message : "Unknown error"
          }`,
        ],
        next: "generate_embeddings",
      };
    }

    // Prepare the text for speech synthesis
    // Limit the text length for TTS (max ~5000 characters is safe)
    const textToSpeak = description.substring(0, 4500);

    console.log(
      `🎙️ Generating audio for ${textToSpeak.length} characters of description...`
    );

    // Configure the TTS request
    const request = {
      input: { text: textToSpeak },
      voice: {
        languageCode: "en-US",
        name: "en-US-Neural2-D", // Professional male voice
        ssmlGender: "MALE" as const,
      },
      audioConfig: {
        audioEncoding: "MP3" as const,
        speakingRate: 0.95, // Slightly slower for clarity
        pitch: 0.0, // Normal pitch
        volumeGainDb: 0.0, // Normal volume
      },
    };

    // Generate the audio
    const [response] = await client.synthesizeSpeech(request);

    if (!response.audioContent) {
      throw new Error("No audio content received from TTS service");
    }

    // Ensure audio directory exists
    const audioDir = path.join(process.cwd(), "public", "audio");
    if (!fs.existsSync(audioDir)) {
      fs.mkdirSync(audioDir, { recursive: true });
    }

    // Save the audio file
    const audioFileName = `${certNumber}.mp3`;
    const audioFilePath = path.join(audioDir, audioFileName);

    // Convert audio content to Buffer if needed
    const audioBuffer =
      response.audioContent instanceof Buffer
        ? response.audioContent
        : Buffer.from(response.audioContent as Uint8Array);

    fs.writeFileSync(audioFilePath, audioBuffer);

    const publicAudioPath = `/audio/${audioFileName}`;

    console.log(`✅ Audio narration saved to ${publicAudioPath}`);

    return {
      audioNarrationPath: publicAudioPath,
      currentStep: "generate_audio_narration_completed",
      next: "generate_embeddings",
    };
  } catch (error) {
    console.error("❌ Error in generate_audio_narration:", error);

    // Non-fatal error - continue to next tool
    return {
      currentStep: "generate_audio_narration_failed",
      errors: [
        ...(state.errors || []),
        `Audio narration generation failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      ],
      next: "generate_embeddings",
    };
  }
}
