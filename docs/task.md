TASK

Doing a demo for some developers on how to build and create agents. I want to demonstrate a few things. 
So i want to build an AI agent service that demonstrates the following:
Using tools - getWeather, Hackernews, Knowledge Base - use an public api that we can use to look up information on something (maybe movies??)
generate using prompt (non streaming)
generate using prompt (streaming)
Agents -> uses tools (Weather Agent, Hackernews Agent, Knowledge Base Agent)
Uses Supervisor agent (subagents - determines what agent to use)
Uses Human-in-the loop example
Just a normal call to generate based on prompt
Using Memory - For now maybe have it write to a file so we can visually see what is happening. We have an agent
Using some kind of security, like requiring a key - maybe comes back requiring it
Task agent that can create tasks and have other agents to it in paralell
Coding agent based on custom code
For now let's not use a database, we will just get things working using services.

If you have any further thoughts about this or questions, let me know. 


Context
Max tokens
Compacting

// no example of workflow
An agent is one step. A workflow chains agents with logic.
Combine: guardrails, routing, parallel work, structured output, human review
// Workflow composition:
input
  → guardrail (classify)
  → supervisor (route)
  → parallel: [weather, news, movies]
  → synthesize (structured output)
  → human review (approve/reject)
  → execute



---------


Models (when to use what?)
  Cost
  Latency
  Throughput
  Modalities
  Quantized
  Stream
  Support Tools
  Prompt Training
  Thinking
  Usage
  Benchmarking
  Comparison
  
Tools
Observability
Cost
Thinking
Human in the loop
generate vs streaming SSE
Workflows
MCP Client / Server
Supervisor Agent
Why a custom agent
What is the difference between an Agent and talking to an LLM (model)
Security
Prompts
Knowledge Base
  Where does an agent get its knowlege?
    - Files
    - Database
      - Vector searching vs SQL
    - External APIs
Memory
Context
Message formats
Sandboxes
Guardrails
Structure (JSON, TOON, YAML, XML, CSV)
