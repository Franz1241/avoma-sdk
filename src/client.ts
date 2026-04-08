import type {
  AvomaCallsQuery,
  AvomaEngagementForUserQuery,
  AvomaEngagementQuery,
  AvomaEngagementSummaryForUserQuery,
  AvomaEngagementSummaryQuery,
  AvomaFormattedNotes,
  AvomaHttpMethod,
  AvomaMeetingQuery,
  AvomaMeetingsQuery,
  AvomaNoteFormat,
  AvomaNotesForMeetingQuery,
  AvomaNotesQuery,
  AvomaScorecardEvaluationsForMeetingQuery,
  AvomaScorecardEvaluationsQuery,
  AvomaSnippetsForMeetingQuery,
  AvomaSnippetsQuery,
  AvomaTranscription,
  AvomaTranscriptionLookupResponse,
  AvomaTranscriptionsQuery,
  AvomaRevenueIntelTimelineDetailsQuery,
  AvomaRevenueIntelTimelineQuery,
  GetAllResultFor,
  PathParamsFor,
  PathWithMethod,
  QueryInputFor,
  RequestBodyFor,
  SuccessResponseFor,
} from "./openapi";
import type { paths } from "./generated/avoma.openapi";

type CollectionGetPath = {
  [Path in PathWithMethod<"get">]: GetAllResultFor<Path> extends never ? never : Path;
}[PathWithMethod<"get">];

type RequestOptions<
  Path extends keyof paths,
  Method extends AvomaHttpMethod,
> = {
  path?: PathParamsFor<Path, Method>;
  query?: QueryInputFor<Path, Method>;
  body?: RequestBodyFor<Path, Method>;
  headers?: HeadersInit;
  signal?: AbortSignal;
};

type QueryPrimitive = string | number | boolean | Date;
type QueryValue = QueryPrimitive | readonly QueryPrimitive[] | null | undefined;
type QueryRecord = Record<string, QueryValue>;
type PaginatedResponse = {
  count?: number;
  next?: string | null;
  previous?: string | null;
  results: unknown[];
};

type NotesQueryWithoutFormat = Omit<AvomaNotesQuery, "output_format">;

const DEFAULT_BASE_URL = "https://api.avoma.com";
const CSV_QUERY_KEYS: Partial<Record<keyof paths, readonly string[]>> = {
  "/v1/meetings/": [
    "attendee_emails",
    "crm_account_ids",
    "crm_opportunity_ids",
    "crm_contact_ids",
    "crm_lead_ids",
  ],
  "/v1/transcriptions/": [
    "attendee_emails",
    "crm_account_ids",
    "crm_opportunity_ids",
    "crm_contact_ids",
    "crm_lead_ids",
  ],
};

export type AvomaClientOptions = {
  apiKey?: string;
  baseUrl?: string;
  fetch?: typeof fetch;
  headers?: HeadersInit;
};

export class AvomaError extends Error {
  readonly status: number;
  readonly url: string;
  readonly body: unknown;

  constructor(message: string, options: { status: number; url: string; body: unknown }) {
    super(message);
    this.name = "AvomaError";
    this.status = options.status;
    this.url = options.url;
    this.body = options.body;
  }
}

function isDate(value: unknown): value is Date {
  return value instanceof Date;
}

function isPaginatedResponse(value: unknown): value is PaginatedResponse {
  return !!value && typeof value === "object" && "results" in value && Array.isArray((value as PaginatedResponse).results);
}

function serializeQueryPrimitive(value: QueryPrimitive): string {
  if (isDate(value)) {
    return value.toISOString();
  }

  return String(value);
}

function normalizeQuery(
  query: QueryRecord | undefined,
  csvKeys: readonly string[] | undefined,
): URLSearchParams | undefined {
  if (!query) {
    return undefined;
  }

  const params = new URLSearchParams();
  const csvKeySet = new Set(csvKeys ?? []);

  for (const [key, rawValue] of Object.entries(query)) {
    if (rawValue == null) {
      continue;
    }

    if (Array.isArray(rawValue)) {
      if (rawValue.length === 0) {
        continue;
      }

      if (csvKeySet.has(key)) {
        params.set(key, rawValue.map(serializeQueryPrimitive).join(","));
      } else {
        for (const item of rawValue) {
          params.append(key, serializeQueryPrimitive(item));
        }
      }

      continue;
    }

    params.set(key, serializeQueryPrimitive(rawValue as QueryPrimitive));
  }

  return params;
}

function mergeHeaders(...headerSets: Array<HeadersInit | undefined>): Headers {
  const headers = new Headers();

  for (const headerSet of headerSets) {
    if (!headerSet) {
      continue;
    }

    const next = new Headers(headerSet);
    next.forEach((value: string, key: string) => headers.set(key, value));
  }

  return headers;
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
}

async function parseResponseBody(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return undefined;
  }

  const text = await response.text();

  if (!text) {
    return undefined;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return JSON.parse(text) as unknown;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function extractFirstTranscription(response: AvomaTranscriptionLookupResponse): AvomaTranscription | null {
  if (Array.isArray(response)) {
    return (response[0] as AvomaTranscription | undefined) ?? null;
  }

  return (response.results?.[0] as AvomaTranscription | undefined) ?? null;
}

export class AvomaClient {
  readonly apiKey: string;
  readonly baseUrl: string;

  private readonly fetchImpl: typeof fetch;
  private readonly defaultHeaders: HeadersInit | undefined;

  constructor(options: AvomaClientOptions) {
    const apiKey = options.apiKey;
    if (!apiKey) {
      throw new Error("Avoma client requires `apiKey`.");
    }

    this.apiKey = apiKey;
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? DEFAULT_BASE_URL);
    this.fetchImpl = options.fetch ?? fetch;
    this.defaultHeaders = options.headers;
  }

  private buildPath(path: string, pathParams?: Record<string, unknown>): string {
    let resolved = path;

    for (const [key, value] of Object.entries(pathParams ?? {})) {
      const token = `{${key}}`;
      resolved = resolved.split(token).join(encodeURIComponent(String(value)));
    }

    if (/\{[^}]+\}/.test(resolved)) {
      throw new Error(`Missing path params for ${path}`);
    }

    return resolved;
  }

  private buildUrl<Path extends keyof paths>(
    path: Path,
    pathParams?: Record<string, unknown>,
    query?: QueryRecord,
  ): string {
    const url = new URL(this.buildPath(path, pathParams), this.baseUrl);
    const queryParams = normalizeQuery(query, CSV_QUERY_KEYS[path]);
    if (queryParams) {
      url.search = queryParams.toString();
    }

    return url.toString();
  }

  private async requestUrl<ResponseBody>(url: string, init: RequestInit = {}): Promise<ResponseBody> {
    const headers = mergeHeaders(this.defaultHeaders, init.headers, {
      Accept: "application/json",
      Authorization: `Bearer ${this.apiKey}`,
    });

    const response = await this.fetchImpl(url, {
      ...init,
      headers,
    });

    const body = await parseResponseBody(response);
    if (!response.ok) {
      const message =
        typeof body === "object" && body && "detail" in body && typeof body.detail === "string"
          ? body.detail
          : `Avoma request failed with status ${response.status}`;

      throw new AvomaError(message, {
        status: response.status,
        url,
        body,
      });
    }

    return body as ResponseBody;
  }

  async request<Method extends AvomaHttpMethod, Path extends PathWithMethod<Method>>(
    method: Method,
    path: Path,
    options?: RequestOptions<Path, Method>,
  ): Promise<SuccessResponseFor<Path, Method>> {
    const url = this.buildUrl(
      path,
      options?.path as Record<string, unknown> | undefined,
      options?.query as QueryRecord | undefined,
    );

    const hasBody = options && "body" in options && options.body !== undefined;
    const headers = hasBody ? mergeHeaders(options?.headers, { "Content-Type": "application/json" }) : options?.headers;

    return this.requestUrl<SuccessResponseFor<Path, Method>>(url, {
      method: method.toUpperCase(),
      headers,
      signal: options?.signal,
      body: hasBody ? JSON.stringify(options?.body) : undefined,
    });
  }

  get<Path extends PathWithMethod<"get">>(
    path: Path,
    options?: RequestOptions<Path, "get">,
  ): Promise<SuccessResponseFor<Path, "get">> {
    return this.request("get", path, options);
  }

  post<Path extends PathWithMethod<"post">>(
    path: Path,
    options?: RequestOptions<Path, "post">,
  ): Promise<SuccessResponseFor<Path, "post">> {
    return this.request("post", path, options);
  }

  put<Path extends PathWithMethod<"put">>(
    path: Path,
    options?: RequestOptions<Path, "put">,
  ): Promise<SuccessResponseFor<Path, "put">> {
    return this.request("put", path, options);
  }

  patch<Path extends PathWithMethod<"patch">>(
    path: Path,
    options?: RequestOptions<Path, "patch">,
  ): Promise<SuccessResponseFor<Path, "patch">> {
    return this.request("patch", path, options);
  }

  delete<Path extends PathWithMethod<"delete">>(
    path: Path,
    options?: RequestOptions<Path, "delete">,
  ): Promise<SuccessResponseFor<Path, "delete">> {
    return this.request("delete", path, options);
  }

  async getAll<Path extends CollectionGetPath>(
    path: Path,
    options?: RequestOptions<Path, "get">,
  ): Promise<GetAllResultFor<Path>> {
    const firstPage = (await this.get(path, options)) as unknown;
    if (Array.isArray(firstPage)) {
      return firstPage as GetAllResultFor<Path>;
    }

    if (!isPaginatedResponse(firstPage)) {
      throw new Error(`Path ${path} does not return a collection response.`);
    }

    const results = [...firstPage.results];
    let next = firstPage.next;

    while (next) {
      const page = await this.requestUrl<PaginatedResponse>(new URL(next, this.baseUrl).toString(), {
        method: "GET",
      });

      results.push(...page.results);
      next = page.next;
    }

    return results as GetAllResultFor<Path>;
  }

  private getAllNotesWithFormat<Format extends AvomaNoteFormat>(
    format: Format,
    query: NotesQueryWithoutFormat,
  ): Promise<AvomaFormattedNotes<Format>> {
    return this.getAll("/v1/notes/", {
      query: {
        ...query,
        output_format: format,
      },
    }) as Promise<AvomaFormattedNotes<Format>>;
  }

  private getAllNotesForMeetingWithFormat<Format extends AvomaNoteFormat>(
    format: Format,
    meetingUuid: string,
    query?: AvomaNotesForMeetingQuery,
  ): Promise<AvomaFormattedNotes<Format>> {
    return this.getAllNotesWithFormat(format, {
      ...query,
      meeting_uuid: meetingUuid,
    });
  }

  readonly calls = {
    list: (query: AvomaCallsQuery) => this.get("/v1/calls/", { query }),
    getAll: (query: AvomaCallsQuery) => this.getAll("/v1/calls/", { query }),
    create: (body: RequestBodyFor<"/v1/calls/", "post">) => this.post("/v1/calls/", { body }),
    get: (externalId: string) => this.get("/v1/calls/{external_id}/", { path: { external_id: externalId } }),
    update: (externalId: string, body: RequestBodyFor<"/v1/calls/{external_id}/", "patch">) =>
      this.patch("/v1/calls/{external_id}/", { path: { external_id: externalId }, body }),
  };

  readonly customCategories = {
    list: (query?: QueryInputFor<"/v1/custom_categories/", "get">) => this.get("/v1/custom_categories/", { query }),
    getAll: (query?: QueryInputFor<"/v1/custom_categories/", "get">) => this.getAll("/v1/custom_categories/", { query }),
    get: (uuid: string) => this.get("/v1/custom_categories/{uuid}/", { path: { uuid } }),
  };

  readonly meetingSegments = {
    getForMeeting: (uuid: string) => this.get("/v1/meeting_segments/", { query: { uuid } }),
  };

  readonly meetingSentiments = {
    getForMeeting: (meetingUuid: string) => this.get("/v1/meeting_sentiments/", { query: { meeting_uuid: meetingUuid } }),
  };

  readonly meetings = {
    list: (query: AvomaMeetingsQuery) => this.get("/v1/meetings/", { query }),
    getAll: (query: AvomaMeetingsQuery) => this.getAll("/v1/meetings/", { query }),
    get: (uuid: string, query?: AvomaMeetingQuery) =>
      this.get("/v1/meetings/{uuid}/", { path: { uuid }, query }),
    getInsights: (meetingUuid: string) =>
      this.get("/v1/meetings/{meeting_uuid}/insights/", { path: { meeting_uuid: meetingUuid } }),
    drop: (uuid: string) => this.post("/v1/meetings/{uuid}/drop/", { path: { uuid } }),
  };

  readonly notes = {
    list: (query: AvomaNotesQuery) => this.get("/v1/notes/", { query }),
    getAll: (query: AvomaNotesQuery) => this.getAll("/v1/notes/", { query }),
    getAllForMeeting: (meetingUuid: string, query?: AvomaNotesForMeetingQuery) =>
      this.getAll("/v1/notes/", { query: { ...query, meeting_uuid: meetingUuid } }),
    getJson: (query: NotesQueryWithoutFormat) => this.getAllNotesWithFormat("json", query),
    getJsonForMeeting: (meetingUuid: string, query?: AvomaNotesForMeetingQuery) =>
      this.getAllNotesForMeetingWithFormat("json", meetingUuid, query),
    getMarkdown: (query: NotesQueryWithoutFormat) => this.getAllNotesWithFormat("markdown", query),
    getMarkdownForMeeting: (meetingUuid: string, query?: AvomaNotesForMeetingQuery) =>
      this.getAllNotesForMeetingWithFormat("markdown", meetingUuid, query),
    getHtml: (query: NotesQueryWithoutFormat) => this.getAllNotesWithFormat("html", query),
    getHtmlForMeeting: (meetingUuid: string, query?: AvomaNotesForMeetingQuery) =>
      this.getAllNotesForMeetingWithFormat("html", meetingUuid, query),
  };

  readonly recordings = {
    getForMeeting: (meetingUuid: string) => this.get("/v1/recordings/", { query: { meeting_uuid: meetingUuid } }),
    get: (uuid: string) => this.get("/v1/recordings/{uuid}/", { path: { uuid } }),
  };

  readonly scorecardEvaluations = {
    list: (query?: AvomaScorecardEvaluationsQuery) =>
      this.get("/v1/scorecard_evaluations/", { query }),
    getAll: (query?: AvomaScorecardEvaluationsQuery) =>
      this.getAll("/v1/scorecard_evaluations/", { query }),
    getAllForMeeting: (meetingUuid: string, query?: AvomaScorecardEvaluationsForMeetingQuery) =>
      this.getAll("/v1/scorecard_evaluations/", { query: { ...query, meeting_uuid: meetingUuid } }),
  };

  readonly scorecards = {
    list: () => this.get("/v1/scorecards/"),
    getAll: () => this.getAll("/v1/scorecards/"),
    get: (uuid: string) => this.get("/v1/scorecards/{uuid}/", { path: { uuid } }),
  };

  readonly smartCategories = {
    list: (query?: QueryInputFor<"/v1/smart_categories/", "get">) => this.get("/v1/smart_categories/", { query }),
    getAll: (query?: QueryInputFor<"/v1/smart_categories/", "get">) => this.getAll("/v1/smart_categories/", { query }),
    create: (body: RequestBodyFor<"/v1/smart_categories/", "post">) => this.post("/v1/smart_categories/", { body }),
    get: (uuid: string) => this.get("/v1/smart_categories/{uuid}/", { path: { uuid } }),
    update: (uuid: string, body: RequestBodyFor<"/v1/smart_categories/{uuid}/", "patch">) =>
      this.patch("/v1/smart_categories/{uuid}/", { path: { uuid }, body }),
  };

  readonly templates = {
    list: () => this.get("/v1/template/"),
    getAll: () => this.getAll("/v1/template/"),
    create: (body: RequestBodyFor<"/v1/template/", "post">) => this.post("/v1/template/", { body }),
    get: (uuid: string) => this.get("/v1/template/{uuid}/", { path: { uuid } }),
    update: (uuid: string, body: RequestBodyFor<"/v1/template/{uuid}/", "put">) =>
      this.put("/v1/template/{uuid}/", { path: { uuid }, body }),
  };

  readonly transcriptions = {
    list: (query: AvomaTranscriptionsQuery) => this.get("/v1/transcriptions/", { query }),
    getAll: (query: AvomaTranscriptionsQuery) => this.getAll("/v1/transcriptions/", { query }),
    get: (uuid: string) => this.get("/v1/transcriptions/{uuid}/", { path: { uuid } }),
    getForMeeting: async (meetingUuid: string) => {
      const transcription = await this.get("/v1/transcriptions/", { query: { meeting_uuid: meetingUuid } });
      return extractFirstTranscription(transcription);
    },
  };

  readonly meetingTypes = {
    list: () => this.get("/v1/meeting_type/"),
    getAll: () => this.getAll("/v1/meeting_type/"),
    create: (body: RequestBodyFor<"/v1/meeting_type/", "post">) => this.post("/v1/meeting_type/", { body }),
    get: (uuid: string) => this.get("/v1/meeting_type/{uuid}/", { path: { uuid } }),
    update: (uuid: string, body: RequestBodyFor<"/v1/meeting_type/{uuid}/", "patch">) =>
      this.patch("/v1/meeting_type/{uuid}/", { path: { uuid }, body }),
    delete: (uuid: string) => this.delete("/v1/meeting_type/{uuid}/", { path: { uuid } }),
  };

  readonly meetingOutcomes = {
    list: () => this.get("/v1/meeting_outcome/"),
    getAll: () => this.getAll("/v1/meeting_outcome/"),
    create: (body: RequestBodyFor<"/v1/meeting_outcome/", "post">) => this.post("/v1/meeting_outcome/", { body }),
    get: (uuid: string) => this.get("/v1/meeting_outcome/{uuid}/", { path: { uuid } }),
    update: (uuid: string, body: RequestBodyFor<"/v1/meeting_outcome/{uuid}/", "patch">) =>
      this.patch("/v1/meeting_outcome/{uuid}/", { path: { uuid }, body }),
    delete: (uuid: string) => this.delete("/v1/meeting_outcome/{uuid}/", { path: { uuid } }),
  };

  readonly users = {
    list: () => this.get("/v1/users/"),
    getAll: () => this.getAll("/v1/users/"),
    get: (uuid: string) => this.get("/v1/users/{uuid}/", { path: { uuid } }),
  };

  readonly engagement = {
    list: (query: AvomaEngagementQuery) => this.get("/v1/engagement/", { query }),
    getAll: (query: AvomaEngagementQuery) => this.getAll("/v1/engagement/", { query }),
    getSummary: (query: AvomaEngagementSummaryQuery) =>
      this.get("/v1/engagement/summary/", { query }),
    listForUser: (userUuid: string, query: AvomaEngagementForUserQuery) =>
      this.get("/v1/engagement/{user_uuid}/", { path: { user_uuid: userUuid }, query }),
    getAllForUser: (userUuid: string, query: AvomaEngagementForUserQuery) =>
      this.getAll("/v1/engagement/{user_uuid}/", { path: { user_uuid: userUuid }, query }),
    getSummaryForUser: (userUuid: string, query: AvomaEngagementSummaryForUserQuery) =>
      this.get("/v1/engagement/{user_uuid}/summary/", { path: { user_uuid: userUuid }, query }),
  };

  readonly snippets = {
    list: (query?: AvomaSnippetsQuery) => this.get("/v1/snippets/", { query }),
    getAll: (query?: AvomaSnippetsQuery) => this.getAll("/v1/snippets/", { query }),
    getAllForMeeting: (meetingUuid: string, query?: AvomaSnippetsForMeetingQuery) =>
      this.getAll("/v1/snippets/", { query: { ...query, meeting_uuid: meetingUuid } }),
  };

  readonly revenueIntel = {
    getTimeline: (query: AvomaRevenueIntelTimelineQuery) =>
      this.get("/v1/revenue_intel/timeline/", { query }),
    getTimelineDetails: (query: AvomaRevenueIntelTimelineDetailsQuery) =>
      this.get("/v1/revenue_intel/timeline_details/", { query }),
  };

  getAllMeetings(query: AvomaMeetingsQuery) {
    return this.meetings.getAll(query);
  }

  getMeeting(uuid: string, query?: AvomaMeetingQuery) {
    return this.meetings.get(uuid, query);
  }

  getAllCalls(query: AvomaCallsQuery) {
    return this.calls.getAll(query);
  }

  getCallByExternalId(externalId: string) {
    return this.calls.get(externalId);
  }

  getAllNotes(query: AvomaNotesQuery) {
    return this.notes.getAll(query);
  }

  getMarkdownNotes(query: NotesQueryWithoutFormat) {
    return this.notes.getMarkdown(query);
  }

  getAllTranscriptions(query: AvomaTranscriptionsQuery) {
    return this.transcriptions.getAll(query);
  }

  getTranscriptionForMeeting(meetingUuid: string) {
    return this.transcriptions.getForMeeting(meetingUuid);
  }

  getRecordingForMeeting(meetingUuid: string) {
    return this.recordings.getForMeeting(meetingUuid);
  }

  getRecording(uuid: string) {
    return this.recordings.get(uuid);
  }
}

export function Avoma(options: AvomaClientOptions) {
  return new AvomaClient(options);
}
