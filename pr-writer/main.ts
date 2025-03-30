import Anthropic from "npm:@anthropic-ai/sdk";
import { parseArgs } from "jsr:@std/cli/parse-args";
import { readLastCommit, readPrTemplate } from "./utils.ts";
// import { writeFile } from "node:fs/promises";

const args = parseArgs(Deno.args);
console.log("args", args);

const anthropic = new Anthropic();
const textEncoder = new TextEncoder();

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
    console.log(block.text);

    // Check if EDITOR environment variable is set
    const editor = Deno.env.get("EDITOR");

    if (editor) {
      // Create a temporary file with the PR description
      const tempFile = await Deno.makeTempFile({ suffix: ".md" });
      await Deno.writeFile(tempFile, textEncoder.encode(block.text));

      // Open the file with the user's editor
      const process = new Deno.Command(editor, {
        args: [tempFile],
        stdin: "inherit",
        stdout: "inherit",
        stderr: "inherit",
      });

      const status = await process.output();

      // Read the potentially edited content back
      // const editedContent = await Deno.readFile(tempFile);
      // await Deno.writeFile("pr-description.md", editedContent);

      // Clean up the temp file
      await Deno.remove(tempFile);
    } else {
      // Fall back to direct file writing if no editor is set
      Deno.writeFile(
        "genearted-pr-description.md",
        textEncoder.encode(block.text),
      );
    }
  } else {
    console.error("Unexpected message type:", block.type);
  }
}

main();
