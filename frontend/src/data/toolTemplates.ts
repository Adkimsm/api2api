export interface ToolTemplate {
  id: string;
  name: string;
  description: string;
  tool: Record<string, unknown> | Record<string, unknown>[];
}

export const toolTemplates: ToolTemplate[] = [
  {
    id: "function",
    name: "Function - 自定义函数",
    description: "定义可被 AI 调用的自定义函数",
    tool: {
      type: "function",
      name: "example_function",
      description: "函数描述",
      parameters: {
        type: "object",
        properties: {
          param1: {
            type: "string",
            description: "参数描述",
          },
        },
        required: ["param1"],
      },
    },
  },
  {
    id: "file_search",
    name: "File Search - 文件搜索",
    description: "在 vector store 中搜索文件内容",
    tool: {
      type: "file_search",
      vector_store_ids: ["vs_YOUR_VECTOR_STORE_ID"],
      max_num_results: 20,
    },
  },
  {
    id: "web_search",
    name: "Web Search - 网页搜索",
    description: "搜索互联网内容",
    tool: {
      type: "web_search",
    },
  },
  {
    id: "web_search_advanced",
    name: "Web Search Advanced - 网页搜索高级",
    description: "带域名过滤和搜索上下文配置的网页搜索",
    tool: {
      type: "web_search",
      filters: {
        allowed_domains: ["example.com"],
      },
      search_context_size: "medium",
    },
  },
  {
    id: "code_interpreter",
    name: "Code Interpreter - 代码解释器",
    description: "执行 Python 代码",
    tool: {
      type: "code_interpreter",
      container: {
        type: "auto",
        memory_limit: "4g",
      },
    },
  },
  {
    id: "computer",
    name: "Computer - 计算机控制",
    description: "控制虚拟计算机环境",
    tool: {
      type: "computer",
    },
  },
  {
    id: "computer_use_preview",
    name: "Computer Use Preview - 计算机使用预览",
    description: "计算机控制预览版本",
    tool: {
      type: "computer_use_preview",
      display_height: 768,
      display_width: 1024,
      environment: "linux",
    },
  },
  {
    id: "mcp_gmail",
    name: "MCP - Gmail 连接器",
    description: "通过 MCP 连接 Gmail",
    tool: {
      type: "mcp",
      server_label: "Gmail",
      connector_id: "connector_gmail",
      require_approval: "never",
    },
  },
  {
    id: "mcp_google_drive",
    name: "MCP - Google Drive 连接器",
    description: "通过 MCP 连接 Google Drive",
    tool: {
      type: "mcp",
      server_label: "Google Drive",
      connector_id: "connector_googledrive",
      require_approval: "never",
    },
  },
  {
    id: "mcp_custom_server",
    name: "MCP - 自定义服务器",
    description: "连接自定义 MCP 服务器",
    tool: {
      type: "mcp",
      server_label: "Custom Server",
      server_url: "https://example.com/mcp",
      require_approval: "never",
    },
  },
  {
    id: "image_generation",
    name: "Image Generation - 图像生成",
    description: "生成或编辑图像",
    tool: {
      type: "image_generation",
      action: "generate",
      model: "gpt-image-1",
      size: "1024x1024",
      quality: "auto",
    },
  },
  {
    id: "shell",
    name: "Shell - Shell 执行",
    description: "在容器中执行 Shell 命令",
    tool: {
      type: "shell",
      environment: {
        type: "container_auto",
        memory_limit: "4g",
      },
    },
  },
  {
    id: "local_shell",
    name: "Local Shell - 本地 Shell",
    description: "在本地环境执行 Shell 命令",
    tool: {
      type: "local_shell",
    },
  },
  {
    id: "custom",
    name: "Custom - 自定义工具",
    description: "定义自定义工具格式",
    tool: {
      type: "custom",
      name: "my_custom_tool",
      description: "自定义工具描述",
      format: {
        type: "text",
      },
    },
  },
  {
    id: "namespace",
    name: "Namespace - 工具命名空间",
    description: "将多个工具组织在一个命名空间下",
    tool: {
      type: "namespace",
      name: "example_namespace",
      description: "命名空间描述",
      tools: [
        {
          type: "function",
          name: "function_in_namespace",
          parameters: {
            type: "object",
            properties: {},
          },
        },
      ],
    },
  },
  {
    id: "tool_search",
    name: "Tool Search - 工具搜索",
    description: "让模型搜索可用工具",
    tool: {
      type: "tool_search",
      execution: "server",
      description: "Search for available tools",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
          },
        },
      },
    },
  },
  {
    id: "apply_patch",
    name: "Apply Patch - 应用补丁",
    description: "应用文件补丁",
    tool: {
      type: "apply_patch",
    },
  },
  {
    id: "web_search_preview",
    name: "Web Search Preview - 网页搜索预览",
    description: "网页搜索预览版",
    tool: {
      type: "web_search_preview",
    },
  },
];
