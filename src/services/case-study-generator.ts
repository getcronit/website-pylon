import { ServiceError, getContext, logger, requireAuth } from "@cronitio/pylon";
import { openai } from "./openai";
import Joi from "joi";

const systemInstruction = `
You are a service that generates case studies for prospective clients. You have been given content that you need to format into a case study.
The content you have been given is in the following format:
{
  "title": "Case Study Title",
  "client": "Client Name",
  "industry": "Industry",
  "services": ["Service 1", "Service 2", "Service 3"],
  "input": "Some input content",
  "results": {
    "impressions": 1000000,
    "clicks": 50000,
    "conversions": 500
  }
}

You need to format this content into a case study that looks like this (JSON format):
{
    "title": "Case Study Title",
    "description": "Some description of the case study",
    "content": "Markdown content that describes the case study",
}

The content should be in markdown format and should include the following information:
Challenges: A description of the challenges the client was facing
Solution: A description of the solution that was provided
Results: A description of the results that were achieved
Technologies: A list of technologies that were used in the project <TagList tags={["Technology 1", "Technology 2", "Technology 3"]} />
Blockquote: <Blockquote text="Some quote from the client" author="Client Name" />


Do not include the title in the content, as it will be added automatically.
The language used in the case study should be professional and should highlight the success of the project.
The language (German, English, French) of the case study should be based on the language of the input content.
`;

export interface CaseStudyInfo {
  title: string;
  client: string;
  industry: string;
  services: string[];
  input: string;
  results: {
    [key: string]: number;
  };
}

export interface CaseStudy {
  title: string;
  description: string;
  content: string;
}

export class CaseStudyGenerator {
  private static parseCaseStudy = (content: string): CaseStudy => {
    const schema = Joi.object({
      title: Joi.string().required(),
      description: Joi.string().required(),
      content: Joi.string().required(),
    }).required();

    try {
      const caseStudy = JSON.parse(content);

      logger.info("Parsing case study", caseStudy);

      const { error, value } = schema.validate(caseStudy);

      if (error) {
        throw new ServiceError("Invalid case study format", {
          code: "INVALID_CASE_STUDY_FORMAT",
          statusCode: 400,
          details: {
            content,
          },
        });
      }

      return value;
    } catch (e) {
      throw new ServiceError("Invalid case study format", {
        code: "INVALID_CASE_STUDY_FORMAT",
        statusCode: 400,
        details: {
          content,
        },
      });
    }
  };

  @requireAuth({
    roles: ["admin"],
  })
  static generateCaseStudy(info: CaseStudyInfo): Promise<CaseStudy> {
    const ctx = getContext();
    const auth = ctx.get("auth");

    const sendOrRetry = async (count = 0) => {
      logger.info(`Generating case study for ${info.title}`, info);

      const result = await openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [
          {
            role: "system",
            content: systemInstruction,
          },
          {
            role: "user",
            content: JSON.stringify(info),
          },
        ],
        response_format: {
          type: "json_object",
        },
        user: auth.sub,
      });

      const contentString = result.choices[0].message.content;

      logger.info(contentString);

      if (!contentString) {
        throw new ServiceError("Failed to generate case study", {
          code: "GENERATE_CASE_STUDY_FAILED",
          statusCode: 500,
          details: {
            info,
          },
        });
      }

      try {
        return CaseStudyGenerator.parseCaseStudy(contentString);
      } catch (e) {
        logger.error("Failed to parse case study", e);
        if (count < 3) {
          return sendOrRetry(count + 1);
        } else {
          throw new ServiceError("Failed to generate case study", {
            code: "MAX_RETRIES_EXCEEDED",
            statusCode: 500,
            details: {
              info,
            },
          });
        }
      }
    };

    return sendOrRetry();
  }
}
