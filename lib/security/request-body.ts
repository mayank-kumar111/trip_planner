export class RequestBodyError extends Error {
  readonly status: 400 | 413;

  constructor(message: string, status: 400 | 413) {
    super(message);
    this.name = "RequestBodyError";
    this.status = status;
  }
}

export async function readJsonBody<T>(request: Request, maxBytes: number): Promise<T> {
  const contentLengthHeader = request.headers.get("content-length");
  if (contentLengthHeader) {
    const contentLength = Number(contentLengthHeader);
    if (Number.isFinite(contentLength) && contentLength > maxBytes) {
      throw new RequestBodyError("Request payload is too large", 413);
    }
  }

  let bytes: ArrayBuffer;
  try {
    bytes = await request.arrayBuffer();
  } catch {
    throw new RequestBodyError("Unable to read request payload", 400);
  }

  if (bytes.byteLength > maxBytes) {
    throw new RequestBodyError("Request payload is too large", 413);
  }

  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new RequestBodyError("Request payload is not valid UTF-8", 400);
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new RequestBodyError("Malformed JSON request body", 400);
  }
}
