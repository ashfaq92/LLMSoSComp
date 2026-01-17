// Node.js MCP Client with LangChain
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { ChatOpenAI } from '@langchain/openai'

// Get the directory of the current file
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables from .env file in the root directory
dotenv.config({ path: path.join(__dirname, '../../.env') })

async function main() {
  try {
    // Create transport for stdio communication
    const transport = new StdioClientTransport({
      command: 'python',
      args: ['math_server.py'],
    })

    // Create client
    const client = new Client({
      name: 'langchain-mcp-client',
      version: '1.0.0',
    }, {
      capabilities: {},
    })

    // Connect to server
    await client.connect(transport)
    console.log('Connected to MCP server')

    // Get tools from the server
    const toolsResponse = await client.listTools()
    console.log(`Available tools: ${toolsResponse.tools.map(t => t.name).join(', ')}`)

    // Create the OpenAI model
    const model = new ChatOpenAI({
      modelName: 'gpt-4-turbo',
      temperature: 0,
    })

    // Create a simple question
    const question = "what's (3 + 5) x 12?"
    console.log(`\nQuestion: ${question}`)
    
    // Use the model 
    const response = await model.invoke(question)
    console.log(`Response: ${response.content}`)

    // Clean up
    await client.close()
  } catch (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }
}

main()

