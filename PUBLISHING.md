# Publishing to npm

This guide explains how to publish the `safe-memory-layer` package to npm.

## Prerequisites

1. **Create an npm account** (if you don't have one):
   ```bash
   npm signup
   ```

2. **Login to npm**:
   ```bash
   npm login
   ```

3. **Verify your identity**:
   ```bash
   npm whoami
   ```

## Pre-Publish Checklist

Before publishing, ensure everything is ready:

### 1. Update Version Number

Edit `package.json` and update the version following semantic versioning:

```json
{
  "version": "1.0.0"
}
```

Version format: `MAJOR.MINOR.PATCH`
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes

### 2. Run Tests

```bash
npm test
```

Ensure all 65 tests pass.

### 3. Build the Project

```bash
npm run build
```

This creates the distribution files in the `dist/` directory.

### 4. Verify Package Contents

Check what will be published:

```bash
npm pack --dry-run
```

This shows the files that will be included in the package.

### 5. Update README

Ensure `README.md` is up-to-date with:
- Current version number
- Installation instructions
- Usage examples
- API documentation

## Publishing Steps

### First Time Publishing

1. **Ensure package name is unique**:
   ```bash
   npm search safe-memory-layer
   ```
   If the name is taken, you'll need to use a scoped name like `@yourusername/safe-memory-layer`.

2. **Publish the package**:
   ```bash
   npm publish
   ```

   For scoped packages (private by default):
   ```bash
   npm publish --access public
   ```

### Subsequent Updates

1. **Make your changes** to the code

2. **Update version** in `package.json`:
   ```bash
   # For patch release (1.0.0 -> 1.0.1)
   npm version patch
   
   # For minor release (1.0.0 -> 1.1.0)
   npm version minor
   
   # For major release (1.0.0 -> 2.0.0)
   npm version major
   ```

   This automatically commits the version change and creates a git tag.

3. **Push to git** (if using git):
   ```bash
   git push && git push --tags
   ```

4. **Publish**:
   ```bash
   npm publish
   ```

## Post-Publish Verification

1. **Check npm registry**:
   ```bash
   npm view safe-memory-layer
   ```

2. **Test installation** in a new directory:
   ```bash
   npm install safe-memory-layer
   ```

3. **Verify the package works**:
   ```bash
   node -e "const { MemoryStore } = require('safe-memory-layer'); console.log('Success!');"
   ```

## Package Configuration

The `package.json` is already configured with:

- **Entry points**:
  - ESM: `dist/index.js`
  - CommonJS: `dist/index.cjs`
  - Types: `dist/index.d.ts`

- **Files included**:
  - `dist/` - Built files
  - `src/` - Source files
  - `README.md` - Documentation
  - `LICENSE` - License file

- **Keywords** for discoverability
- **Engine requirements** (Node.js 20+)

## Automated Publishing with CI/CD

For automated publishing, you can use GitHub Actions:

### 1. Create `.github/workflows/publish.yml`:

```yaml
name: Publish to npm

on:
  release:
    types: [created]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
      - run: npm run build
      - run: npm test
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### 2. Create an npm automation token:

```bash
# Generate token at https://www.npmjs.com/settings/your-username/tokens
# Select "Automation" type
```

### 3. Add token to GitHub secrets:

- Go to repository Settings → Secrets and variables → Actions
- Add `NPM_TOKEN` with your npm automation token

### 4. Create a release:

```bash
git tag v1.0.0
git push origin v1.0.0
gh release create v1.0.0 --title "v1.0.0" --notes "Initial release"
```

The GitHub Action will automatically publish to npm when the release is created.

## Troubleshooting

### "You do not have permission to publish"

- Ensure you're logged in: `npm login`
- Check package name isn't owned by someone else
- For scoped packages, use `--access public`

### "Package name too similar to existing package"

- Choose a more unique name
- Consider using a scope: `@yourusername/safe-memory-layer`

### "Missing required fields"

- Ensure `name`, `version`, `description`, and `main` are in package.json
- Check that build artifacts exist in `dist/`

### Build fails before publish

```bash
# Clean and rebuild
rm -rf dist
npm run build
```

## Best Practices

1. **Always run tests** before publishing
2. **Update CHANGELOG.md** with each release
3. **Use semantic versioning** strictly
4. **Tag releases** in git
5. **Publish from a clean working directory** (no uncommitted changes)
6. **Verify the package** after publishing
7. **Monitor downloads** and issues after release

## Useful Commands

```bash
# Check what will be published
npm pack --dry-run

# View published package info
npm view safe-memory-layer

# Check for outdated dependencies
npm outdated

# Update dependencies
npm update

# Audit for vulnerabilities
npm audit
```

## Support

If you encounter issues:
- Check npm documentation: https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry
- Verify package name availability
- Ensure all tests pass
- Check build output exists