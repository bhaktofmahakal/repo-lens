import { config } from "@/lib/config";

type OpenApiDocument = Record<string, unknown>;

function buildServerUrl(origin?: string): string {
  if (origin && /^https?:\/\//i.test(origin)) return origin;
  return config.appUrl;
}

function errorResponse(description: string) {
  return {
    description,
    content: {
      "application/json": {
        schema: {
          $ref: "#/components/schemas/ErrorResponse",
        },
      },
    },
  };
}

export function buildOpenApiDocument(origin?: string): OpenApiDocument {
  const serverUrl = buildServerUrl(origin);

  return {
    openapi: "3.0.3",
    info: {
      title: "RepoLens Public API",
      version: "1.0.0",
      description:
        "Public REST API for repository ingestion, semantic Q&A, and history retrieval.",
    },
    servers: [
      {
        url: serverUrl,
      },
    ],
    tags: [
      { name: "API Keys", description: "Manage API keys for external clients." },
      { name: "Repositories", description: "Ingest, query, and manage repositories." },
    ],
    paths: {
      "/api/v1/api-keys": {
        get: {
          tags: ["API Keys"],
          summary: "List API keys",
          description: "Returns API keys for the authenticated web user session.",
          responses: {
            "200": {
              description: "API keys fetched.",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      keys: {
                        type: "array",
                        items: {
                          $ref: "#/components/schemas/ApiKeyMeta",
                        },
                      },
                    },
                    required: ["keys"],
                  },
                },
              },
            },
            "401": errorResponse("Unauthorized."),
            "503": errorResponse("Database not configured."),
          },
        },
        post: {
          tags: ["API Keys"],
          summary: "Create API key",
          description: "Creates a new API key for the authenticated web user session.",
          requestBody: {
            required: false,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    name: {
                      type: "string",
                      minLength: 1,
                      maxLength: 64,
                      example: "CLI key",
                    },
                  },
                },
              },
            },
          },
          responses: {
            "201": {
              description: "API key created.",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      key: {
                        allOf: [
                          { $ref: "#/components/schemas/ApiKeyMeta" },
                          {
                            type: "object",
                            properties: {
                              api_key: { type: "string", example: "rpl_012345..." },
                            },
                            required: ["api_key"],
                          },
                        ],
                      },
                      note: { type: "string" },
                    },
                    required: ["key", "note"],
                  },
                },
              },
            },
            "400": errorResponse("Invalid request payload."),
            "401": errorResponse("Unauthorized."),
            "503": errorResponse("Database not configured."),
          },
        },
      },
      "/api/v1/api-keys/{keyId}": {
        delete: {
          tags: ["API Keys"],
          summary: "Revoke API key",
          description: "Revokes an API key by ID for the authenticated web user session.",
          parameters: [
            {
              name: "keyId",
              in: "path",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: {
            "200": {
              description: "API key revoked.",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean", example: true },
                    },
                    required: ["success"],
                  },
                },
              },
            },
            "400": errorResponse("Invalid API key ID."),
            "401": errorResponse("Unauthorized."),
            "404": errorResponse("API key not found."),
            "503": errorResponse("Database not configured."),
          },
        },
      },
      "/api/v1/repos": {
        post: {
          tags: ["Repositories"],
          summary: "Ingest repository",
          description: "Ingests a repository from either GitHub URL or ZIP URL.",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  oneOf: [
                    {
                      type: "object",
                      properties: {
                        github_url: {
                          type: "string",
                          format: "uri",
                          example: "https://github.com/octocat/Hello-World",
                        },
                      },
                      required: ["github_url"],
                    },
                    {
                      type: "object",
                      properties: {
                        zip_url: {
                          type: "string",
                          format: "uri",
                          example: "https://example.com/repo.zip",
                        },
                      },
                      required: ["zip_url"],
                    },
                  ],
                },
              },
            },
          },
          responses: {
            "201": {
              description: "Repository ingested.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/RepoIngestResponse" },
                },
              },
            },
            "400": errorResponse("Invalid request, URL, or source content."),
            "401": errorResponse("Invalid or missing API key."),
            "402": errorResponse("Plan limit exceeded."),
            "429": errorResponse("Rate limit from upstream provider."),
            "503": errorResponse("Database not configured."),
          },
        },
      },
      "/api/v1/repos/{id}": {
        delete: {
          tags: ["Repositories"],
          summary: "Delete repository",
          description: "Deletes a repository and related indexed data.",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: {
            "200": {
              description: "Repository deleted.",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean", example: true },
                    },
                    required: ["success"],
                  },
                },
              },
            },
            "400": errorResponse("Invalid repository ID."),
            "401": errorResponse("Invalid or missing API key."),
            "404": errorResponse("Repository not found."),
            "503": errorResponse("Database not configured."),
          },
        },
      },
      "/api/v1/repos/{id}/status": {
        get: {
          tags: ["Repositories"],
          summary: "Get repository status",
          description: "Returns ingestion and latest sync status for a repository.",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: {
            "200": {
              description: "Repository status loaded.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/RepoStatusResponse" },
                },
              },
            },
            "400": errorResponse("Invalid repository ID."),
            "401": errorResponse("Invalid or missing API key."),
            "404": errorResponse("Repository not found."),
            "503": errorResponse("Database not configured."),
          },
        },
      },
      "/api/v1/repos/{id}/query": {
        post: {
          tags: ["Repositories"],
          summary: "Query repository",
          description: "Submits a natural-language question and returns answer with citations.",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    question: { type: "string", minLength: 1 },
                  },
                  required: ["question"],
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Answer generated.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/AskResponse" },
                },
              },
            },
            "400": errorResponse("Invalid request payload."),
            "401": errorResponse("Invalid or missing API key."),
            "402": errorResponse("Plan limit exceeded."),
            "404": errorResponse("Repository not found."),
            "503": errorResponse("Database not configured."),
          },
        },
      },
      "/api/v1/repos/{id}/history": {
        get: {
          tags: ["Repositories"],
          summary: "Get repository Q&A history",
          description: "Returns paginated Q&A history for a repository.",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
            {
              name: "page",
              in: "query",
              required: false,
              schema: { type: "integer", minimum: 1, default: 1 },
            },
            {
              name: "limit",
              in: "query",
              required: false,
              schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
            },
          ],
          responses: {
            "200": {
              description: "History loaded.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/HistoryResponse" },
                },
              },
            },
            "400": errorResponse("Invalid repository ID."),
            "401": errorResponse("Invalid or missing API key."),
            "404": errorResponse("Repository not found."),
            "503": errorResponse("Database not configured."),
          },
        },
      },
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "API Key",
          description: "Use the API key value as Bearer token.",
        },
      },
      schemas: {
        ErrorResponse: {
          type: "object",
          properties: {
            error: { type: "string" },
            code: { type: "string" },
            message: { type: "string" },
            plan_required: { type: "string", enum: ["pro", "team"] },
          },
          required: ["error"],
        },
        ApiKeyMeta: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string" },
            key_prefix: { type: "string" },
            created_at: { type: "string", format: "date-time" },
            last_used_at: { type: "string", format: "date-time", nullable: true },
            revoked_at: { type: "string", format: "date-time", nullable: true },
          },
          required: ["id", "name", "key_prefix", "created_at"],
        },
        Citation: {
          type: "object",
          properties: {
            filePath: { type: "string" },
            startLine: { type: "integer" },
            endLine: { type: "integer" },
            snippet: { type: "string" },
            sourceUrl: { type: "string", nullable: true },
          },
          required: ["filePath", "startLine", "endLine", "snippet"],
        },
        AskResponse: {
          type: "object",
          properties: {
            answer: { type: "string" },
            citations: {
              type: "array",
              items: { $ref: "#/components/schemas/Citation" },
            },
            retrievedSnippets: {
              type: "array",
              items: { $ref: "#/components/schemas/Citation" },
            },
            note_when_insufficient_evidence: { type: "string" },
          },
          required: ["answer", "citations", "retrievedSnippets"],
        },
        RepoIngestResponse: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            status: { type: "string", enum: ["ready"] },
            source_type: { type: "string", enum: ["zip", "github"] },
            file_count: { type: "integer" },
            chunk_count: { type: "integer" },
            repo_size_bytes: { type: "integer" },
          },
          required: ["id", "status", "source_type", "file_count", "chunk_count"],
        },
        RepoStatusResponse: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string" },
            type: { type: "string" },
            status: { type: "string", enum: ["pending", "processing", "ready", "error"] },
            chunk_count: { type: "integer" },
            created_at: { type: "string", format: "date-time" },
            last_sync: {
              nullable: true,
              type: "object",
              properties: {
                status: { type: "string", enum: ["pending", "processing", "completed", "failed"] },
                progress_pct: { type: "integer" },
                created_at: { type: "string", format: "date-time" },
                completed_at: { type: "string", format: "date-time", nullable: true },
                error_msg: { type: "string", nullable: true },
              },
            },
          },
          required: ["id", "name", "type", "status", "chunk_count", "created_at", "last_sync"],
        },
        HistoryItem: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            source_id: { type: "string", format: "uuid" },
            question: { type: "string" },
            answer: { type: "string" },
            citations_json: {
              type: "array",
              items: { $ref: "#/components/schemas/Citation" },
            },
            created_at: { type: "string", format: "date-time" },
          },
          required: ["id", "source_id", "question", "answer", "citations_json", "created_at"],
        },
        HistoryResponse: {
          type: "object",
          properties: {
            items: {
              type: "array",
              items: { $ref: "#/components/schemas/HistoryItem" },
            },
            pagination: {
              type: "object",
              properties: {
                page: { type: "integer" },
                limit: { type: "integer" },
                total: { type: "integer" },
                has_more: { type: "boolean" },
              },
              required: ["page", "limit", "total", "has_more"],
            },
          },
          required: ["items", "pagination"],
        },
      },
    },
  };
}