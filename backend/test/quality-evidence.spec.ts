import { BadRequestException } from '@nestjs/common';
import { identifyEvidenceImage } from '../src/modules/workflow/quality-evidence';

describe('Quality photo upload boundary', () => {
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 1, 0xff, 0xd9]);

  it('accepts JPEG signatures with matching MIME type', () => {
    expect(identifyEvidenceImage({ buffer: jpeg, size: jpeg.length, mimetype: 'image/jpeg' }))
      .toEqual({ contentType: 'image/jpeg', extension: 'jpg' });
  });

  it('rejects an unrelated body claiming to be an image', () => {
    const buffer = Buffer.from('invalid attachment');
    expect(() => identifyEvidenceImage({ buffer, size: buffer.length, mimetype: 'image/jpeg' }))
      .toThrow(BadRequestException);
  });

  it('rejects a valid signature with a conflicting MIME type', () => {
    expect(() => identifyEvidenceImage({ buffer: jpeg, size: jpeg.length, mimetype: 'image/png' }))
      .toThrow(BadRequestException);
  });
});
