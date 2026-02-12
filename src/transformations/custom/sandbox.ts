/**
 * Custom JavaScript Sandbox using isolated-vm
 *
 * CRITICAL SECURITY: This module uses isolated-vm (NOT vm2) to execute
 * custom JavaScript in an isolated V8 context with strict resource limits.
 *
 * DO NOT use vm2 - it has multiple sandbox escape CVEs (CVE-2026-22709 and others).
 */

export interface SandboxOptions {
  timeout: number;      // milliseconds
  memoryLimit: number;  // MB
}

const DEFAULT_OPTIONS: SandboxOptions = {
  timeout: 5000,
  memoryLimit: 128,
};

export async function executeCustomJS(
  code: string,
  input: unknown,
  options?: SandboxOptions
): Promise<unknown> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  let ivm: typeof import('isolated-vm');
  try {
    // isolated-vm is a CommonJS module - need default import
    const ivmModule = await import('isolated-vm');
    ivm = ivmModule.default || ivmModule;
  } catch (error) {
    console.warn(
      'WARNING: isolated-vm failed to load. This is NOT secure and should only be used for local development.',
      error
    );
    throw new Error(
      'isolated-vm is required for secure JavaScript execution. Native module compilation may have failed.'
    );
  }

  // Create isolate with memory limit
  const isolate = new ivm.Isolate({ memoryLimit: opts.memoryLimit });

  let disposed = false;

  try {
    // Create context
    const context = await isolate.createContext();
    const jail = context.global;

    // Set input as global variable using ExternalCopy for isolation
    await jail.set('input', new ivm.ExternalCopy(input).copyInto());

    // Wrap code in IIFE to support return statement
    const wrappedCode = `(function() { ${code} })()`;

    // Compile script
    const script = await isolate.compileScript(wrappedCode);

    // Run with timeout - returns Reference or primitive
    const result = await script.run(context, { timeout: opts.timeout, copy: true });

    // If result is an object/array, it will be copied automatically with copy: true
    return result;
  } catch (error) {
    // Categorize errors for better user feedback
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
      throw new Error(`Transformation timed out (limit: ${opts.timeout}ms)`);
    }

    if (errorMessage.includes('memory') || errorMessage.includes('disposed')) {
      // Memory errors often auto-dispose the isolate
      disposed = true;
      throw new Error(`Transformation exceeded memory limit (limit: ${opts.memoryLimit}MB)`);
    }

    // Code execution error
    throw new Error(`Custom transformation error: ${errorMessage}`);
  } finally {
    // Always dispose isolate to prevent memory leaks (unless already disposed)
    if (!disposed) {
      isolate.dispose();
    }
  }
}
