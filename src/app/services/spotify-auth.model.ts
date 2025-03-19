export interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

export interface SpotifyProfile {
  country: string;
  display_name: string;
  email: string;
  explicit_content: SpotifyExplicitContent;
  external_urls: SpotifyExternalUrls;
  followers: SpotifyFollowers;
  href: string;
  id: string;
  images: string[];
  product: string;
  type: string;
  uri: string;
}

export interface SpotifyExplicitContent {
  filter_enabled: boolean;
  filter_locked: boolean;
}

export interface SpotifyExternalUrls {
  spotify: string;
}

export interface SpotifyFollowers {
  href: string;
  total: number;
}
