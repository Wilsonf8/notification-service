# CLAUDE.md

Project-specific instructions for Claude Code.

## Documentation

**Document all classes, functions, and components** using JSDoc (TypeScript) or Javadoc (Java):

```
/**
 * Brief description.
 * @param paramName - Description
 * @returns Description (@return for Java)
 * @throws When this error occurs
 */
```

## Project Structure

- `/backend` - Spring Boot 4.0.2, Java 21, PostgreSQL, Redis
- `/frontend` - Next.js 16, React 19, TypeScript, shadcn (base-lyra style)
- `/sdks/liveconnect-widget` - Embeddable LiveConnect widget for customer websites

## Running Locally

```bash
# Backend (defaults to dev profile)
cd backend && ./mvnw spring-boot:run

# Frontend
cd frontend && npm run dev
```

## LiveConnect Widget SDK

After modifying files in `/sdks/liveconnect-widget`:

```bash
# 1. Build the widget
cd sdks/liveconnect-widget && npm run build

# 2. Copy to frontend public folder
cp dist/liveconnect.js ../frontend/public/sdk/liveconnect.js
```

Test pages are available at `/sdk/test1.html`, `/sdk/test2.html`, `/sdk/test3.html`.

## Style Guide

- Frontend uses base-lyra style with Stone/Yellow theme, Tabler icons, JetBrains Mono font
- No border radius (sharp corners)
- Dark mode is default
- Ensure responsive design (mobile/portrait/landscape)

## Planning Structure

Two-tier planning approach for large features:

| File                 | Name             | Purpose                                                            |
|----------------------|------------------|--------------------------------------------------------------------|
| `docs/plans/*.md`    | **Master Spec**  | Full feature design, architecture, schema, APIs. Stable reference. |
| `.claude/plans/*.md` | **Working Plan** | Detailed steps for current phase. Rewritten each phase.            |

- Master spec stays clean as the source of truth
- Working plan has granular implementation details for active work
- Each phase starts fresh with focused context
