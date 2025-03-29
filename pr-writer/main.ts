import Anthropic from "npm:@anthropic-ai/sdk";
const anthropic = new Anthropic();

// Read PR template from .github directory

async function main() {
  const template = await readPrTemplate();
  const msg = await anthropic.messages.create({
    model: "claude-3-7-sonnet-20250219",
    max_tokens: 1000,
    temperature: 1,
    system: "Responds with concisely written pull request descriptions.",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              `Please write a pull request description based on the commit using the pull request template.

              Here is the last commit:
              ${await readLastCommit()}
              Here is the template:
              ${template}
            `,
          },
        ],
      },
    ],
  });
}

const readPrTemplate = async () => {
  try {
    // First try to read from .github/pull_request_template.md
    const prTemplatePath = ".github/pull_request_template.md";
    let prTemplate = "";

    try {
      prTemplate = await Deno.readTextFile(prTemplatePath);
      console.log(`Read PR template from ${prTemplatePath}`);
      return prTemplate;
    } catch (error) {
      // If that fails, try to read from .github/PULL_REQUEST_TEMPLATE folder
      try {
        const prTemplateDirPath = ".github/PULL_REQUEST_TEMPLATE";
        const files = [...Deno.readDirSync(prTemplateDirPath)].filter((file) =>
          file.isFile &&
          (file.name.endsWith(".md") || file.name.endsWith(".txt"))
        );

        if (files.length > 0) {
          // Use the first template file found
          prTemplate = await Deno.readTextFile(
            `${prTemplateDirPath}/${files[0].name}`,
          );
          console.log(
            `Read PR template from ${prTemplateDirPath}/${files[0].name}`,
          );
          return prTemplate;
        }
      } catch (nestedError) {
        // Both attempts failed
        console.log("Could not find PR template in .github directory");
        return "";
      }
    }
  } catch (error) {
    console.error("Error reading PR template:", error);
    return "";
  }

  return "";
};

const getLatestCommitMessage = async () => {
  try {
    const process = new Deno.Command("git", {
      args: ["log", "-1", "--pretty=%B"],
      stdout: "piped",
      stderr: "piped",
    });

    const output = await process.output();

    return outpu;
  } catch (error) {
    console.error("Error reading latest commit message:", error);
    return "";
  }
};

const getDiffSummary = async () => {
  try {
    const process = new Deno.Command("git", {
      args: ["diff", "--staged", "--stat"],
      stdout: "piped",
      stderr: "piped",
    });

    const output = await process.output();
    console.log("output");
    const diffSummary = new TextDecoder().decode(output).trim();
    process.close();

    return diffSummary;
  } catch (error) {
    console.error("Error getting diff summary:", error);
    return "";
  }
};

getDiffSummary();
