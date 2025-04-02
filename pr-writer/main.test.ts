// ai-toolkit/pr-writer/main.test.ts
import { assertEquals, assertStringIncludes } from "jsr:@std/assert";
import { assertSnapshot } from "@std/testing/snapshot";
import {
  assertSpyCall,
  assertSpyCalls,
  returnsNext,
  spy,
  stub,
} from "jsr:@std/testing/mock";
import { _mockAnthropic, main } from "./main.ts";
import * as utils from "./utils.ts";

Deno.test({
  name: "should read PR template",
}, async () => {
  const {
    restore,
    readFileStub,
  } = setupMocks();
  try {
    await main();
  } finally {
    restore();
  }

  // Verify readFileStub was called
  assertSpyCalls(readFileStub, 1);
  const call = readFileStub.calls[0];
  assertEquals(call.args[0], ".github/pull_request_template.md");
});

Deno.test({
  name:
    "Command should call git 3 times to get the diff and open edit on the tempFile",
}, async (t) => {
  const {
    restore,
    gitCommandStub,
  } = setupMocks();
  try {
    await main();
  } finally {
    restore();
  }

  await assertSnapshot(t, gitCommandStub.calls);
});

Deno.test({
  name: "Should call anthropic api with diff and message",
}, async (t) => {
  const {
    restore,
    mockAnthropicClient,
  } = setupMocks();
  try {
    await main();
  } finally {
    restore();
  }

  await assertSnapshot(t, mockAnthropicClient.messages.create.calls);
});

// Mock response for Anthropic API
const mockPrDescription = `## PR Description
Implemented awesome feature

## Changes Made
- Added new component
- Updated documentation

## Testing
Manual testing completed`;

const _internal = {
  readPrTemplate: utils.readPrTemplate,
  readLastCommit: utils.readLastCommit,
};

// Common test setup
const setupMocks = () => {
  const mockTemplate = "## Mock PR Template";
  const mockCommit = "feat: add new feature";
  const stubs: { restore: () => void }[] = [];

  const readFileStub = stub(
    Deno,
    "readTextFile",
    returnsNext([Promise.resolve(mockTemplate)]),
  );
  stubs.push(readFileStub);

  const gitCommandStub = stub(
    Deno,
    "Command",
    () => {
      return {
        output: () =>
          Promise.resolve({
            stdout: new TextEncoder().encode(mockCommit),
            stderr: new Uint8Array(0),
          }),
      };
    },
  );
  stubs.push(gitCommandStub);

  const writeFileStub = stub(
    Deno,
    "writeFile",
    () => Promise.resolve(),
  );
  stubs.push(writeFileStub);

  const makeTempFileStub = stub(
    Deno,
    "makeTempFile",
    () => Promise.resolve("tempfile"),
  );
  stubs.push(makeTempFileStub);

  const removeStub = stub(
    Deno,
    "remove",
    () => Promise.resolve(),
  );
  stubs.push(removeStub);

  const mockMessages = {
    create: spy(() =>
      Promise.resolve({
        content: [
          {
            type: "text",
            text: mockPrDescription,
          },
        ],
      })
    ),
  };

  const mockAnthropicClient = {
    messages: mockMessages,
  };

  const originalAnthropicClient = _mockAnthropic(mockAnthropicClient);

  return {
    mockTemplate,
    mockCommit,
    mockMessages,
    writeFileStub,
    originalAnthropicClient,
    readFileStub,
    mockAnthropicClient,
    gitCommandStub,
    restore() {
      stubs.forEach((stub) => stub.restore());
    },
  };
};
