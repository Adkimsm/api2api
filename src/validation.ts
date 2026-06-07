/**
 * Validates injected tools JSON format
 * Returns null if valid, error message string if invalid
 */
export function validateToolsJson(jsonString: string): string | null {
  if (!jsonString || !jsonString.trim()) {
    return null; // Empty string is valid (no injection)
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch (err) {
    return "Invalid JSON format";
  }

  if (!Array.isArray(parsed)) {
    return "Tools must be an array";
  }

  if (parsed.length === 0) {
    return null; // Empty array is valid
  }

  // Validate each tool object's basic structure
  for (let i = 0; i < parsed.length; i++) {
    const tool = parsed[i];
    
    if (!tool || typeof tool !== "object") {
      return `Tool at index ${i} must be an object`;
    }

    if (!("type" in tool) || typeof tool.type !== "string") {
      return `Tool at index ${i} must have a 'type' field (string)`;
    }

    // Validate specific tool types
    const type = tool.type;
    
    if (type === "function") {
      if (!tool.name || typeof tool.name !== "string") {
        return `Function tool at index ${i} must have a 'name' field (string)`;
      }
      if (!tool.parameters || typeof tool.parameters !== "object") {
        return `Function tool at index ${i} must have a 'parameters' field (object)`;
      }
    } else if (type === "file_search") {
      if (!Array.isArray(tool.vector_store_ids)) {
        return `file_search tool at index ${i} must have 'vector_store_ids' array`;
      }
    } else if (type === "mcp") {
      if (!tool.server_label || typeof tool.server_label !== "string") {
        return `MCP tool at index ${i} must have 'server_label' field`;
      }
      if (!tool.server_url && !tool.connector_id) {
        return `MCP tool at index ${i} must have either 'server_url' or 'connector_id'`;
      }
    }
    // Other types (web_search, code_interpreter, computer, etc.) only need 'type'
  }

  return null; // Validation passed
}
