import { NextRequest, NextResponse } from "next/server";

const SWAGGER_UI_HTML = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>RepoLens API Docs</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css" />
    <style>
      html, body {
        margin: 0;
        padding: 0;
        background: #151515;
      }
      #swagger-ui {
        max-width: 1200px;
        margin: 0 auto;
      }
      .swagger-ui .topbar { display: none; }
      .swagger-ui .info .title,
      .swagger-ui .info p,
      .swagger-ui .opblock-tag,
      .swagger-ui .opblock-summary,
      .swagger-ui .response-col_status,
      .swagger-ui .response-col_description,
      .swagger-ui label,
      .swagger-ui .model-title,
      .swagger-ui .parameter__name,
      .swagger-ui .parameter__type,
      .swagger-ui .tab li button.tablinks {
        color: #f3f3f3;
      }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.ui = SwaggerUIBundle({
        url: "/api/docs/openapi.json",
        dom_id: "#swagger-ui",
        deepLinking: true,
        persistAuthorization: true,
        displayRequestDuration: true,
      });
    </script>
  </body>
</html>`;

export async function GET(_req: NextRequest) {
  return new NextResponse(SWAGGER_UI_HTML, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}