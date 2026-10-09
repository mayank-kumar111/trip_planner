import { randomUUID } from "crypto";

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,100}$/;

export function getRequestId(req: Request) {
  const provided = req.headers.get("x-request-id")?.trim();
  return provided && REQUEST_ID_PATTERN.test(provided) ? provided : randomUUID();
}

export function withRequestId<T extends Response>(response: T, requestId: string) {
  response.headers.set("x-request-id", requestId);
  return response;
}
