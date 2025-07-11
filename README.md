# flows.thepia.net

Public demo website for Thepia Flows with live database integration and passkey authentication.

## Overview

This repository contains the source code for the public demo website at [flows.thepia.net](https://flows.thepia.net). It serves as:

- **Public landing page** for the official Thepia Flows demo
- **Live demonstration** of flows-db with real client data
- **Authentication showcase** using flows-auth with passkey login
- **Component development** environment for eventual migration to flows-admin package

## Architecture

- **Astro + Svelte** for optimal static site generation with interactive islands
- **TypeScript** for type safety and better developer experience
- **Tailwind CSS** with Thepia design system
- **Biome** for code quality and formatting
- **Vitest + Playwright** for comprehensive testing

## Development

### Prerequisites

- Node.js 18+
- pnpm 9+

### Setup

```bash
# Clone the repository
git clone git@github.com:thepia/flows.thepia.net.git
cd flows.thepia.net

# Install dependencies
pnpm install

# Set up Let's Encrypt certificates (requires DNS control)
# 1. Add DNS A record: dev.thepia.net → 127.0.0.1
# 2. Run certificate generation:
pnpm setup:letsencrypt
# 3. Add DNS TXT record when prompted for validation
# 4. Certificates will be in certs/ directory

# Alternative: Quick local certificates with mkcert
pnpm setup:https

# Add to /etc/hosts file
sudo sh -c 'echo "127.0.0.1 dev.thepia.net" >> /etc/hosts'

# Start development server with HTTPS
pnpm dev
```

The development server runs on `https://dev.thepia.net:5176` with HTTPS for WebAuthn and Supabase Auth compatibility.

### Available Scripts

```bash
# Development
pnpm dev                      # Start development server
pnpm build                    # Build for production
pnpm preview                  # Preview production build

# Code Quality
pnpm check                    # Run Biome linting and formatting checks
pnpm check:fix                # Auto-fix Biome issues
pnpm typecheck                # TypeScript type checking

# Testing
pnpm test                     # Run unit tests
pnpm test:watch               # Run tests in watch mode
pnpm test:coverage            # Run tests with coverage
pnpm exec playwright test     # Run E2E tests

# Demo Operations
pnpm demo:setup               # Initialize demo environment
pnpm demo:start               # Start demo with authentication
pnpm demo:reset               # Reset demo state
```

## Project Structure

```
flows.thepia.net/
├── src/
│   ├── components/
│   │   ├── auth/             # Authentication components (Svelte)
│   │   └── landing/          # Landing page components (Astro)
│   ├── layouts/              # Page layouts
│   ├── pages/                # Route pages
│   │   ├── index.astro       # Landing page
│   │   └── demo/             # Demo application
│   └── styles/               # Global styles
├── tests/
│   └── e2e/                  # Playwright E2E tests
├── .github/
│   └── workflows/            # CI/CD workflows
└── docs/                     # Documentation
```

## Deployment

### GitHub Pages (Review Branches)
- Automatic deployment on branch push
- Preview URLs for testing
- Configured via `.github/workflows/deploy-pages.yml`

### Bunny CDN (Production)
- Manual deployment process
- Performance optimization
- Global CDN distribution

## Integration Requirements

### Authentication Integration
- **flows-auth dependency** for passkey authentication
- **dev.thepia.net domain** for development (WebAuthn compatibility)
- **Employee-only access** with clear messaging

### Database Integration
- **flows-db connection** for live demo data
- **Real client examples** from demo database
- **Performance considerations** for public access

### Branding Integration (Planned)
- **@thepia/branding package** for consistent brand application
- **First implementation** to test and refine the branding system
- **Design token migration** from manual to package-based tokens
- **Asset integration** for logos, fonts, and brand elements
- **See [Branding Integration Plan](./docs/branding-integration.md)** for detailed roadmap

## Security Considerations

### Public Access
- **No sensitive data exposure** in public demo
- **Rate limiting** for API calls
- **Demo data only** - no production client information

### Authentication Flow
- **Passkey-only authentication** for demo access
- **Employee verification** before access granted
- **Session management** for demo users

## Contributing

1. **Follow existing patterns** in the codebase
2. **Run quality checks** before committing:
   ```bash
   pnpm check
   pnpm typecheck
   pnpm test
   pnpm build
   ```
3. **Write tests** for new functionality
4. **Update documentation** as needed

## Related Repositories

- **[thepia.com](https://github.com/thepian/thepia.com)** - Main website and API server
- **[flows-auth](https://github.com/thepia/flows-auth)** - Authentication UI library
- **[flows-db](https://github.com/thepia/flows-db)** - Database schema and functionality

## License

Copyright (c) 2025 Thepia. All rights reserved.

This software is proprietary to Thepia. See [LICENSE](./LICENSE) for details.
