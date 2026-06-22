# Agent Wrapper Nodes

This directory contains adapter nodes for LangChain agents that run inside the
parent chat-turn graph but must not write their full agent state back into
`ChatTurnState`.

## Boundary

- `main_agent` owns conversation memory and may update parent `messages`.
- `speech_text_agent` is a per-turn worker that converts `final_response` into
  `final_response_script`.
- `window_changing_agent` is a per-turn worker that may call UI-control tools
  from the current turn context.

The downstream worker agents are wrapped before being mounted in the parent
graph. A wrapper may call the child agent with isolated input, but it must return
only the explicit parent state keys it owns. It must not return child `messages`,
`session_id`, `turn_id`, or generic metadata.

This keeps outer graph checkpointing focused on the user/main-agent
conversation and prevents fan-out nodes from concurrently updating the same
scalar state keys.
