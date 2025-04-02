const textDecoder = new TextDecoder();

export const readPrTemplate = async () => {
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
        console.log(
          "Could not find PR template in .github directory. Use Deafult Template instead.",
        );
        return prTemplate;
      }
    }
  } catch (error) {
    console.error(
      "Error reading PR template. Fallback to Default Template. Error:",
      error,
    );
    return DEFAULT_PR_TEMPLATE;
  }

  return DEFAULT_PR_TEMPLATE;
};

export const readLastCommit = async () => {
  try {
    const message = await getLatestCommitMessage();
    const diffSummary = await getDiffSummary();
    // Get the actual code changes from the last commit
    const process = new Deno.Command("git", {
      args: ["show", "--pretty=format:", "--patch"],
      stdout: "piped",
      stderr: "piped",
    });

    const output = await process.output();
    const codeChanges = textDecoder.decode(output.stdout).trim();

    const commit = `
Commit Message:
${message}

Changes:
${diffSummary}

Code Changes:
${codeChanges}
    `.trim();

    console.log("Read last commit");
    return commit;
  } catch (error) {
    console.error("Error reading last commit:", error);
    return "";
  }
};

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

const DEFAULT_PR_TEMPLATE = `
  ## PR Description
  <!-- Provide a brief summary of the changes -->

  ## Changes Made
  <!-- List the main changes introduced by this PR -->

  ## Testing
  <!-- Describe how you tested these changes -->

  ## Related Issues
  <!-- Reference any related issues: "Fixes #123" or "Related to #456" -->

  ## Screenshots (if applicable)
  <!-- Add any relevant screenshots -->

  ## Additional Notes
  <!-- Any other information that might be helpful -->
  `;
