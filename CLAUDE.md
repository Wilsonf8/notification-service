# CLAUDE.md

Project-specific instructions for Claude Code.

## Documentation Requirements

**Always document all classes, functions, and components.**

### TypeScript/React/Next.js

Use JSDoc comments:

```typescript
/**
 * Brief description of what it does.
 * @param paramName - Description of parameter
 * @returns Description of return value
 * @throws {ErrorType} When this error occurs
 */
```

### Java/Spring Boot

Use Javadoc comments:

```java
/**
 * Brief description of what it does.
 *
 * @param paramName description of parameter
 * @return description of return value
 * @throws ExceptionType when this error occurs
 */
```

## Project Structure

- `/backend` - Spring Boot 4.0.2, Java 21, PostgreSQL, Redis
- `/frontend` - Next.js 16, React 19, TypeScript, shadcn (base-lyra style)

## Running Locally

```bash
# Backend (defaults to dev profile)
cd backend && ./mvnw spring-boot:run

# Frontend
cd frontend && npm run dev
```

## Style Guide

- Frontend uses base-lyra style with Stone/Yellow theme, Tabler icons, JetBrains Mono font
- No border radius (sharp corners)
- Dark mode is default
