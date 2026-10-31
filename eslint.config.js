import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules', '.impeccable', 'artifacts'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/tests/**', 'src/data/fixtures/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/fixtures', '**/fixtures/**'],
              message: '生产模块不得导入测试数据。',
            },
          ],
        },
      ],
    },
  },
  ...['scene', 'history', 'timeline'].map((feature) => ({
    files: [`src/features/${feature}/**/*.{ts,tsx}`],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '**/fixtures',
                '**/fixtures/**',
                '**/app',
                '**/app/**',
                ...['scene', 'history', 'timeline']
                  .filter((other) => other !== feature)
                  .flatMap((other) => [`**/${other}`, `**/${other}/**`]),
              ],
              message:
                'feature 不反向依赖 app，不直接依赖其他 feature 或测试数据；由公共契约与应用层协调。',
            },
          ],
        },
      ],
    },
  })),
);
