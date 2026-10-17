import { registerHooks } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { transpileModule, ModuleKind, JsxEmit } from 'typescript';
// Test-only TSX support using the project's existing compiler, no test dependency.
registerHooks({
  resolve(specifier, context, nextResolve) {
    try { return nextResolve(specifier, context); }
    catch (error) {
      if (specifier.startsWith('.') && context.parentURL && error.code === 'ERR_MODULE_NOT_FOUND') {
        for (const suffix of ['.ts', '.tsx']) {
          const url = new URL(specifier + suffix, context.parentURL);
          if (existsSync(url)) return { url: url.href, shortCircuit: true };
        }
      }
      throw error;
    }
  },
  load(url, context, nextLoad) {
    if (!url.endsWith('.tsx')) return nextLoad(url, context);
    return { format: 'module', shortCircuit: true, source: transpileModule(readFileSync(new URL(url), 'utf8'), {
      compilerOptions: { module: ModuleKind.ESNext, jsx: JsxEmit.ReactJSX }, fileName: new URL(url).pathname,
    }).outputText };
  },
});
