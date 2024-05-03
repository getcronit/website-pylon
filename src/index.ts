import { auth, defineService, logger, PylonAPI } from "@cronitio/pylon";
import { createBunWebSocket } from "hono/bun";

import { CaseStudyGenerator } from "./services/case-study-generator";
import { SpeechToText } from "./services/speech-to-text";

const { upgradeWebSocket, websocket } = createBunWebSocket();

export default defineService(
  {
    Query: {
      hello() {
        return "Hello, World!";
      },
    },
    Mutation: {
      generateCaseStudy: CaseStudyGenerator.generateCaseStudy,
    },
  },
  {
    context: (c) => {
      return c;
    },
  }
);

export const configureApp: PylonAPI["configureApp"] = (app) => {
  logger.info("Configuring app");

  app.use("*", auth.initialize());

  app.get(
    "/transcribe",
    auth.require({
      roles: ["admin"],
    }),
    upgradeWebSocket((c) => {
      return {
        async onMessage(event, ws) {
          const blob = new Blob([event.data], { type: "audio/wav" });
          const file = new File([blob], "speech.wav");

          try {
            const text = await SpeechToText.convert(file);

            ws.send(text);
          } catch (e) {
            logger.error(e);
          }
        },
        onClose: () => {},
      };
    })
  );
};

export const configureWebsocket: PylonAPI["configureWebsocket"] = () => {
  return websocket;
};
