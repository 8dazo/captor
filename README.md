# captar

Basic monorepo scaffold.

## Layout

```txt
apps/
  docs/
  platform/
  site/
packages/
  ts/
    ui/
    utils/
    config/
    types/
    sdk/
  rust/
    core/
    cli/
    bindings/
  python/
    ml/
    workers/
    common/
  schemas/
    openapi/
    protobuf/
    jsonschema/
infra/
scripts/
```

## Conventions

- Put deployable apps in `apps/`
- Put shared TypeScript code in `packages/ts/`
- Put Rust crates in `packages/rust/`
- Put Python packages in `packages/python/`
- Put shared contracts in `packages/schemas/`
