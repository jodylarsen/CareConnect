import { GOOGLE_CONFIG, GOOGLE_OAUTH_URLS } from '../config/google';

export interface User {
  id: string;
  email: string;
  name: string;
  picture: string;
  verified_email: boolean;
  given_name?: string;
  family_name?: string;
  gender?: string;
  age_range?: {
    min: number;
    max?: number;
  };
  birthdate?: string;
  locale?: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  token_type: string;
  expires_in: number;
}

class AuthService {
  private static instance: AuthService;
  private user: User | null = null;
  private tokens: AuthTokens | null = null;

  private constructor() {
    // Check for existing session on initialization
    this.loadStoredAuth();
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Initiate Google OAuth 2.0 login flow
   */
  public login(): void {
    const params = new URLSearchParams({
      client_id: GOOGLE_CONFIG.CLIENT_ID,
      redirect_uri: GOOGLE_CONFIG.REDIRECT_URI,
      response_type: GOOGLE_CONFIG.RESPONSE_TYPE,
      scope: GOOGLE_CONFIG.SCOPES.join(' '),
      access_type: GOOGLE_CONFIG.ACCESS_TYPE,
      prompt: GOOGLE_CONFIG.PROMPT,
      state: this.generateState()
    });

    // Store state for validation
    sessionStorage.setItem('oauth_state', params.get('state') || '');
    
    // Redirect to Google OAuth
    window.location.href = `${GOOGLE_OAUTH_URLS.AUTHORIZATION}?${params.toString()}`;
  }

  /**
   * Handle OAuth callback with authorization code
   */
  public async handleCallback(code: string, state: string): Promise<User> {
    // Validate state parameter
    const storedState = sessionStorage.getItem('oauth_state');
    if (state !== storedState) {
      throw new Error('Invalid state parameter');
    }

    try {
      // Exchange authorization code for tokens
      const tokens = await this.exchangeCodeForTokens(code);
      this.tokens = tokens;

      // Get user information
      const user = await this.getUserInfo(tokens.access_token);
      this.user = user;

      // Store in session storage
      this.storeAuth(user, tokens);

      // Clean up
      sessionStorage.removeItem('oauth_state');

      return user;
    } catch (error) {
      console.error('OAuth callback error:', error);
      throw new Error('Authentication failed');
    }
  }

  /**
   * Exchange authorization code for access tokens
   */
  private async exchangeCodeForTokens(code: string): Promise<AuthTokens> {
    const response = await fetch(GOOGLE_OAUTH_URLS.TOKEN, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: GOOGLE_CONFIG.CLIENT_ID,
        client_secret: process.env.REACT_APP_GOOGLE_CLIENT_SECRET || '',
        code,
        grant_type: 'authorization_code',
        redirect_uri: GOOGLE_CONFIG.REDIRECT_URI,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to exchange code for tokens');
    }

    return response.json();
  }

  /**
   * Get user information from Google API
   */
  private async getUserInfo(accessToken: string): Promise<User> {
    // Get basic user info
    const basicResponse = await fetch(GOOGLE_OAUTH_URLS.USER_INFO, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!basicResponse.ok) {
      throw new Error('Failed to get user information');
    }

    const basicUser = await basicResponse.json();

    // Try to get enhanced demographic info from People API
    try {
      const enhancedUser = await this.getEnhancedUserInfo(accessToken);
      return { ...basicUser, ...enhancedUser };
    } catch (error) {
      console.warn('Failed to get enhanced user info:', error);
      return basicUser;
    }
  }

  /**
   * Get enhanced user information from Google People API
   */
  private async getEnhancedUserInfo(accessToken: string): Promise<Partial<User>> {
    const personFields = [
      'names',
      'emailAddresses', 
      'genders',
      'birthdays',
      'ageRanges',
      'locales'
    ].join(',');

    const response = await fetch(
      `${GOOGLE_OAUTH_URLS.PEOPLE_API}?personFields=${personFields}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to get enhanced user information');
    }

    const data = await response.json();
    const enhancedInfo: Partial<User> = {};

    // Extract gender
    if (data.genders && data.genders.length > 0) {
      enhancedInfo.gender = data.genders[0].value;
    }

    // Extract age range
    if (data.ageRanges && data.ageRanges.length > 0) {
      const ageRange = data.ageRanges[0];
      enhancedInfo.age_range = {
        min: ageRange.min || 0,
        max: ageRange.max
      };
    }

    // Extract birthdate
    if (data.birthdays && data.birthdays.length > 0) {
      const birthday = data.birthdays[0];
      if (birthday.date) {
        const { year, month, day } = birthday.date;
        if (year && month && day) {
          enhancedInfo.birthdate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        }
      }
    }

    // Extract locale
    if (data.locales && data.locales.length > 0) {
      enhancedInfo.locale = data.locales[0].value;
    }

    // Extract detailed names
    if (data.names && data.names.length > 0) {
      const name = data.names[0];
      if (name.givenName) enhancedInfo.given_name = name.givenName;
      if (name.familyName) enhancedInfo.family_name = name.familyName;
    }

    return enhancedInfo;
  }

  /**
   * Logout user and clear session
   */
  public logout(): void {
    this.user = null;
    this.tokens = null;
    sessionStorage.removeItem('careconnect_user');
    sessionStorage.removeItem('careconnect_tokens');
    sessionStorage.removeItem('oauth_state');
  }

  /**
   * Get current user
   */
  public getCurrentUser(): User | null {
    return this.user;
  }

  /**
   * Check if user is authenticated
   */
  public isAuthenticated(): boolean {
    return this.user !== null && this.tokens !== null;
  }

  /**
   * Get access token for API calls
   */
  public getAccessToken(): string | null {
    return this.tokens?.access_token || null;
  }

  /**
   * Generate random state for OAuth security
   */
  private generateState(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  /**
   * Store authentication data in session storage
   */
  private storeAuth(user: User, tokens: AuthTokens): void {
    sessionStorage.setItem('careconnect_user', JSON.stringify(user));
    sessionStorage.setItem('careconnect_tokens', JSON.stringify(tokens));
  }

  /**
   * Load stored authentication data
   */
  private loadStoredAuth(): void {
    try {
      const storedUser = sessionStorage.getItem('careconnect_user');
      const storedTokens = sessionStorage.getItem('careconnect_tokens');

      if (storedUser && storedTokens) {
        this.user = JSON.parse(storedUser);
        this.tokens = JSON.parse(storedTokens);

        // TODO: Validate token expiration and refresh if needed
      }
    } catch (error) {
      console.error('Error loading stored auth:', error);
      // Clear invalid stored data
      this.logout();
    }
  }
}

export default AuthService.getInstance();