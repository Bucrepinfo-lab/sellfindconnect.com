import { IoAdapter } from '@nestjs/platform-socket.io';
import type { INestApplication } from '@nestjs/common';
import type { ServerOptions } from 'socket.io';

export class ConversationsIoAdapter extends IoAdapter {
  constructor(
    app: INestApplication,
    private readonly webOrigin: string | string[],
  ) {
    super(app);
  }

  override createIOServer(port: number, options?: ServerOptions) {
    return super.createIOServer(port, {
      ...options,
      cors: {
        origin: this.webOrigin,
        credentials: true,
      },
      transports: ['websocket'],
    });
  }
}
