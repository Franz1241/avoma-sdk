import type { components, paths } from "./generated/avoma.openapi";

export type AvomaPaths = paths;
export type AvomaComponents = components;
export type AvomaHttpMethod = "get" | "post" | "put" | "patch" | "delete";

type SuccessStatus = 200 | 201 | 202 | 203 | 204 | 205 | 206 | 207 | 208 | 226;
type ContentValues<T> = T[keyof T];
type NonNullableObject<T> = Exclude<T, null | undefined>;

type JsonContentOf<T> = T extends { content: infer Content extends Record<PropertyKey, unknown> }
  ? "application/json" extends keyof Content
    ? Content["application/json"]
    : ContentValues<Content>
  : undefined;

export type PathWithMethod<M extends AvomaHttpMethod> = {
  [Path in keyof paths]: M extends keyof paths[Path] ? Path : never;
}[keyof paths];

export type OperationFor<
  Path extends keyof paths,
  Method extends AvomaHttpMethod,
> = Method extends keyof paths[Path] ? paths[Path][Method] : never;

type ParametersFor<Operation> = Operation extends { parameters: infer Parameters }
  ? Parameters
  : never;

export type PathParamsFor<
  Path extends keyof paths,
  Method extends AvomaHttpMethod,
> = ParametersFor<OperationFor<Path, Method>> extends { path?: infer Params }
  ? Params
  : never;

export type QueryParamsFor<
  Path extends keyof paths,
  Method extends AvomaHttpMethod,
> = ParametersFor<OperationFor<Path, Method>> extends { query?: infer Params }
  ? Params
  : never;

export type RequestBodyFor<
  Path extends keyof paths,
  Method extends AvomaHttpMethod,
> = OperationFor<Path, Method> extends { requestBody: { content: infer Content extends Record<PropertyKey, unknown> } }
  ? "application/json" extends keyof Content
    ? Content["application/json"]
    : ContentValues<Content>
  : never;

export type SuccessResponseFor<
  Path extends keyof paths,
  Method extends AvomaHttpMethod,
> = OperationFor<Path, Method> extends { responses: infer Responses extends Record<PropertyKey, unknown> }
  ? {
      [Status in Extract<keyof Responses, SuccessStatus>]: JsonContentOf<Responses[Status]>;
    }[Extract<keyof Responses, SuccessStatus>]
  : never;

export type QueryScalarInput<T> = T extends boolean
  ? boolean
  : T extends number
    ? number
    : T extends string
      ? string | Date
      : T extends null | undefined
        ? string | number | boolean | Date | null | undefined
        : string | number | boolean | Date;

export type QueryInputOf<T> = [T] extends [never]
  ? never
  : T extends Record<string, unknown>
    ? {
        [Key in keyof T]?: T[Key] extends readonly (infer Item)[]
          ? QueryScalarInput<NonNullableObject<Item>> | readonly QueryScalarInput<NonNullableObject<Item>>[]
          : QueryScalarInput<NonNullableObject<T[Key]>> | readonly QueryScalarInput<NonNullableObject<T[Key]>>[] | null;
      }
    : never;

export type QueryInputFor<
  Path extends keyof paths,
  Method extends AvomaHttpMethod,
> = QueryInputOf<QueryParamsFor<Path, Method>>;

export type PaginatedResponseLike<Item = unknown> = {
  count?: number;
  next?: string | null;
  previous?: string | null;
  results?: Item[];
};

type CollectionItems<T> = T extends readonly (infer Item)[]
  ? Item[]
  : T extends PaginatedResponseLike<infer Item>
    ? Item[]
    : never;

export type GetAllResultFor<
  Path extends PathWithMethod<"get">,
> = CollectionItems<SuccessResponseFor<Path, "get">>;

export type ItemFromResponse<T> = CollectionItems<T>[number];

export type AvomaCall = SuccessResponseFor<"/v1/calls/{external_id}/", "get">;
export type AvomaCallInput = RequestBodyFor<"/v1/calls/", "post">;
export type AvomaCallUpdate = RequestBodyFor<"/v1/calls/{external_id}/", "patch">;
export type AvomaCallsQuery = QueryInputFor<"/v1/calls/", "get">;
export type AvomaCustomCategory =
  | SuccessResponseFor<"/v1/custom_categories/{uuid}/", "get">
  | ItemFromResponse<SuccessResponseFor<"/v1/custom_categories/", "get">>;
export type AvomaMeeting = SuccessResponseFor<"/v1/meetings/{uuid}/", "get">;
export type AvomaMeetingListItem = ItemFromResponse<SuccessResponseFor<"/v1/meetings/", "get">>;
export type AvomaMeetingsQuery = QueryInputFor<"/v1/meetings/", "get">;
export type AvomaMeetingQuery = QueryInputFor<"/v1/meetings/{uuid}/", "get">;
export type AvomaMeetingInsights = SuccessResponseFor<"/v1/meetings/{meeting_uuid}/insights/", "get">;
export type AvomaMeetingSegmentMap = SuccessResponseFor<"/v1/meeting_segments/", "get">;
export type AvomaMeetingSentiment = ItemFromResponse<SuccessResponseFor<"/v1/meeting_sentiments/", "get">>;
export type AvomaNote = ItemFromResponse<SuccessResponseFor<"/v1/notes/", "get">>;
export type AvomaNotesQuery = QueryInputFor<"/v1/notes/", "get">;
export type AvomaNoteFormat = "json" | "html" | "markdown";
export type AvomaStructuredNoteData = Record<string, unknown> | Record<string, unknown>[];
export type AvomaJsonNote = Omit<AvomaNote, "data"> & { data?: AvomaStructuredNoteData };
export type AvomaTextNote = Omit<AvomaNote, "data"> & { data?: string };
export type AvomaHtmlNote = AvomaTextNote;
export type AvomaMarkdownNote = AvomaTextNote;
export type AvomaFormattedNotes<Format extends AvomaNoteFormat> = Format extends "json"
  ? AvomaJsonNote[]
  : Format extends "html"
    ? AvomaHtmlNote[]
    : AvomaMarkdownNote[];
export type AvomaNotesForMeetingQuery = Omit<AvomaNotesQuery, "meeting_uuid" | "output_format">;
export type AvomaRecording = SuccessResponseFor<"/v1/recordings/{uuid}/", "get">;
export type AvomaRecordingForMeeting = SuccessResponseFor<"/v1/recordings/", "get">;
export type AvomaScorecardEvaluation = ItemFromResponse<SuccessResponseFor<"/v1/scorecard_evaluations/", "get">>;
export type AvomaScorecardEvaluationsQuery = QueryInputFor<"/v1/scorecard_evaluations/", "get">;
export type AvomaScorecardEvaluationsForMeetingQuery = Omit<AvomaScorecardEvaluationsQuery, "meeting_uuid">;
export type AvomaScorecard = ItemFromResponse<SuccessResponseFor<"/v1/scorecards/", "get">>;
export type AvomaSmartCategory =
  | SuccessResponseFor<"/v1/smart_categories/{uuid}/", "get">
  | ItemFromResponse<SuccessResponseFor<"/v1/smart_categories/", "get">>;
export type AvomaSmartCategoryInput = RequestBodyFor<"/v1/smart_categories/", "post">;
export type AvomaSmartCategoryUpdate = RequestBodyFor<"/v1/smart_categories/{uuid}/", "patch">;
export type AvomaTemplate = SuccessResponseFor<"/v1/template/{uuid}/", "get">;
export type AvomaTemplateInput = RequestBodyFor<"/v1/template/", "post">;
export type AvomaTemplateUpdate = RequestBodyFor<"/v1/template/{uuid}/", "put">;
export type AvomaTranscription = SuccessResponseFor<"/v1/transcriptions/{uuid}/", "get">;
export type AvomaTranscriptionLookupResponse = SuccessResponseFor<"/v1/transcriptions/", "get">;
export type AvomaTranscriptionListItem = ItemFromResponse<SuccessResponseFor<"/v1/transcriptions/", "get">>;
export type AvomaTranscriptionsQuery = QueryInputFor<"/v1/transcriptions/", "get">;
export type AvomaMeetingType = SuccessResponseFor<"/v1/meeting_type/{uuid}/", "get">;
export type AvomaMeetingTypeInput = RequestBodyFor<"/v1/meeting_type/", "post">;
export type AvomaMeetingTypeUpdate = RequestBodyFor<"/v1/meeting_type/{uuid}/", "patch">;
export type AvomaMeetingOutcome = SuccessResponseFor<"/v1/meeting_outcome/{uuid}/", "get">;
export type AvomaMeetingOutcomeInput = RequestBodyFor<"/v1/meeting_outcome/", "post">;
export type AvomaMeetingOutcomeUpdate = RequestBodyFor<"/v1/meeting_outcome/{uuid}/", "patch">;
export type AvomaUser = SuccessResponseFor<"/v1/users/{uuid}/", "get">;
export type AvomaSnippet = ItemFromResponse<SuccessResponseFor<"/v1/snippets/", "get">>;
export type AvomaSnippetsQuery = QueryInputFor<"/v1/snippets/", "get">;
export type AvomaSnippetsForMeetingQuery = Omit<AvomaSnippetsQuery, "meeting_uuid">;
export type AvomaRevenueIntelTimeline = SuccessResponseFor<"/v1/revenue_intel/timeline/", "get">;
export type AvomaRevenueIntelTimelineQuery = QueryInputFor<"/v1/revenue_intel/timeline/", "get">;
export type AvomaRevenueIntelTimelineDetails = SuccessResponseFor<"/v1/revenue_intel/timeline_details/", "get">;
export type AvomaRevenueIntelTimelineDetailsQuery = QueryInputFor<"/v1/revenue_intel/timeline_details/", "get">;
export type AvomaEngagementListResponse = SuccessResponseFor<"/v1/engagement/", "get">;
export type AvomaEngagementItem = ItemFromResponse<AvomaEngagementListResponse>;
export type AvomaEngagementQuery = QueryInputFor<"/v1/engagement/", "get">;
export type AvomaEngagementSummary = SuccessResponseFor<"/v1/engagement/summary/", "get">;
export type AvomaEngagementSummaryQuery = QueryInputFor<"/v1/engagement/summary/", "get">;
export type AvomaEngagementForUserQuery = QueryInputFor<"/v1/engagement/{user_uuid}/", "get">;
export type AvomaEngagementSummaryForUserQuery = QueryInputFor<"/v1/engagement/{user_uuid}/summary/", "get">;
export type AvomaMeetingsByEmailQuery = Omit<AvomaMeetingsQuery, "attendee_emails">;

export type AvomaAiNotesWebhookEvent = RequestBodyFor<"/v1/webhooks/", "post">;
export type AvomaMeetingBookedWebhookEvent = RequestBodyFor<"/v1/webhooks/meeting_booked_via_scheduler/", "post">;
export type AvomaMeetingCanceledWebhookEvent = RequestBodyFor<"/v1/webhooks/meeting_booked_via_scheduler_canceled/", "post">;
export type AvomaMeetingRescheduledWebhookEvent = RequestBodyFor<"/v1/webhooks/meeting_booked_via_scheduler_rescheduled/", "post">;
