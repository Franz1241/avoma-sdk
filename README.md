# avoma-sdk

TypeScript SDK for the Avoma API.

This package wraps the Avoma OpenAPI spec with a small fetch-based client and convenience helpers for common Avoma workflows.

## Install

```bash
npm install avoma-sdk
```

## Quick start

```ts
import { Avoma } from "avoma-sdk";

const avoma = Avoma({
  apiKey: process.env.AVOMA_API_KEY,
});

const meetings = await avoma.getAllMeetings({
  from_date: "2026-01-01T00:00:00Z",
  to_date: "2026-01-31T23:59:59Z",
  o: "-start_at",
});
```

## Client creation

```ts
import { Avoma } from "avoma-sdk";

const avoma = Avoma({
  apiKey: "your-api-key",
  baseUrl: "https://api.avoma.com",
});
```

Accepted options:

- `apiKey`
- `baseUrl`
- `fetch`
- `headers`

## Common examples

### Get all meetings

```ts
const meetings = await avoma.getAllMeetings({
  from_date: new Date("2026-01-01T00:00:00Z"),
  to_date: new Date("2026-01-31T23:59:59Z"),
});
```

### Get a meeting by UUID

```ts
const meeting = await avoma.meetings.get("meeting-uuid");
```

### Get meeting insights

```ts
const insights = await avoma.meetings.getInsights("meeting-uuid");
```

### Get all calls in a range

```ts
const calls = await avoma.calls.getAll({
  from_date: "2026-01-01T00:00:00Z",
  to_date: "2026-01-31T23:59:59Z",
});
```

### Create a call

```ts
const call = await avoma.calls.create({
  external_id: "call-123",
  user_email: "rep@example.com",
  frm: "+11234567890",
  to: "+12234567890",
  start_at: "2026-01-10T15:00:00Z",
  recording_url: "https://example.com/recording.mp3",
  direction: "outbound",
  source: "ringcentral",
  participants: [{ email: "buyer@example.com", name: "Buyer" }],
});
```

### Get markdown notes

```ts
const notes = await avoma.notes.getMarkdown({
  from_date: "2026-01-01",
  to_date: "2026-01-31",
});
```

### Get markdown notes for a meeting

```ts
const notes = await avoma.notes.getMarkdownForMeeting("meeting-uuid");
```

### Get a recording for a meeting

```ts
const recording = await avoma.recordings.getForMeeting("meeting-uuid");
```

### Get a transcription for a meeting

```ts
const transcription = await avoma.transcriptions.getForMeeting("meeting-uuid");
```

### Get snippets for a meeting

```ts
const snippets = await avoma.snippets.getAllForMeeting("meeting-uuid");
```

### Use low-level typed requests

```ts
const meetings = await avoma.get("/v1/meetings/", {
  query: {
    from_date: "2026-01-01T00:00:00Z",
    to_date: "2026-01-31T23:59:59Z",
  },
});
```

## Entity helpers

The client exposes grouped helpers for:

- `calls`
- `customCategories`
- `meetingSegments`
- `meetingSentiments`
- `meetings`
- `notes`
- `recordings`
- `scorecardEvaluations`
- `scorecards`
- `smartCategories`
- `templates`
- `transcriptions`
- `meetingTypes`
- `meetingOutcomes`
- `users`
- `engagement`
- `snippets`
- `revenueIntel`

Most list-style resources expose both:

- `list(...)` for one page
- `getAll(...)` to follow pagination automatically

Relationship-heavy resources also expose more specific helpers like:

- `recordings.getForMeeting(...)`
- `transcriptions.getForMeeting(...)`
- `notes.getAllForMeeting(...)`
- `notes.getJsonForMeeting(...)`
- `notes.getMarkdownForMeeting(...)`
- `notes.getHtmlForMeeting(...)`
- `snippets.getAllForMeeting(...)`
- `scorecardEvaluations.getAllForMeeting(...)`
- `engagement.getAllForUser(...)`
- `engagement.getSummaryForUser(...)`

## Types

The package exports generated and convenience types, for example:

```ts
import type {
  AvomaMeeting,
  AvomaCall,
  AvomaSnippet,
  AvomaEngagementSummary,
} from "avoma-sdk";
```

## Errors

Failed API requests throw `AvomaError`.

```ts
import { Avoma, AvomaError } from "avoma-sdk";

try {
  await avoma.meetings.get("missing-uuid");
} catch (error) {
  if (error instanceof AvomaError) {
    console.error(error.status, error.url, error.body);
  }
}
```

## Build

```bash
bun run build
```

This generates:

- normalized OpenAPI inputs for codegen
- `src/generated/avoma.openapi.ts`
- publishable library output in `dist/`

## Publish to npm

```bash
bun run build
npm login
npm publish
```

Notes:

- The current package name `avoma-sdk` appears to be available on npm.
- For an unscoped package like this one, `npm publish` is public by default.
- If you later switch to a scoped package like `@your-scope/avoma-sdk`, publish with:

```bash
npm publish --access public
```

## Development

```bash
bun run generate:types
bun run typecheck
bun run check
```
