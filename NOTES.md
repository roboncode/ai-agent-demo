multi-modal
evals
self-improving agents
a/b testing
[X] voice
[X] web search
[X] skillz

utility 

 6 tasks (1 done, 1 in progress, 4 open)
  ◼ Ask clarifying questions
  ◻ Propose approaches
  ◻ Present design
  ◻ Write design doc
  ◻ Transition to implementation


Will the client be informed about plan modes and what's happening, similar to what Claude Code does? Will the client be able to receive that as SSE events? Or do we need some kind of event system where the agents can dispatch out events when they're doing different things like agent-plan, agent-action, agent-thought, tool-execution-start, tool-execution-end, agent-execution-start, agent-execution-end etc.? I'm not sure what kind of names we want to have but that's what I was wondering. And I don't even know what kind of events would be useful. The reason why I was bringing that up is it would allow something like a supervisor to just register to those events through maybe some form of session for that particular call to the Agent api. That way it could convey that back to the client without having to do this comp flex returning events through event pattern. it could be flatter. Just my thoughts. 

That's not overcomplicating it — it's the right model. You're describing exactly what makes
  Claude Code effective: the agent decides when to plan, when to ask, and when to just execute.
  The key insight is that these are modes the supervisor enters based on context, not separate
  agents.

  Here's how I'd think about it:

  Three modes, one supervisor:

  1. Direct mode (default) — simple queries, just route and respond. "What's the weather?" goes
  straight to the weather agent.
  2. Plan mode — complex multi-step queries. The supervisor outlines what it will do before
  executing. Can be triggered explicitly (flag) or implicitly (LLM judges complexity). Outputs a
  plan, then executes it.
  3. Interactive mode — when the supervisor needs clarification before it can route effectively.
  "Find me a good recipe" → "What cuisine? Any dietary restrictions?" Then once answered, drops
  into direct or plan mode.

  The human-in-the-loop toggle makes sense as a configuration option on the supervisor:

  autonomous: true   → supervisor makes all decisions, never asks
  autonomous: false  → supervisor asks when ambiguous, presents plans for approval

  This maps directly to what you experience with Claude Code — sometimes I just do the work,
  sometimes I ask, sometimes I plan first. The decision tree is:

  Query arrives
    → Simple, unambiguous? → Direct mode (route immediately)
    → Complex, multi-agent? → Plan mode (outline → [approve?] → execute)
    → Ambiguous? → Interactive mode (ask → then direct or plan)

  The important thing is: this doesn't require new agents. It's the supervisor's system prompt
  and tool set that changes. The supervisor gets a askUser tool alongside routeToAgent, and the
  plan mode is just the supervisor emitting a structured plan before calling agents.

  The task agent's three-phase pattern (plan → execute → synthesize) essentially gets absorbed
  into the supervisor's plan mode. The human-in-the-loop agent's approval pattern provides the
  askUser interaction.

  This feels like the natural next evolution — merge the orchestrators into one smart supervisor
  that handles all three modes. Want me to write up a plan for this?
  
  
  // Initialize with default configuration using environment variables
  const voice = new Voice();
  
  // Or initialize with specific configuration
  const voiceWithConfig = new Voice({
    speechModel: {
      name: "tts-1-hd",
    },
    listeningModel: {
      name: "whisper-1",
    },
    speaker: "alloy", // Default voice
  });
  
  // Convert text to speech
  const audioStream = await voice.speak("Hello, how can I help you?", {
    speaker: "nova", // Override default voice
    speed: 1.2, // Adjust speech speed
  });
  
  // Convert speech to text
  const text = await voice.listen(audioStream, {
    filetype: "mp3",
  });


chlepping… (7m 1s · ↑ 19.0k tokens · thought for 4s)
  ⎿  Tip: Working with HTML/CSS? Add the frontend-design plugin:
     /plugin marketplace add anthropics/claude-code
     /plugin install frontend-design@claude-code-plugins
