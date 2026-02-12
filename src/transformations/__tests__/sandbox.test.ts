import { describe, test, expect } from '@jest/globals';
import { executeCustomJS, SandboxOptions } from '../custom/sandbox';

describe('Custom JavaScript Sandbox', () => {
  describe('Basic execution', () => {
    test('should transform string to uppercase', async () => {
      const code = 'return input.toUpperCase()';
      const result = await executeCustomJS(code, 'hello');
      expect(result).toBe('HELLO');
    });

    test('should multiply number by 2', async () => {
      const code = 'return input * 2';
      const result = await executeCustomJS(code, 21);
      expect(result).toBe(42);
    });

    test('should concatenate object properties', async () => {
      const code = 'return { name: input.first + " " + input.last }';
      const result = await executeCustomJS(code, { first: 'John', last: 'Doe' });
      expect(result).toEqual({ name: 'John Doe' });
    });
  });

  describe('Timeout enforcement', () => {
    test('should timeout infinite loop', async () => {
      const code = 'while(true) {}';
      const options: SandboxOptions = { timeout: 100, memoryLimit: 128 };

      await expect(
        executeCustomJS(code, null, options)
      ).rejects.toThrow(/timed out|timeout/i);
    }, 3000); // Test timeout 3s (much longer than sandbox timeout)
  });

  describe('Memory limit enforcement', () => {
    test('should throw error when exceeding memory limit', async () => {
      const code = 'let a = []; while(true) { a.push(new Array(1000000)) }';
      const options: SandboxOptions = { timeout: 5000, memoryLimit: 8 };

      await expect(
        executeCustomJS(code, null, options)
      ).rejects.toThrow(/memory/i);
    }, 10000); // Longer timeout for memory test - may be slower
  });

  describe('Error handling', () => {
    test('should throw error when code throws', async () => {
      const code = 'throw new Error("bad")';

      await expect(
        executeCustomJS(code, null)
      ).rejects.toThrow();
    });

    test('should throw error for undefined variable', async () => {
      const code = 'return undefined_variable';

      await expect(
        executeCustomJS(code, null)
      ).rejects.toThrow();
    });
  });

  describe('Input isolation', () => {
    test('should not modify original input object', async () => {
      const input = { value: 10 };
      const code = 'input.value = 999; return input.value';

      const result = await executeCustomJS(code, input);

      // Sandbox modified its copy, not our original
      expect(result).toBe(999);
      expect(input.value).toBe(10); // Original unchanged
    });
  });

  describe('No access to Node.js APIs', () => {
    test('should not have access to require', async () => {
      const code = 'return typeof require';
      const result = await executeCustomJS(code, null);
      expect(result).toBe('undefined');
    });

    test('should not have access to process', async () => {
      const code = 'return typeof process';
      const result = await executeCustomJS(code, null);
      expect(result).toBe('undefined');
    });
  });
});
