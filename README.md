# Node Rollup Typescript starter

A simple starter to bootstrap your next node application.

## Aliases

It includes by default support for aliases in `tsconfig.json`.
It is defaulted to `~/*`, so you can import stuff like this

```typescript
import { Logger } from '~/services/logger'

const logger = new Logger()
```

It uses [tsconfig-paths](https://github.com/dividab/tsconfig-paths).
It means that you only have to setup your aliases in the `tsconfig.json`, it's your source of truth.

## @types and extending modules

It also includes a `@types` directory under **src**, so you can easily
separate your types or extends some external modules. They are also included in the `tsconfig.json`
For example, if some package named `foo` does not have any types in [DefinitelyTyped](https://definitelytyped.org/), you could
add a `index.d.ts` under `src/@types/foo/index.d.ts`. It is just my personnal convention, so do as you want!

```typescript
// src/@types/foo/index.d.ts

// to make sure Typescript get the original types from the module (if any)
import * as foo from 'foo'

declare module 'foo' {
  declare function foo(bar: string): boolean
}
```

Because the `@types` directory is declared in `typeRoots`, Typescript will no longer complain if you imported your package with missing types

## process.env and related typings

This starter is using [Dotenv-flow](https://github.com/kerimdzhanov/dotenv-flow) to handle secrets.  
It includes a `.env` which **SHOULD** be committed. It's an example file and does not contains any sensitive data. You must copy it and rename it to **.env.local** for example. This one is ignored. To see all the availables .env files that you can make (and their priority orders), please [have a look here](https://github.com/kerimdzhanov/dotenv-flow#files-under-version-control).

By using Typescript's [merging interfaces capability](https://www.typescriptlang.org/docs/handbook/declaration-merging.html#merging-interfaces), it also comes by default with `process.env` types safety. You can type them under `src/@types/node/index.d.ts`
and have all the nice autocompletion!

## Rollup

The application is bundled by [Rollup](https://rollupjs.org/) (see the `rollup.config.js`). It allows to have a total control about
how your application sources will be outputed. By default, it comes with a CommonJS compatible module (mainly for Node)
or a ES module compatible source. It uses the `module` and `main` field in the **package.json** so the one that consume
your application / library use the correct version based on the platform used.
The `types` field is also used to correctly picks TypeScript definitions.

## Tooling

The template includes [Prettier](https://prettier.io/), [ESLint](https://eslint.org/) (with [Typescript-eslint](https://github.com/typescript-eslint/typescript-eslint)), [Babel](https://babeljs.io/) and [Husky](https://github.com/typicode/husky).
All their related configurations are in the `*rc` files.
