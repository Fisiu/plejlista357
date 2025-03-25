export const SPOTIFY_CONSTANTS = {
  STORAGE: {
    KEY_TOKEN: 'spotify_token',
    KEY_VERIFIER: 'spotify_code_verifier',
  },
  API_ENDPOINTS: {
    TOKEN: 'https://accounts.spotify.com/api/token',
    AUTHORIZE: 'https://accounts.spotify.com/authorize',
    PROFILE: 'https://api.spotify.com/v1/me',
  },
  SCOPES: ['user-read-private', 'user-read-email', 'playlist-modify-public', 'playlist-modify-private'],
};
