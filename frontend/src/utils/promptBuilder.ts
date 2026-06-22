/**
 * Frontend Prompt Builder - generates tool usage instructions for preview
 * Must match backend src/promptBuilder.ts exactly
 */

function mapType(type: string): string {
  const map: Record<string, string> = {
    string: "str",
    number: "num",
    integer: "int",
    boolean: "bool",
    array: "array",
    object: "object",
  };
  return map[type] || type;
}

function getToolDescription(tool: Record<string, unknown>): string {
  if (tool.description && typeof tool.description === "string") return tool.description;

  const descriptions: Record<string, string> = {
    web_search:
      "Search the internet for current information. Use this when you need up-to-date data or facts not in your training data.",
    web_search_preview:
      "Search the internet for current information (preview). Use this when you need up-to-date data or facts not in your training data.",
    file_search:
      "Search the contents of uploaded files for relevant context and information.",
    code_interpreter:
      "Execute Python code in a sandboxed environment. Use this for calculations, data processing, file manipulation, or any computational tasks.",
    computer:
      "Control a virtual computer interface. Use mouse and keyboard actions to interact with applications on the screen.",
    computer_use_preview:
      "Control a computer interface using the preview version of the computer use tool.",
    image_generation:
      "Generate or edit images using AI. You can specify the prompt, size, quality, and other parameters.",
    shell:
      "Execute shell commands in a hosted container environment. Use this to run command-line operations, install packages, or manage files.",
    local_shell:
      "Execute shell commands in the local environment. Use this to run command-line operations on the user's machine.",
    apply_patch:
      "Apply a patch to modify files. Use this for code changes and file modifications.",
    tool_search:
      "Search for available tools that can help with the current task. Use this to discover tools dynamically.",
    custom: "A custom tool.",
  };

  const type = tool.type as string;
  if (type === "mcp") {
    const label = tool.server_label || "MCP server";
    return `Access external services via Model Context Protocol (MCP) using the ${label}. This connects to an MCP server that provides additional capabilities.`;
  }
  if (type === "namespace") {
    const name = tool.name || "namespace";
    return `Access tools grouped under the "${name}" namespace.`;
  }

  return descriptions[type] || `The ${type} tool.`;
}

type ParamEntry = { name: string; type: string; description: string };

function getFunctionParams(tool: Record<string, unknown>): ParamEntry[] {
  const params = tool.parameters as Record<string, unknown> | undefined;
  if (!params || typeof params !== "object") return [];
  const props = params.properties as Record<string, Record<string, unknown>> | undefined;
  if (!props || typeof props !== "object") return [];
  const required = (params.required as string[]) || [];

  return Object.entries(props).map(([name, prop]) => ({
    name,
    type: mapType((prop.type as string) || "string"),
    description:
      (prop.description as string) ||
      `The ${name} parameter.${required.includes(name) ? " Required." : ""}`,
  }));
}

function getToolParameters(tool: Record<string, unknown>): ParamEntry[] {
  const type = tool.type as string;

  if (type === "function") {
    return getFunctionParams(tool);
  }

  const predefined: Record<string, ParamEntry[]> = {
    web_search: [
      { name: "query", type: "str", description: "The search query to find relevant information on the internet." },
      { name: "search_context_size", type: "str", description: "The amount of context to retrieve. One of: low, medium, high." },
    ],
    web_search_preview: [
      { name: "query", type: "str", description: "The search query to find relevant information on the internet." },
      { name: "search_context_size", type: "str", description: "The amount of context to retrieve. One of: low, medium, high." },
    ],
    file_search: [
      { name: "query", type: "str", description: "The search query to find relevant content within the uploaded files." },
      { name: "max_num_results", type: "int", description: "The maximum number of search results to return." },
    ],
    code_interpreter: [
      { name: "code", type: "str", description: "The Python code to execute in the sandboxed environment." },
    ],
    computer: [
      { name: "action", type: "str", description: "The action to perform. One of: click, double_click, drag, key_press, move, screenshot, scroll, type." },
      { name: "coordinate", type: "str", description: 'The x,y coordinates for the action (e.g. "100,200").' },
      { name: "text", type: "str", description: 'The text to type or the key to press (e.g. "Hello" or "Enter").' },
    ],
    computer_use_preview: [
      { name: "action", type: "str", description: "The action to perform. One of: click, double_click, drag, key_press, move, screenshot, scroll, type." },
      { name: "coordinate", type: "str", description: 'The x,y coordinates for the action (e.g. "100,200").' },
      { name: "text", type: "str", description: "The text to type or the key to press." },
    ],
    mcp: [
      { name: "server_label", type: "str", description: "The label identifying the MCP server to use." },
      { name: "method", type: "str", description: "The method to call on the MCP server." },
    ],
    image_generation: [
      { name: "prompt", type: "str", description: "The text description of the image to generate or edit." },
      { name: "size", type: "str", description: "The size of the generated image. One of: 1024x1024, 1024x1536, 1536x1024, auto." },
      { name: "quality", type: "str", description: "The quality of the image. One of: low, medium, high, auto." },
    ],
    shell: [
      { name: "command", type: "str", description: "The shell command to execute in the container environment." },
    ],
    local_shell: [
      { name: "command", type: "str", description: "The shell command to execute in the local environment." },
    ],
    apply_patch: [
      { name: "patch", type: "str", description: "The patch content to apply to the target files." },
    ],
    tool_search: [
      { name: "query", type: "str", description: "The search query to find relevant tools." },
    ],
  };

  if (predefined[type]) return predefined[type];

  if (type === "custom" && tool.parameters) {
    return getFunctionParams(tool);
  }

  return [];
}

function formatTool(tool: Record<string, unknown>): string {
  const lines: string[] = [];
  const name = (tool.name as string) || (tool.type as string);

  lines.push(name);
  lines.push("");
  lines.push("");
  lines.push(getToolDescription(tool));
  lines.push("");
  lines.push("");

  const params = getToolParameters(tool);
  for (let i = 0; i < params.length; i++) {
    if (i > 0) lines.push("");
    lines.push(params[i].name);
    lines.push(params[i].type);
    lines.push(params[i].description);
  }

  return lines.join("\n");
}

export function generatePromptFromTools(tools: Record<string, unknown>[]): string {
  if (!tools || tools.length === 0) return "";

  const parts: string[] = [];

  parts.push(
    "In this environment you have access to a set of tools you can use to answer the user's question."
  );
  parts.push("");
  parts.push("You may call them like this:");
  parts.push("");
  parts.push("");
  parts.push("$TOOL_NAME");
  parts.push("");
  parts.push("");
  parts.push("<$PARAMETER_NAME>$PARAMETER_VALUE");
  parts.push("...");
  parts.push("");
  parts.push("");
  parts.push("Here are the tools available:");

  for (const tool of tools) {
    parts.push("");
    parts.push("");
    parts.push(formatTool(tool));
  }

  return parts.join("\n");
}
