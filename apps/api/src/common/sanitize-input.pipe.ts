import { Injectable, type ArgumentMetadata, type PipeTransform } from '@nestjs/common';
import { sanitizeInputFields } from '@telpen/domain';

@Injectable()
export class SanitizeInputPipe implements PipeTransform {
  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    if (metadata.type !== 'body' || !value || typeof value !== 'object') {
      return value;
    }

    return sanitizeInputFields(value);
  }
}
