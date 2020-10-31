import pkg from './package.json'
import replace from '@rollup/plugin-replace'
import resolve from '@rollup/plugin-node-resolve'
import ts from '@wessberg/rollup-plugin-ts'
import { eslint } from 'rollup-plugin-eslint'
import commonjs from '@rollup/plugin-commonjs'
import { terser } from 'rollup-plugin-terser'
import json from '@rollup/plugin-json'
import sourcemaps from 'rollup-plugin-sourcemaps'
import { builtinModules } from 'module'

const env = JSON.stringify(
  process.env.NODE_ENV ||
    (process.env.ROLLUP_WATCH ? 'development' : 'production')
)

const watch = process.env.ROLLUP_WATCH

/** @type {import('rollup').RollupOptions} */
const config = {
  input: ['src/index.ts'],
  output: [
    {
      file: pkg.main,
      format: 'cjs',
      sourcemap: true,
    },
    {
      file: pkg.module,
      format: 'esm',
      sourcemap: true,
    },
  ],
  external: [
    ...builtinModules,
    ...(pkg.dependencies == null ? [] : Object.keys(pkg.dependencies)),
    ...(pkg.devDependencies == null ? [] : Object.keys(pkg.devDependencies)),
    ...(pkg.peerDependencies == null ? [] : Object.keys(pkg.peerDependencies)),
  ],
  plugins: [
    replace({
      'process.env.NODE_ENV': env,
    }),
    resolve({ preferBuiltins: true }),
    eslint({
      include: ['src/**'],
      configFile: './.eslintrc',
    }),
    ts(),
    json(),
    commonjs(),
    !watch && terser(),
    watch && sourcemaps(),
  ],
}

export default config
