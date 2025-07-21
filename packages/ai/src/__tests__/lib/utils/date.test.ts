import { isFirestoreTimestamp, convertToUtcIsoString, getCurrentUtcIsoString } from '@/src/lib/utils/date';

describe('Date Utils', () => {

  describe('isFirestoreTimestamp', () => {
    it('should return true for valid Firestore Timestamp', () => {
      const timestamp = {
        _seconds: 1642248600,
        _nanoseconds: 0
      };
      expect(isFirestoreTimestamp(timestamp)).toBe(true);
    });
  });

  describe('convertToUtcIsoString', () => {
    it('should convert valid Date object to UTC ISO string', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const result = convertToUtcIsoString(date);
      expect(result).toBe('2024-01-15T10:30:00.000Z');
    });

    it('should handle already valid UTC ISO string', () => {
      const isoString = '2024-01-15T10:30:00.000Z';
      const result = convertToUtcIsoString(isoString);
      expect(result).toBe(isoString);
    });

    it('should convert non-UTC ISO string to UTC', () => {
      const dateString = '2024-01-15T10:30:00';
      const result = convertToUtcIsoString(dateString);
      expect(result).toBeTruthy();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should handle Firestore Timestamp-like objects', () => {
      const timestampLike = {
        _seconds: 1642248600, // Jan 15, 2022 10:30:00 UTC
        _nanoseconds: 123456789
      };
      const result = convertToUtcIsoString(timestampLike);
      expect(result).toBeTruthy();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should return null for invalid input', () => {
      expect(convertToUtcIsoString(null)).toBeNull();
      expect(convertToUtcIsoString(undefined)).toBeNull();
      expect(convertToUtcIsoString('')).toBeNull();
      expect(convertToUtcIsoString('invalid-date')).toBeNull();
      expect(convertToUtcIsoString(123)).toBeNull();
    });

    it('should handle invalid Date object', () => {
      const invalidDate = new Date('invalid');
      expect(() => convertToUtcIsoString(invalidDate)).toThrow();
    });

    it('should validate timestamp seconds range', () => {
      const outOfRangeTimestamp = {
        _seconds: -99999999999, // Way before valid range
        _nanoseconds: 0
      };
      const result = convertToUtcIsoString(outOfRangeTimestamp);
      expect(result).toBeNull();
    });

    it('should validate timestamp nanoseconds range', () => {
      const invalidNanoseconds = {
        _seconds: 1642248600,
        _nanoseconds: 2000000000 // Over 1 billion
      };
      const result = convertToUtcIsoString(invalidNanoseconds);
      expect(result).toBeNull();
    });

    it('should handle objects without required timestamp properties', () => {
      const notTimestamp = { foo: 'bar' };
      const result = convertToUtcIsoString(notTimestamp);
      expect(result).toBeNull();
    });

    it('should handle malformed ISO strings', () => {
      const malformedIso = '2024-13-45T99:99:99Z'; // Invalid month/day/time
      const result = convertToUtcIsoString(malformedIso);
      expect(result).toBeNull();
    });

    it('should convert regular date string', () => {
      const dateString = 'January 15, 2024';
      const result = convertToUtcIsoString(dateString);
      expect(result).toBeTruthy();
      expect(result).toMatch(/^2024-01-15T/);
    });
  });

  describe('getCurrentUtcIsoString', () => {
    it('should return current UTC ISO string', () => {
      const before = Date.now();
      const result = getCurrentUtcIsoString();
      const after = Date.now();

      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      
      const resultTime = new Date(result).getTime();
      expect(resultTime).toBeGreaterThanOrEqual(before);
      expect(resultTime).toBeLessThanOrEqual(after);
    });

    it('should return valid ISO format', () => {
      const result = getCurrentUtcIsoString();
      expect(() => new Date(result)).not.toThrow();
      expect(new Date(result).toISOString()).toBe(result);
    });
  });

  describe('Edge Cases', () => {
    it('should handle leap year date', () => {
      const leapYearDate = new Date('2024-02-29T12:00:00Z');
      const result = convertToUtcIsoString(leapYearDate);
      expect(result).toBe('2024-02-29T12:00:00.000Z');
    });

    it('should handle Unix epoch', () => {
      const epochDate = new Date(0);
      const result = convertToUtcIsoString(epochDate);
      expect(result).toBe('1970-01-01T00:00:00.000Z');
    });

    it('should handle far future date', () => {
      const futureDate = new Date('2099-12-31T23:59:59Z');
      const result = convertToUtcIsoString(futureDate);
      expect(result).toBe('2099-12-31T23:59:59.000Z');
    });

    it('should handle timestamp with exact boundary values', () => {
      const boundaryTimestamp = {
        _seconds: 253402300799, // Max valid seconds
        _nanoseconds: 999999999  // Max valid nanoseconds
      };
      const result = convertToUtcIsoString(boundaryTimestamp);
      expect(result).toBeTruthy();
    });

    it('should handle minimal valid timestamp', () => {
      const minTimestamp = {
        _seconds: -62135596800, // Min valid seconds
        _nanoseconds: 0
      };
      const result = convertToUtcIsoString(minTimestamp);
      expect(result).toBeTruthy();
    });
  });
}); 