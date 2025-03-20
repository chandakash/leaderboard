import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ApiTokenGuard implements CanActivate {
  private readonly logger = new Logger(ApiTokenGuard.name);
  private readonly validTokens = new Set<string>();
  private readonly tokenExpiry = new Map<string, number>();
  private readonly apiSecret: string;

  constructor(private configService: ConfigService) {
    this.apiSecret = configService.get<string>('apiSecret.key', 'test-key');
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Missing API token');
    }

    const timestamp = request.headers['x-request-timestamp'] as string; // for replay attacks
    if (!timestamp) {
      throw new UnauthorizedException('Missing request timestamp');
    }
    const now = Date.now();
    if (this.validTokens.has(token)) {
      const expiry = this.tokenExpiry.get(token);
      if (expiry && now > expiry) {
        this.validTokens.delete(token);
        this.tokenExpiry.delete(token);
      } else {
        throw new UnauthorizedException('Token already used (replay detected)');
      }
    }

    try {
      const isValid = this.verifyToken(token, request);

      if (!isValid) {
        throw new UnauthorizedException('Invalid API token');
      }

      return true;
    } catch (error) {
      this.logger.error(
        `Token validation failed: ${error.message}`,
        error.stack,
      );
      throw new UnauthorizedException('Invalid API token');
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const authHeader = request.headers.authorization;
    if (!authHeader) return undefined;

    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : undefined;
  }

  private verifyToken(token: string, request: Request): boolean {
    const { path, method, body } = request;
    const timestamp = request.headers['x-request-timestamp'] as string;
    const userId = request.headers['x-user-id'] as string;

    if (!userId) {
      return false;
    }

    const payload = `${userId}:${timestamp}:${path}:${method}:${JSON.stringify(body || {})}`;
    const expectedToken = crypto
      .createHmac('sha256', this.apiSecret)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(token),
      Buffer.from(expectedToken),
    );
  }
}
