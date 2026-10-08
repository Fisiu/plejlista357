import { DefaultResponseValidator } from "@spotify/web-api-ts-sdk";
import type { IValidateResponses, RequestImplementation } from "@spotify/web-api-ts-sdk";

import { SpotifyApiError } from "@/api/spotifyErrors";

const maxRateLimitRetries = 3;
const maxRetryDelayMs = 30_000;

function retryDelay(response: Response, attempt: number): number {
  const retryAfter = response.headers.get("Retry-After");
  const seconds = retryAfter === null ? Number.NaN : Number(retryAfter);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(seconds * 1000, maxRetryDelayMs);
  }

  const date = retryAfter === null ? Number.NaN : Date.parse(retryAfter);
  if (Number.isFinite(date)) return Math.min(Math.max(0, date - Date.now()), maxRetryDelayMs);
  return Math.min(1000 * 2 ** attempt, maxRetryDelayMs);
}

export function createSpotifyRateLimitedFetch(
  request: RequestImplementation = (input, init) => fetch(input, init),
  wait: (milliseconds: number) => Promise<void> = (milliseconds) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds)),
): RequestImplementation {
  return async (input, init) => {
    for (let attempt = 0; ; attempt += 1) {
      const response = await request(input, init);
      if (response.status !== 429 || attempt >= maxRateLimitRetries) return response;
      await wait(retryDelay(response, attempt));
    }
  };
}

export function createSpotifyResponseValidator(
  fallback: IValidateResponses = new DefaultResponseValidator(),
): IValidateResponses {
  return {
    async validateResponse(response): Promise<unknown> {
      if (response.status === 401) {
        throw new SpotifyApiError(401, "Sesja Spotify wygasła. Połącz konto ponownie.");
      }
      if (response.status === 429) {
        throw new SpotifyApiError(
          429,
          "Spotify chwilowo ogranicza liczbę żądań.",
          response.headers.get("Retry-After"),
        );
      }
      return fallback.validateResponse(response);
    },
  };
}
