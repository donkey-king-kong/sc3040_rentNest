# Progress 2

## RentNest AI Chat Feature

### Completed
- Added AI chat summary support for owner-tenant conversations.
- Added Ask AI support inside the existing chat screen.
- Added rental-chat guardrails so the assistant only answers questions related to the rental conversation.
- Added hardcoded placeholder fallback responses when no LLM provider is configured.
- Integrated real LLM support through the backend so API keys are not exposed to the frontend.
- Added provider-based LLM configuration with Gemini and OpenRouter support.
- Added OpenRouter response decoding for gzip API responses.
- Updated frontend AI modals for chat summary and Ask AI responses.
- Removed real-LLM status labels from the UI; placeholder notices only show when fallback placeholder mode is used.
- Fixed Ask AI placeholder state so the placeholder warning does not appear before or during a real LLM response.
- Added Ask AI support for help questions such as "what questions can I ask".
- Added Enter-to-submit behavior for Ask AI questions.
- Made Ask AI summary requests use the same format as the Summarise Chat button.
- Replaced raw response category labels with user-friendly response headers.
- Added temporary frontend summary caching so repeated summary clicks reuse the generated result until new chat messages appear.
- Cleared the Ask AI input after submission and displayed the submitted question above the AI response.
- Ignored local VS Code settings from Git tracking.

### Validation
- Backend Maven compilation passed with `mvn test-compile -DskipTests`.
- OpenRouter direct API call returned a valid response during integration testing.
- AI chat summary was verified in the frontend.
- Ask AI rental-related questions were verified in the frontend.
- Ask AI out-of-scope guardrails were verified in the frontend.
- Ask AI help question flow was verified in the frontend.

### Notes
- LLM secrets are configured only in `application.properties` and are not committed.
- `application.properties.example` documents the expected LLM configuration.
- The current implementation uses temporary in-screen caching for summaries. A database-backed cache can be added later if summaries should persist across sessions.
