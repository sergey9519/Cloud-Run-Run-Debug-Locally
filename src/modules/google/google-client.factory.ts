
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { google, sheets_v4, docs_v1, drive_v3 } from 'googleapis';
import { OAuth2Client, JWT } from 'google-auth-library';

export interface GoogleUserCredentials {
  accessToken?: string;
  refreshToken: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  googleCredentials?: GoogleUserCredentials;
}

@Injectable()
export class GoogleClientFactory {
  private readonly logger = new Logger(GoogleClientFactory.name);

  /**
   * Creates an OAuth2 client configured with the user's tokens.
   */
  createAuth(credentials: GoogleUserCredentials): OAuth2Client {
    if (!credentials || !credentials.refreshToken) {
      this.logger.warn('Attempted to create Google Client without refresh token');
      throw new UnauthorizedException('User is not connected to Google Services.');
    }

    try {
      const auth = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
      );

      auth.setCredentials({
        access_token: credentials.accessToken,
        refresh_token: credentials.refreshToken,
      });

      return auth;
    } catch (error) {
      this.logger.error(`Failed to initialize OAuth client: ${error.message}`);
      throw new UnauthorizedException('Invalid Google Credentials');
    }
  }

  /**
   * Creates a JWT client using the Service Account credentials.
   * Used for server-to-server interactions (e.g., accessing Team Assets).
   */
  createServiceAccountAuth(): JWT {
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_SERVICE_PRIVATE_KEY) {
      this.logger.error('Missing Service Account Credentials in Environment');
      throw new Error('Service Account configuration missing');
    }

    try {
      const client = new google.auth.JWT({
        email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        key: process.env.GOOGLE_SERVICE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Handle newlines in ENV
        scopes: ['https://www.googleapis.com/auth/drive.readonly'],
      });
      return client;
    } catch (error) {
       this.logger.error(`Failed to initialize Service Account client: ${error.message}`);
       throw new Error('Service Account authentication failed');
    }
  }

  /**
   * Returns authenticated clients for Sheets and Docs (User Context).
   */
  createClients(user: AuthenticatedUser): { sheets: sheets_v4.Sheets; docs: docs_v1.Docs } {
    if (!user.googleCredentials) {
       throw new UnauthorizedException('User missing Google credentials');
    }
    
    const auth = this.createAuth(user.googleCredentials);
    
    return {
      sheets: google.sheets({ version: 'v4', auth }),
      docs: google.docs({ version: 'v1', auth }),
    };
  }

  /**
   * Returns a Drive client authenticated as the Service Account.
   */
  createDriveClient(): drive_v3.Drive {
      const auth = this.createServiceAccountAuth();
      return google.drive({ version: 'v3', auth });
  }
}
