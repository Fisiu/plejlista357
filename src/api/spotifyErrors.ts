export class SpotifyApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly retryAfter: string | null = null,
  ) {
    super(message);
    this.name = "SpotifyApiError";
  }
}
