import Anthropic from "npm:@anthropic-ai/sdk";
// import { writeFile } from "node:fs/promises";

const anthropic = new Anthropic();

// Read PR template from .github directory

async function main() {
  const template = await readPrTemplate();
  const msg = await anthropic.messages.create({
    model: "claude-3-7-sonnet-20250219",
    max_tokens: 1000,
    temperature: 1,
    system:
      "Responds with concisely written pull request descriptions following the template",
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

  const block = msg.content[0];
  if (block.type === "text") {
    Deno.writeFile("pr-description.md", textEncoder.encode(block.text));
  } else {
    console.error("Unexpected message type:", block.type);
  }
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

const textDecoder = new TextDecoder();
const textEncoder = new TextEncoder();
const getLatestCommitMessage = async () => {
  try {
    const process = new Deno.Command("git", {
      args: ["log", "-1", "--pretty=%B"],
      stdout: "piped",
      stderr: "piped",
    });

    const output = await process.output();
    const result = textDecoder.decode(output.stdout).trim();

    return result;
  } catch (error) {
    console.error("Error reading latest commit message:", error);
    return "";
  }
};

const getDiffSummary = async () => {
  try {
    // Get the diff between HEAD and the previous commit to show the latest changes
    const process = new Deno.Command("git", {
      args: ["diff", "HEAD^", "HEAD", "--stat"],
      stdout: "piped",
      stderr: "piped",
    });

    const output = await process.output();
    const diffSummary = new TextDecoder().decode(output.stdout).trim();
    console.log("Latest diff summary:", diffSummary);

    return diffSummary;
  } catch (error) {
    console.error("Error getting diff summary:", error);
    return "";
  }
};

const readLastCommit = async () => {
  try {
    const message = await getLatestCommitMessage();
    const diffSummary = await getDiffSummary();
    console.log("message summary", { message, diffSummary });

    // Get the actual code changes from the last commit
    const process = new Deno.Command("git", {
      args: ["show", "--pretty=format:", "--patch"],
      stdout: "piped",
      stderr: "piped",
    });

    const output = await process.output();
    const codeChanges = new TextDecoder().decode(output.stdout).trim();

    const commit = `
Commit Message:
${message}

Changes:
${diffSummary}

Code Changes:
${codeChanges}
    `.trim();
    return commit;
  } catch (error) {
    console.error("Error reading last commit:", error);
    return "";
  }
};

main();
