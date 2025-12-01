
import { Injectable, UnauthorizedException, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
export class GoogleClientFactory implements OnModuleInit {
  private readonly logger = new Logger(GoogleClientFactory.name);
  private serviceAccountEmail: string = '';
  private serviceAccountKey: string = '';
  private isServiceAccountConfigured = false;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.initializeServiceAccount();
  }

  private initializeServiceAccount() {
    let clientEmail = this.configService.get<string>('GOOGLE_SERVICE_ACCOUNT_EMAIL');
    let privateKey = this.configService.get<string>('GOOGLE_SERVICE_PRIVATE_KEY');

    // Fallback to GCP_ standardized variables (matching StorageService)
    if (!clientEmail) {
        // Try GCP_CREDENTIALS JSON blob first
        const jsonCreds = this.configService.get<string>('GCP_CREDENTIALS');
        if (jsonCreds) {
            try {
                const parsed = JSON.parse(jsonCreds);
                clientEmail = parsed.client_email;
                privateKey = parsed.private_key;
            } catch (e) {
                this.logger.warn('Failed to parse GCP_CREDENTIALS JSON in GoogleClientFactory');
            }
        }

        // Try individual vars if still missing
        if (!clientEmail) {
            clientEmail = this.configService.get<string>('GCP_CLIENT_EMAIL');
            privateKey = this.configService.get<string>('GCP_PRIVATE_KEY');
        }
    }

    if (clientEmail && privateKey) {
      this.serviceAccountEmail = clientEmail;
      // Robust newline handling: replaces literal \n or \\n with actual newlines
      this.serviceAccountKey = privateKey.replace(/\\n/g, '\n');
      this.isServiceAccountConfigured = true;
      this.logger.log(`Google Workspace Identity: ${this.serviceAccountEmail}`);
    } else {
      this.logger.warn('Google Service Account NOT configured. Drive/Sheets features will fail.');
    }
  }

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
        this.configService.get('GOOGLE_CLIENT_ID'),
        this.configService.get('GOOGLE_CLIENT_SECRET')
      );

      auth.setCredentials({
        access_token: credentials.accessToken,
        refresh_token: credentials.refreshToken,
      });

      return auth;
    } catch (error: any) {
      this.logger.error(`Failed to initialize OAuth client: ${error.message}`);
      throw new UnauthorizedException('Invalid Google Credentials');
    }
  }

  /**
   * Creates a JWT client using the Service Account credentials.
   * Supports standard GCP_ env vars and JSON blobs for consistency with StorageService.
   */
  createServiceAccountAuth(): JWT {
    if (!this.isServiceAccountConfigured) {
      this.logger.error('Attempted to use Service Account but it is not configured.');
      throw new Error('Service Account configuration missing');
    }

    try {
      const client = new google.auth.JWT({
        email: this.serviceAccountEmail,
        key: this.serviceAccountKey,
        scopes: ['https://www.googleapis.com/auth/drive.readonly'],
      });
      return client;
    } catch (error: any) {
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
   * Returns authenticated Drive client for User Context.
   */
  createDriveClientForUser(user: AuthenticatedUser): { drive: drive_v3.Drive } {
    if (!user.googleCredentials) {
       throw new UnauthorizedException('User missing Google credentials');
    }
    
    const auth = this.createAuth(user.googleCredentials);
    
    return {
        drive: google.drive({ version: 'v3', auth })
    };
  }

  /**
   * Returns a Drive client authenticated as the Service Account.
   */
  createDriveClient(): drive_v3.Drive {
      const auth = this.createServiceAccountAuth();
      return google.drive({ version: 'v3', auth });
  }

  getServiceAccountProfile() {
      return {
          email: this.serviceAccountEmail || 'not-configured',
          configured: this.isServiceAccountConfigured
      };
  }
}
