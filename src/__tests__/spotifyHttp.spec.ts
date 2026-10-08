import { describe, expect, it, vi } from "vitest";
import type { RequestImplementation } from "@spotify/web-api-ts-sdk";

import { SpotifyApiError } from "@/api/spotifyErrors";
import { createSpotifyRateLimitedFetch, createSpotifyResponseValidator } from "@/api/spotifyHttp";

describe("Spotify HTTP resilience", () => {
  it("waits for the Retry-After duration before retrying", async () => {
    const request = vi
      .fn<RequestImplementation>()
      .mockResolvedValueOnce(new Response(null, { status: 429, headers: { "Retry-After": "2" } }))
      .mockResolvedValueOnce(new Response("{}", { status: 200 }));
    const wait = vi.fn<(milliseconds: number) => Promise<void>>(async () => undefined);
    const fetchWithRetry = createSpotifyRateLimitedFetch(request, wait);

    const response = await fetchWithRetry("https://api.spotify.com/v1/search");

    expect(response.status).toBe(200);
    expect(request).toHaveBeenCalledTimes(2);
    expect(wait).toHaveBeenCalledWith(2000);
  });

  it("bounds repeated rate-limit retries", async () => {
    const request = vi.fn<RequestImplementation>(async () => new Response(null, { status: 429 }));
    const wait = vi.fn<(milliseconds: number) => Promise<void>>(async () => undefined);
    const fetchWithRetry = createSpotifyRateLimitedFetch(request, wait);

    const response = await fetchWithRetry("https://api.spotify.com/v1/search");

    expect(response.status).toBe(429);
    expect(request).toHaveBeenCalledTimes(4);
    expect(wait).toHaveBeenCalledTimes(3);
  });

  it("turns an unauthorized response into a typed authentication error", async () => {
    const validator = createSpotifyResponseValidator();

    await expect(
      validator.validateResponse(new Response(null, { status: 401 })),
    ).rejects.toBeInstanceOf(SpotifyApiError);
  });
});
