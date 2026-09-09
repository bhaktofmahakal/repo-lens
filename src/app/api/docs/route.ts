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
        background: #0e0e11;
        color: #ffffff;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      }
      #swagger-ui {
        max-width: 1200px;
        margin: 0 auto;
        padding: 24px 16px;
      }
      .swagger-ui .topbar { display: none; }
      .swagger-ui {
        filter: invert(88%) hue-rotate(180deg);
      }
      .swagger-ui .microlight,
      .swagger-ui img {
        filter: invert(100%) hue-rotate(180deg);
      }
      .swagger-ui .scheme-container {
        background: transparent !important;
        box-shadow: none !important;
      }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
    <script>
      window.addEventListener("DOMContentLoaded", function() {
        window.ui = SwaggerUIBundle({
          url: "/api/docs/openapi.json",
          dom_id: "#swagger-ui",
          deepLinking: true,
          presets: [
            SwaggerUIBundle.presets.apis,
            SwaggerUIStandalonePreset
          ],
          layout: "BaseLayout",
          persistAuthorization: true,
          displayRequestDuration: true,
        });
      });
    </script>
  </body>
</html>`;

export async function GET(_req: NextRequest) {
  return new NextResponse(SWAGGER_UI_HTML, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Content-Security-Policy": "default-src 'self' https://cdn.jsdelivr.net; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; img-src 'self' data: https://validator.swagger.io; connect-src 'self';",
    },
  });
}