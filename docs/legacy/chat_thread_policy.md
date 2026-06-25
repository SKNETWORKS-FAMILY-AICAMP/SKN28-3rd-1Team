# Chat Thread Policy

Backend chat memory is keyed by a frontend-issued conversation id.

## Ownership

- Frontend owns conversation id creation.
- Frontend stores the id in the URL query as `conversation_id`.
- Next.js chat route passes that value to backend as `session_id`.
- Backend uses `session_id` as the LangGraph `thread_id`.

`user_id` must not be used as `thread_id`. One user can have multiple chat threads. `turn_id` is only a per-request trace id and must not be used as memory fallback.

## Context Storage

Backend wraps LangGraph `InMemorySaver` with `ChatThreadContextStore`.

- The store is process-local.
- Inactive chat threads expire after 20 minutes.
- On expiration, the store calls `delete_thread(conversation_id)` on the checkpointer.
- Restarting the backend process clears all in-memory chat thread context.

This is intentionally a local Redis substitute for the current bootcamp scope. A future Redis/Postgres checkpointer should replace the store implementation without changing agent node code.

## Null Policy

Missing or blank `session_id` is ignored.

- Backend does not create a fallback `thread_id`.
- Backend logs that the chat invocation is being ignored.
- Backend does not invoke the LangGraph agent.
- Tests should assert that missing conversation id paths do not call the graph.

## Previous Context

Previous context is not manually injected into prompts. LangGraph restores the previous checkpoint state for the same `thread_id`; `AgentState.messages` is then merged with the new user message and passed to the main agent model.
