// Netlify Function - Proxy to Document Intelligence API on Azure VM
const VM_API = process.env.DOC_API_URL || "http://52.233.82.247:5000";

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  // Extract the sub-path: /doc-api/documents -> /documents
  const path = event.path.replace("/.netlify/functions/doc-api", "") || "/";
  const targetUrl = `${VM_API}${path}`;

  try {
    const fetchOptions = {
      method: event.httpMethod,
      headers: {},
    };

    // Forward Content-Type and body for POST requests
    if (event.httpMethod === "POST") {
      const contentType = event.headers["content-type"] || event.headers["Content-Type"] || "";

      if (contentType.includes("multipart/form-data")) {
        // For file uploads, reconstruct the multipart form
        // Netlify base64-encodes binary bodies
        const boundary = contentType.split("boundary=")[1];
        const bodyBuffer = event.isBase64Encoded
          ? Buffer.from(event.body, "base64")
          : Buffer.from(event.body);

        fetchOptions.headers["Content-Type"] = contentType;
        fetchOptions.body = bodyBuffer;
      } else {
        fetchOptions.headers["Content-Type"] = "application/json";
        fetchOptions.body = event.body;
      }
    }

    const response = await fetch(targetUrl, fetchOptions);
    const data = await response.text();

    return {
      statusCode: response.status,
      headers,
      body: data,
    };
  } catch (error) {
    console.error("Doc API proxy error:", error);
    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({
        error: "Could not reach Document Intelligence API. The VM may be stopped.",
        detail: error.message,
      }),
    };
  }
};
