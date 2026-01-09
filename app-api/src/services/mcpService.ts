import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { getLLMConfig } from '../config/llm.js';

let mcpClient: Client | null = null;

export async function initializeMCPClient(): Promise<void> {
  const config = getLLMConfig();

  if (!config.mcp.enabled) {
    console.log('📡 MCP server disabled in configuration');
    return;
  }

  console.log('📡 MCP server enabled but not implemented');
  console.log('');
  console.log('💡 JFrog MCP Integration Notes:');
  console.log('   - JFrog MCP server uses OIDC authentication');
  console.log('   - This requires a more complex setup than simple API keys');
  console.log('   - For Shadow AI detection demo, the @modelcontextprotocol/sdk dependency');
  console.log('     in package.json is sufficient to be detected by JFrog Xray');
  console.log('   - The chatbot works fully without MCP - it just won\'t query JFrog platform');
  console.log('');

  // Keep mcpClient as null - MCP integration is demonstrated via dependency only
  mcpClient = null;
}

export async function queryJFrogMCP(query: string): Promise<string> {
  if (!mcpClient) {
    return 'JFrog MCP server is not available. Install and configure the JFrog MCP server to enable JFrog platform queries.';
  }

  try {
    // List available tools
    const tools = await mcpClient.listTools();

    // Find appropriate tool based on query
    // For simplicity, use a generic query tool
    const queryTool = tools.tools.find(t =>
      t.name.includes('query') || t.name.includes('search') || t.name.includes('get')
    );

    if (!queryTool) {
      return 'No query tools available from JFrog MCP server. Available tools: ' +
        tools.tools.map(t => t.name).join(', ');
    }

    // Call the tool
    const result = await mcpClient.callTool({
      name: queryTool.name,
      arguments: { query },
    });

    return JSON.stringify(result.content, null, 2);
  } catch (error) {
    console.error('MCP query error:', error);
    return `Error querying JFrog: ${error instanceof Error ? error.message : String(error)}`;
  }
}

export async function closeMCPClient(): Promise<void> {
  if (mcpClient) {
    try {
      await mcpClient.close();
      mcpClient = null;
      console.log('MCP client closed');
    } catch (error) {
      console.error('Error closing MCP client:', error);
    }
  }
}
