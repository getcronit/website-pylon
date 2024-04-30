import { defineService, logger, PylonAPI } from "@cronitio/pylon";
import { caseStudyGenerator } from "./services/case-study-generator";

export default defineService({
  Query: {
    hello() {
      return "Hello, World!";
    },
  },
  Mutation: {
    generateCaseStudy: caseStudyGenerator.generateCaseStudy,
  },
});

export const configureApp: PylonAPI["configureApp"] = (app) => {
  logger.info("Configuring app");
};
