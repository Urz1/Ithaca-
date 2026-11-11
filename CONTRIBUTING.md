# Contributing to Ithaca

First off, thank you for considering contributing to Ithaca! It is people like you who make open-source science and research tools transformative.

## Code of Conduct

This project and everyone participating in it is governed by our community standards. By participating, you are expected to uphold these values:
- Use welcoming and inclusive language.
- Be respectful of differing viewpoints and scientific methodologies.
- Focus on what is best for the research community.

## Getting Started

### Prerequisites

- **Node.js** >= 20.x
- **PostgreSQL** 16+ (or Docker)
- **Redis** 7+ (optional, falls back to in-memory)

### Local Development Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Urz1/Ithaca-.git ithaca
   cd ithaca
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment**:
   ```bash
   cp .env.example .env
   ```

4. **Initialize Database**:
   ```bash
   npm run prisma:generate
   npm run prisma:migrate:deploy
   ```

5. **Start Dev Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Running Tests

Before submitting a pull request, ensure all tests pass:

```bash
# Typecheck TypeScript
npm run typecheck

# Run unit tests
npm run test:unit

# Run full test suite with linter and validation
npm run check
```

## Pull Request Guidelines

1. Fork the repo and create your branch from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```
2. Adhere to the existing code style (Prettier & ESLint).
3. Include tests for any new features or bug fixes.
4. Ensure `npm run typecheck` passes without errors.
5. Write clear, concise commit messages.

Thank you for contributing to open science!
