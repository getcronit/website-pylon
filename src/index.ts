import { auth, defineService, logger, PylonAPI } from "@cronitio/pylon";
import { CaseStudyGenerator } from "./services/case-study-generator";

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
};
