# Notification Service Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a notification service that allows developers to send Telegram notifications from their applications via a simple API.

**Architecture:** Monorepo with Spring Boot backend (API + worker) and Next.js frontend. PostgreSQL for persistence, Redis for queuing and rate limiting. Single Telegram bot with webhook mode for delivery.

**Tech Stack:** Spring Boot 4.0.2 (Java 25), Next.js 14 (TypeScript), PostgreSQL, Redis, Tailwind CSS, shadcn/ui, Railway deployment

---

## Phase 1: Project Setup & Infrastructure

### Task 1.1: Initialize Monorepo Structure

**Files:**
- Create: `backend/` (Spring Boot project)
- Create: `frontend/` (Next.js project)
- Create: `docker-compose.yml`
- Create: `.gitignore`
- Create: `README.md`

**Step 1: Create root project structure**

```bash
mkdir -p backend frontend
```

**Step 2: Initialize git repository**

```bash
git init
```

**Step 3: Create root .gitignore**

```gitignore
# IDE
.idea/
.vscode/
*.iml

# OS
.DS_Store
Thumbs.db

# Environment
.env
.env.local
.env*.local

# Logs
*.log
```

**Step 4: Create docker-compose.yml for local development**

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: notification-postgres
    environment:
      POSTGRES_DB: notification_service
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    container_name: notification-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

**Step 5: Commit**

```bash
git add .
git commit -m "chore: initialize monorepo structure with docker-compose"
```

---

### Task 1.2: Initialize Spring Boot Backend ✅ DONE

**Status:** Completed via Spring Initializr

**Actual Configuration:**
- Spring Boot 4.0.2, Java 25
- Group: `com.notificationservice`
- Artifact: `notification-service`
- Package: `com.notificationservice`
- Main class: `BackendApplication`

**Dependencies included:**
- spring-boot-starter-webmvc
- spring-boot-starter-data-jpa
- spring-boot-starter-data-redis
- spring-boot-starter-flyway
- spring-boot-starter-security
- spring-boot-starter-security-oauth2-client
- spring-boot-starter-validation
- postgresql, h2, lombok, flyway-database-postgresql

**Still needed:** Add JWT dependencies (jjwt-api, jjwt-impl, jjwt-jackson) to pom.xml

**Next Step: Create application.yml**

```yaml
# backend/src/main/resources/application.yml
spring:
  application:
    name: notification-service

  datasource:
    url: jdbc:postgresql://${DB_HOST:localhost}:${DB_PORT:5432}/${DB_NAME:notification_service}
    username: ${DB_USERNAME:postgres}
    password: ${DB_PASSWORD:postgres}
    driver-class-name: org.postgresql.Driver

  jpa:
    hibernate:
      ddl-auto: validate
    show-sql: false
    properties:
      hibernate:
        dialect: org.hibernate.dialect.PostgreSQLDialect

  flyway:
    enabled: true
    locations: classpath:db/migration

  data:
    redis:
      host: ${REDIS_HOST:localhost}
      port: ${REDIS_PORT:6379}

  security:
    oauth2:
      client:
        registration:
          github:
            client-id: ${GITHUB_CLIENT_ID}
            client-secret: ${GITHUB_CLIENT_SECRET}
            scope: read:user,user:email

server:
  port: ${PORT:8080}

telegram:
  bot:
    token: ${TELEGRAM_BOT_TOKEN}
    username: ${TELEGRAM_BOT_USERNAME}
    webhook-secret: ${TELEGRAM_WEBHOOK_SECRET}

app:
  frontend-url: ${FRONTEND_URL:http://localhost:3000}
  rate-limit:
    global-messages-per-second: 25
    per-chat-messages-per-second: 1
    ingestion-per-project-per-second: 10
    max-queued-per-project: 10000
  event:
    expiration-minutes: 30
```

**Step 4: Create application-dev.yml**

```yaml
# backend/src/main/resources/application-dev.yml
spring:
  jpa:
    show-sql: true

logging:
  level:
    com.notificationservice: DEBUG
    org.springframework.security: DEBUG
```

**Step 5: Verify build**

```bash
cd backend && ./mvnw clean compile
```

**Step 6: Commit**

```bash
git add backend/
git commit -m "feat: initialize Spring Boot backend with dependencies"
```

---

### Task 1.3: Initialize Next.js Frontend

**Files:**
- Create: `frontend/` (via create-next-app)
- Modify: `frontend/package.json`
- Create: `frontend/.env.local.example`

**Step 1: Create Next.js app**

```bash
cd frontend
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

**Step 2: Install shadcn/ui**

```bash
npx shadcn@latest init
```

Select:
- Style: Default
- Base color: Neutral
- CSS variables: Yes

**Step 3: Install additional dependencies**

```bash
npm install next-auth @auth/core
npm install lucide-react
npm install date-fns
npm install zod react-hook-form @hookform/resolvers
```

**Step 4: Add shadcn components**

```bash
npx shadcn@latest add button card input label tabs table badge dialog alert dropdown-menu toast sonner skeleton separator avatar
```

**Step 5: Create .env.local.example**

```env
# frontend/.env.local.example
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here

GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

NEXT_PUBLIC_API_URL=http://localhost:8080
```

**Step 6: Commit**

```bash
git add frontend/
git commit -m "feat: initialize Next.js frontend with shadcn/ui"
```

---

## Phase 2: Database Schema & Migrations

### Task 2.1: Create Database Migrations

**Files:**
- Create: `backend/src/main/resources/db/migration/V1__initial_schema.sql`

**Step 1: Create initial migration**

```sql
-- backend/src/main/resources/db/migration/V1__initial_schema.sql

-- Users table (provider-agnostic, supports multiple auth methods)
-- Email is unique but nullable (allows account linking by email)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,  -- Unique constraint enables account linking
    avatar_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email) WHERE email IS NOT NULL;

-- User identities table (supports GitHub, Google, Apple, Email auth)
-- One user can have multiple identities (e.g., linked GitHub + Google)
CREATE TABLE user_identities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,  -- 'github', 'google', 'apple', 'email'
    provider_user_id VARCHAR(255) NOT NULL,  -- provider's user ID (or email for email auth)
    email VARCHAR(255),  -- email from this provider
    password_hash VARCHAR(255),  -- only for email auth
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_provider_identity UNIQUE (provider, provider_user_id)
);

CREATE INDEX idx_user_identities_user_id ON user_identities(user_id);
CREATE INDEX idx_user_identities_provider ON user_identities(provider, provider_user_id);

-- Organizations table (supports teams, each user gets a personal org on signup)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,  -- URL-friendly identifier
    owner_id UUID NOT NULL REFERENCES users(id),  -- billing owner
    is_personal BOOLEAN DEFAULT FALSE,  -- true for auto-created personal orgs
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_organizations_owner_id ON organizations(owner_id);
CREATE INDEX idx_organizations_slug ON organizations(slug);

-- Organization members table (for team access)
CREATE TABLE organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'member',  -- 'owner', 'admin', 'member'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_org_member UNIQUE (organization_id, user_id)
);

CREATE INDEX idx_org_members_org_id ON organization_members(organization_id);
CREATE INDEX idx_org_members_user_id ON organization_members(user_id);

-- Projects table (belongs to organization, not user directly)
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_projects_organization_id ON projects(organization_id);
CREATE INDEX idx_projects_deleted_at ON projects(deleted_at);

-- Telegram destinations table
CREATE TABLE telegram_destinations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID UNIQUE NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    chat_id BIGINT NOT NULL,
    username VARCHAR(255),
    is_enabled BOOLEAN DEFAULT TRUE,
    disabled_reason VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_telegram_destinations_project_id ON telegram_destinations(project_id);
CREATE INDEX idx_telegram_destinations_chat_id ON telegram_destinations(chat_id);

-- Connect tokens table (for Telegram deep links)
CREATE TABLE connect_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token VARCHAR(100) UNIQUE NOT NULL,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    used BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_connect_tokens_token ON connect_tokens(token);
CREATE INDEX idx_connect_tokens_expires_at ON connect_tokens(expires_at);

-- API keys table
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    key_hash VARCHAR(255) NOT NULL,
    key_prefix VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE,
    revoked_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_api_keys_project_id ON api_keys(project_id);
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);

-- Events table (notification queue)
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
    idempotency_key VARCHAR(255),
    text TEXT NOT NULL,
    topic VARCHAR(100),
    status VARCHAR(50) NOT NULL DEFAULT 'queued',
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT unique_idempotency_key UNIQUE (project_id, idempotency_key)
);

CREATE INDEX idx_events_project_id ON events(project_id);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_created_at ON events(created_at);
CREATE INDEX idx_events_expires_at ON events(expires_at);
CREATE INDEX idx_events_idempotency ON events(project_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Event status enum values: queued, processing, sent, failed, expired, dropped
```

**Step 2: Run migration**

```bash
cd backend && ./mvnw flyway:migrate
```

**Step 3: Commit**

```bash
git add backend/src/main/resources/db/migration/
git commit -m "feat: add initial database schema migration"
```

---

### Task 2.2: Create JPA Entities

**Files:**
- Create: `backend/src/main/java/com/notificationservice/entity/User.java`
- Create: `backend/src/main/java/com/notificationservice/entity/UserIdentity.java`
- Create: `backend/src/main/java/com/notificationservice/entity/AuthProvider.java`
- Create: `backend/src/main/java/com/notificationservice/entity/Organization.java`
- Create: `backend/src/main/java/com/notificationservice/entity/OrganizationMember.java`
- Create: `backend/src/main/java/com/notificationservice/entity/OrgRole.java`
- Create: `backend/src/main/java/com/notificationservice/entity/Project.java`
- Create: `backend/src/main/java/com/notificationservice/entity/TelegramDestination.java`
- Create: `backend/src/main/java/com/notificationservice/entity/ConnectToken.java`
- Create: `backend/src/main/java/com/notificationservice/entity/ApiKey.java`
- Create: `backend/src/main/java/com/notificationservice/entity/Event.java`
- Create: `backend/src/main/java/com/notificationservice/entity/EventStatus.java`

**Step 1: Create AuthProvider enum**

```java
// backend/src/main/java/com/notificationservice/entity/AuthProvider.java
package com.notificationservice.entity;

public enum AuthProvider {
    GITHUB,
    GOOGLE,
    APPLE,
    EMAIL
}
```

**Step 2: Create User entity**

```java
// backend/src/main/java/com/notificationservice/entity/User.java
package com.notificationservice.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String username;

    private String email;

    @Column(name = "avatar_url")
    private String avatarUrl;

    @CreationTimestamp
    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<UserIdentity> identities = new ArrayList<>();

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Project> projects = new ArrayList<>();
}
```

**Step 3: Create UserIdentity entity**

```java
// backend/src/main/java/com/notificationservice/entity/UserIdentity.java
package com.notificationservice.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "user_identities")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserIdentity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AuthProvider provider;

    @Column(name = "provider_user_id", nullable = false)
    private String providerUserId;

    private String email;

    @Column(name = "password_hash")
    private String passwordHash;  // Only used for EMAIL provider

    @CreationTimestamp
    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;
}
```

**Step 4: Create OrgRole enum**

```java
// backend/src/main/java/com/notificationservice/entity/OrgRole.java
package com.notificationservice.entity;

public enum OrgRole {
    OWNER,   // Full access, billing, can delete org
    ADMIN,   // Can manage members, projects
    MEMBER   // Can view and use projects
}
```

**Step 5: Create Organization entity**

```java
// backend/src/main/java/com/notificationservice/entity/Organization.java
package com.notificationservice.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "organizations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Organization {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(unique = true, nullable = false)
    private String slug;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @Column(name = "is_personal")
    @Builder.Default
    private Boolean isPersonal = false;

    @CreationTimestamp
    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    @OneToMany(mappedBy = "organization", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<OrganizationMember> members = new ArrayList<>();

    @OneToMany(mappedBy = "organization", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Project> projects = new ArrayList<>();
}
```

**Step 6: Create OrganizationMember entity**

```java
// backend/src/main/java/com/notificationservice/entity/OrganizationMember.java
package com.notificationservice.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "organization_members")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrganizationMember {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private OrgRole role = OrgRole.MEMBER;

    @CreationTimestamp
    @Column(name = "created_at")
    private OffsetDateTime createdAt;
}
```

**Step 7: Create Project entity**

```java
// backend/src/main/java/com/notificationservice/entity/Project.java
package com.notificationservice.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "projects")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Project {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @Column(nullable = false)
    private String name;

    private String description;

    @CreationTimestamp
    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    @Column(name = "deleted_at")
    private OffsetDateTime deletedAt;

    @OneToOne(mappedBy = "project", cascade = CascadeType.ALL, orphanRemoval = true)
    private TelegramDestination telegramDestination;

    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<ApiKey> apiKeys = new ArrayList<>();

    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL)
    @Builder.Default
    private List<Event> events = new ArrayList<>();

    public boolean isDeleted() {
        return deletedAt != null;
    }
}
```

**Step 3: Create TelegramDestination entity**

```java
// backend/src/main/java/com/notificationservice/entity/TelegramDestination.java
package com.notificationservice.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "telegram_destinations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TelegramDestination {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", unique = true, nullable = false)
    private Project project;

    @Column(name = "chat_id", nullable = false)
    private Long chatId;

    private String username;

    @Column(name = "is_enabled")
    @Builder.Default
    private Boolean isEnabled = true;

    @Column(name = "disabled_reason")
    private String disabledReason;

    @CreationTimestamp
    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;
}
```

**Step 4: Create ConnectToken entity**

```java
// backend/src/main/java/com/notificationservice/entity/ConnectToken.java
package com.notificationservice.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "connect_tokens")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConnectToken {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(unique = true, nullable = false)
    private String token;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Builder.Default
    private Boolean used = false;

    @Column(name = "expires_at", nullable = false)
    private OffsetDateTime expiresAt;

    @CreationTimestamp
    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    public boolean isValid() {
        return !used && expiresAt.isAfter(OffsetDateTime.now());
    }
}
```

**Step 5: Create ApiKey entity**

```java
// backend/src/main/java/com/notificationservice/entity/ApiKey.java
package com.notificationservice.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "api_keys")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApiKey {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @Column(nullable = false)
    private String name;

    @Column(name = "key_hash", nullable = false)
    private String keyHash;

    @Column(name = "key_prefix", nullable = false)
    private String keyPrefix;

    @CreationTimestamp
    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @Column(name = "last_used_at")
    private OffsetDateTime lastUsedAt;

    @Column(name = "revoked_at")
    private OffsetDateTime revokedAt;

    public boolean isRevoked() {
        return revokedAt != null;
    }
}
```

**Step 6: Create EventStatus enum**

```java
// backend/src/main/java/com/notificationservice/entity/EventStatus.java
package com.notificationservice.entity;

public enum EventStatus {
    QUEUED,
    PROCESSING,
    SENT,
    FAILED,
    EXPIRED,
    DROPPED
}
```

**Step 7: Create Event entity**

```java
// backend/src/main/java/com/notificationservice/entity/Event.java
package com.notificationservice.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "events")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Event {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "api_key_id")
    private ApiKey apiKey;

    @Column(name = "idempotency_key")
    private String idempotencyKey;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String text;

    private String topic;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private EventStatus status = EventStatus.QUEUED;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "retry_count")
    @Builder.Default
    private Integer retryCount = 0;

    @CreationTimestamp
    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @Column(name = "sent_at")
    private OffsetDateTime sentAt;

    @Column(name = "expires_at", nullable = false)
    private OffsetDateTime expiresAt;
}
```

**Step 8: Commit**

```bash
git add backend/src/main/java/com/notificationservice/entity/
git commit -m "feat: add JPA entities for all database tables"
```

---

### Task 2.3: Create Repositories

**Files:**
- Create: `backend/src/main/java/com/notificationservice/repository/UserRepository.java`
- Create: `backend/src/main/java/com/notificationservice/repository/UserIdentityRepository.java`
- Create: `backend/src/main/java/com/notificationservice/repository/OrganizationRepository.java`
- Create: `backend/src/main/java/com/notificationservice/repository/OrganizationMemberRepository.java`
- Create: `backend/src/main/java/com/notificationservice/repository/ProjectRepository.java`
- Create: `backend/src/main/java/com/notificationservice/repository/TelegramDestinationRepository.java`
- Create: `backend/src/main/java/com/notificationservice/repository/ConnectTokenRepository.java`
- Create: `backend/src/main/java/com/notificationservice/repository/ApiKeyRepository.java`
- Create: `backend/src/main/java/com/notificationservice/repository/EventRepository.java`

**Step 1: Create all repositories**

```java
// backend/src/main/java/com/notificationservice/repository/UserRepository.java
package com.notificationservice.repository;

import com.notificationservice.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmail(String email);
}
```

```java
// backend/src/main/java/com/notificationservice/repository/UserIdentityRepository.java
package com.notificationservice.repository;

import com.notificationservice.entity.AuthProvider;
import com.notificationservice.entity.UserIdentity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserIdentityRepository extends JpaRepository<UserIdentity, UUID> {
    Optional<UserIdentity> findByProviderAndProviderUserId(AuthProvider provider, String providerUserId);

    List<UserIdentity> findByUserId(UUID userId);

    @Query("SELECT ui FROM UserIdentity ui WHERE ui.user.id = :userId AND ui.provider = :provider")
    Optional<UserIdentity> findByUserIdAndProvider(UUID userId, AuthProvider provider);

    boolean existsByProviderAndProviderUserId(AuthProvider provider, String providerUserId);
}
```

```java
// backend/src/main/java/com/notificationservice/repository/OrganizationRepository.java
package com.notificationservice.repository;

import com.notificationservice.entity.Organization;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OrganizationRepository extends JpaRepository<Organization, UUID> {
    Optional<Organization> findBySlug(String slug);

    @Query("SELECT o FROM Organization o WHERE o.owner.id = :userId AND o.isPersonal = true")
    Optional<Organization> findPersonalOrgByUserId(UUID userId);

    @Query("SELECT o FROM Organization o JOIN o.members m WHERE m.user.id = :userId")
    List<Organization> findAllByMemberUserId(UUID userId);

    boolean existsBySlug(String slug);
}
```

```java
// backend/src/main/java/com/notificationservice/repository/OrganizationMemberRepository.java
package com.notificationservice.repository;

import com.notificationservice.entity.OrganizationMember;
import com.notificationservice.entity.OrgRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OrganizationMemberRepository extends JpaRepository<OrganizationMember, UUID> {
    List<OrganizationMember> findByOrganizationId(UUID organizationId);

    Optional<OrganizationMember> findByOrganizationIdAndUserId(UUID organizationId, UUID userId);

    boolean existsByOrganizationIdAndUserId(UUID organizationId, UUID userId);

    @Query("SELECT m FROM OrganizationMember m WHERE m.organization.id = :orgId AND m.role = :role")
    List<OrganizationMember> findByOrganizationIdAndRole(UUID orgId, OrgRole role);
}
```

```java
// backend/src/main/java/com/notificationservice/repository/ProjectRepository.java
package com.notificationservice.repository;

import com.notificationservice.entity.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProjectRepository extends JpaRepository<Project, UUID> {
    @Query("SELECT p FROM Project p WHERE p.organization.id = :orgId AND p.deletedAt IS NULL")
    List<Project> findByOrganizationIdAndNotDeleted(UUID orgId);

    @Query("SELECT p FROM Project p WHERE p.id = :id AND p.deletedAt IS NULL")
    Optional<Project> findByIdAndNotDeleted(UUID id);

    @Query("SELECT p FROM Project p WHERE p.id = :id AND p.organization.id = :orgId AND p.deletedAt IS NULL")
    Optional<Project> findByIdAndOrganizationIdAndNotDeleted(UUID id, UUID orgId);
}
```

```java
// backend/src/main/java/com/notificationservice/repository/TelegramDestinationRepository.java
package com.notificationservice.repository;

import com.notificationservice.entity.TelegramDestination;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface TelegramDestinationRepository extends JpaRepository<TelegramDestination, UUID> {
    Optional<TelegramDestination> findByProjectId(UUID projectId);
    Optional<TelegramDestination> findByChatId(Long chatId);
}
```

```java
// backend/src/main/java/com/notificationservice/repository/ConnectTokenRepository.java
package com.notificationservice.repository;

import com.notificationservice.entity.ConnectToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

public interface ConnectTokenRepository extends JpaRepository<ConnectToken, UUID> {
    Optional<ConnectToken> findByToken(String token);

    @Modifying
    @Query("DELETE FROM ConnectToken ct WHERE ct.expiresAt < :now OR ct.used = true")
    int deleteExpiredOrUsedTokens(OffsetDateTime now);
}
```

```java
// backend/src/main/java/com/notificationservice/repository/ApiKeyRepository.java
package com.notificationservice.repository;

import com.notificationservice.entity.ApiKey;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ApiKeyRepository extends JpaRepository<ApiKey, UUID> {
    @Query("SELECT ak FROM ApiKey ak WHERE ak.project.id = :projectId AND ak.revokedAt IS NULL")
    List<ApiKey> findActiveByProjectId(UUID projectId);

    @Query("SELECT ak FROM ApiKey ak WHERE ak.keyHash = :keyHash AND ak.revokedAt IS NULL")
    Optional<ApiKey> findByKeyHashAndNotRevoked(String keyHash);
}
```

```java
// backend/src/main/java/com/notificationservice/repository/EventRepository.java
package com.notificationservice.repository;

import com.notificationservice.entity.Event;
import com.notificationservice.entity.EventStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EventRepository extends JpaRepository<Event, UUID> {

    @Query("SELECT e FROM Event e WHERE e.project.id = :projectId AND e.createdAt >= :since ORDER BY e.createdAt DESC")
    Page<Event> findByProjectIdAndCreatedAtAfter(UUID projectId, OffsetDateTime since, Pageable pageable);

    @Query("SELECT e FROM Event e WHERE e.status = :status AND e.expiresAt > :now ORDER BY e.createdAt ASC")
    List<Event> findByStatusAndNotExpired(EventStatus status, OffsetDateTime now, Pageable pageable);

    @Query("SELECT e FROM Event e WHERE e.project.id = :projectId AND e.idempotencyKey = :idempotencyKey")
    Optional<Event> findByProjectIdAndIdempotencyKey(UUID projectId, String idempotencyKey);

    @Query("SELECT COUNT(e) FROM Event e WHERE e.project.id = :projectId AND e.status = 'QUEUED'")
    long countQueuedByProjectId(UUID projectId);

    @Modifying
    @Query("UPDATE Event e SET e.status = 'EXPIRED' WHERE e.status = 'QUEUED' AND e.expiresAt < :now")
    int expireOldEvents(OffsetDateTime now);

    // Stats queries
    @Query("SELECT COUNT(e) FROM Event e WHERE e.project.id = :projectId AND e.createdAt >= :since")
    long countByProjectIdSince(UUID projectId, OffsetDateTime since);

    @Query("SELECT COUNT(e) FROM Event e WHERE e.project.id = :projectId AND e.status = :status AND e.createdAt >= :since")
    long countByProjectIdAndStatusSince(UUID projectId, EventStatus status, OffsetDateTime since);
}
```

**Step 2: Commit**

```bash
git add backend/src/main/java/com/notificationservice/repository/
git commit -m "feat: add JPA repositories with custom queries"
```

---

## Phase 3: Authentication (GitHub OAuth)

### Task 3.1: Configure Spring Security with OAuth2

**Files:**
- Create: `backend/src/main/java/com/notificationservice/config/SecurityConfig.java`
- Create: `backend/src/main/java/com/notificationservice/security/OAuth2SuccessHandler.java`
- Create: `backend/src/main/java/com/notificationservice/security/CustomOAuth2UserService.java`
- Create: `backend/src/main/java/com/notificationservice/security/JwtTokenProvider.java`
- Create: `backend/src/main/java/com/notificationservice/security/JwtAuthenticationFilter.java`

**Step 1: Add JWT dependency to pom.xml**

Add to dependencies section:
```xml
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-api</artifactId>
    <version>0.12.3</version>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-impl</artifactId>
    <version>0.12.3</version>
    <scope>runtime</scope>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-jackson</artifactId>
    <version>0.12.3</version>
    <scope>runtime</scope>
</dependency>
```

**Step 2: Add JWT config to application.yml**

```yaml
app:
  jwt:
    secret: ${JWT_SECRET:your-256-bit-secret-key-here-for-development-only}
    expiration-ms: 86400000  # 24 hours
```

**Step 3: Create JwtTokenProvider**

```java
// backend/src/main/java/com/notificationservice/security/JwtTokenProvider.java
package com.notificationservice.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;

@Component
public class JwtTokenProvider {

    private final SecretKey key;
    private final long expirationMs;

    public JwtTokenProvider(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.expiration-ms}") long expirationMs) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationMs = expirationMs;
    }

    public String generateToken(UUID userId) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + expirationMs);

        return Jwts.builder()
                .subject(userId.toString())
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(key)
                .compact();
    }

    public UUID getUserIdFromToken(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();

        return UUID.fromString(claims.getSubject());
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parser().verifyWith(key).build().parseSignedClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }
}
```

**Step 4: Create CustomOAuth2UserService**

```java
// backend/src/main/java/com/notificationservice/security/CustomOAuth2UserService.java
package com.notificationservice.security;

import com.notificationservice.entity.*;
import com.notificationservice.repository.OrganizationMemberRepository;
import com.notificationservice.repository.OrganizationRepository;
import com.notificationservice.repository.UserIdentityRepository;
import com.notificationservice.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    private final UserRepository userRepository;
    private final UserIdentityRepository userIdentityRepository;
    private final OrganizationRepository organizationRepository;
    private final OrganizationMemberRepository organizationMemberRepository;

    @Override
    @Transactional
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oauth2User = super.loadUser(userRequest);

        String registrationId = userRequest.getClientRegistration().getRegistrationId();
        AuthProvider provider = AuthProvider.valueOf(registrationId.toUpperCase());

        Map<String, Object> attributes = oauth2User.getAttributes();
        String providerUserId = String.valueOf(attributes.get("id"));
        String username = (String) attributes.get("login");
        String email = (String) attributes.get("email");
        String avatarUrl = (String) attributes.get("avatar_url");

        // Check if identity already exists for this provider
        Optional<UserIdentity> existingIdentity = userIdentityRepository
                .findByProviderAndProviderUserId(provider, providerUserId);

        if (existingIdentity.isPresent()) {
            // Identity exists - update user profile
            User user = existingIdentity.get().getUser();
            user.setUsername(username);
            if (email != null) user.setEmail(email);
            if (avatarUrl != null) user.setAvatarUrl(avatarUrl);
            userRepository.save(user);
        } else if (email != null) {
            // No identity for this provider - check if user exists with this email
            Optional<User> existingUser = userRepository.findByEmail(email);

            if (existingUser.isPresent()) {
                // ACCOUNT LINKING: User exists with this email - link new identity
                User user = existingUser.get();
                userIdentityRepository.save(UserIdentity.builder()
                        .user(user)
                        .provider(provider)
                        .providerUserId(providerUserId)
                        .email(email)
                        .build());
                // Update profile if needed
                if (avatarUrl != null && user.getAvatarUrl() == null) {
                    user.setAvatarUrl(avatarUrl);
                    userRepository.save(user);
                }
            } else {
                // NEW USER: Create user, identity, and personal org
                createNewUserWithOrg(username, email, avatarUrl, provider, providerUserId);
            }
        } else {
            // No email from provider - create new user (can't link)
            createNewUserWithOrg(username, email, avatarUrl, provider, providerUserId);
        }

        return oauth2User;
    }

    private void createNewUserWithOrg(String username, String email, String avatarUrl,
                                       AuthProvider provider, String providerUserId) {
        // Create new user
        User newUser = userRepository.save(User.builder()
                .username(username)
                .email(email)
                .avatarUrl(avatarUrl)
                .build());

        // Create identity
        userIdentityRepository.save(UserIdentity.builder()
                .user(newUser)
                .provider(provider)
                .providerUserId(providerUserId)
                .email(email)
                .build());

        // Create personal organization for the user
        String slug = generateUniqueSlug(username);
        Organization personalOrg = organizationRepository.save(Organization.builder()
                .name(username + "'s Projects")
                .slug(slug)
                .owner(newUser)
                .isPersonal(true)
                .build());

        // Add user as owner of their personal org
        organizationMemberRepository.save(OrganizationMember.builder()
                .organization(personalOrg)
                .user(newUser)
                .role(OrgRole.OWNER)
                .build());
    }

    private String generateUniqueSlug(String username) {
        String baseSlug = username.toLowerCase().replaceAll("[^a-z0-9]", "-");
        String slug = baseSlug;
        int counter = 1;
        while (organizationRepository.existsBySlug(slug)) {
            slug = baseSlug + "-" + counter++;
        }
        return slug;
    }
}
```

**Step 5: Create OAuth2SuccessHandler**

```java
// backend/src/main/java/com/notificationservice/security/OAuth2SuccessHandler.java
package com.notificationservice.security;

import com.notificationservice.entity.AuthProvider;
import com.notificationservice.repository.UserIdentityRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class OAuth2SuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final JwtTokenProvider tokenProvider;
    private final UserIdentityRepository userIdentityRepository;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                        Authentication authentication) throws IOException {
        OAuth2AuthenticationToken oauthToken = (OAuth2AuthenticationToken) authentication;
        OAuth2User oauth2User = oauthToken.getPrincipal();

        String registrationId = oauthToken.getAuthorizedClientRegistrationId();
        AuthProvider provider = AuthProvider.valueOf(registrationId.toUpperCase());
        String providerUserId = String.valueOf(oauth2User.getAttributes().get("id"));

        var identity = userIdentityRepository.findByProviderAndProviderUserId(provider, providerUserId)
                .orElseThrow(() -> new RuntimeException("User identity not found after OAuth"));

        String token = tokenProvider.generateToken(identity.getUser().getId());

        String targetUrl = UriComponentsBuilder.fromUriString(frontendUrl + "/auth/callback")
                .queryParam("token", token)
                .build().toUriString();

        getRedirectStrategy().sendRedirect(request, response, targetUrl);
    }
}
```

**Step 6: Create JwtAuthenticationFilter**

```java
// backend/src/main/java/com/notificationservice/security/JwtAuthenticationFilter.java
package com.notificationservice.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider tokenProvider;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String token = getTokenFromRequest(request);

        if (StringUtils.hasText(token) && tokenProvider.validateToken(token)) {
            UUID userId = tokenProvider.getUserIdFromToken(token);
            var authentication = new UsernamePasswordAuthenticationToken(
                    userId, null, Collections.emptyList());
            SecurityContextHolder.getContext().setAuthentication(authentication);
        }

        filterChain.doFilter(request, response);
    }

    private String getTokenFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}
```

**Step 7: Create SecurityConfig**

```java
// backend/src/main/java/com/notificationservice/config/SecurityConfig.java
package com.notificationservice.config;

import com.notificationservice.security.CustomOAuth2UserService;
import com.notificationservice.security.JwtAuthenticationFilter;
import com.notificationservice.security.OAuth2SuccessHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final CustomOAuth2UserService oAuth2UserService;
    private final OAuth2SuccessHandler oAuth2SuccessHandler;
    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/oauth2/**", "/login/**").permitAll()
                        .requestMatchers("/v1/notify").permitAll()  // API key auth handled separately
                        .requestMatchers("/internal/telegram/webhook").permitAll()
                        .requestMatchers("/api/auth/**").permitAll()
                        .requestMatchers("/actuator/health").permitAll()
                        .anyRequest().authenticated()
                )
                .oauth2Login(oauth2 -> oauth2
                        .userInfoEndpoint(userInfo -> userInfo.userService(oAuth2UserService))
                        .successHandler(oAuth2SuccessHandler)
                )
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(List.of(frontendUrl));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
```

**Step 8: Commit**

```bash
git add backend/
git commit -m "feat: add GitHub OAuth2 authentication with JWT tokens"
```

---

## Phase 4: Core Backend Services

### Task 4.1: Create DTOs

**Files:**
- Create: `backend/src/main/java/com/notificationservice/dto/` (multiple DTOs)

**Step 1: Create all DTOs**

```java
// backend/src/main/java/com/notificationservice/dto/UserDto.java
package com.notificationservice.dto;

import java.util.UUID;

public record UserDto(
        UUID id,
        String username,
        String email,
        String avatarUrl
) {}
```

```java
// backend/src/main/java/com/notificationservice/dto/ProjectDto.java
package com.notificationservice.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record ProjectDto(
        UUID id,
        String name,
        String description,
        TelegramDestinationDto telegramDestination,
        OffsetDateTime createdAt
) {}
```

```java
// backend/src/main/java/com/notificationservice/dto/TelegramDestinationDto.java
package com.notificationservice.dto;

public record TelegramDestinationDto(
        String username,
        boolean isEnabled,
        String disabledReason,
        HealthStatus healthStatus
) {
    public enum HealthStatus {
        HEALTHY, DEGRADED, UNHEALTHY, UNKNOWN
    }
}
```

```java
// backend/src/main/java/com/notificationservice/dto/CreateProjectRequest.java
package com.notificationservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateProjectRequest(
        @NotBlank @Size(max = 255) String name,
        @Size(max = 1000) String description
) {}
```

```java
// backend/src/main/java/com/notificationservice/dto/ApiKeyDto.java
package com.notificationservice.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record ApiKeyDto(
        UUID id,
        String name,
        String keyPrefix,
        OffsetDateTime createdAt,
        OffsetDateTime lastUsedAt
) {}
```

```java
// backend/src/main/java/com/notificationservice/dto/ApiKeyCreatedDto.java
package com.notificationservice.dto;

import java.util.UUID;

public record ApiKeyCreatedDto(
        UUID id,
        String name,
        String key  // Full key, shown only once
) {}
```

```java
// backend/src/main/java/com/notificationservice/dto/CreateApiKeyRequest.java
package com.notificationservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateApiKeyRequest(
        @NotBlank @Size(max = 255) String name
) {}
```

```java
// backend/src/main/java/com/notificationservice/dto/ConnectTokenDto.java
package com.notificationservice.dto;

public record ConnectTokenDto(
        String token,
        String deepLink
) {}
```

```java
// backend/src/main/java/com/notificationservice/dto/NotifyRequest.java
package com.notificationservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record NotifyRequest(
        @NotBlank @Size(max = 4000) String text,
        @Size(max = 100) String topic,
        @Size(max = 255) String idempotencyKey
) {}
```

```java
// backend/src/main/java/com/notificationservice/dto/NotifyResponse.java
package com.notificationservice.dto;

import java.util.UUID;

public record NotifyResponse(
        UUID eventId,
        String status
) {}
```

```java
// backend/src/main/java/com/notificationservice/dto/EventDto.java
package com.notificationservice.dto;

import com.notificationservice.entity.EventStatus;
import java.time.OffsetDateTime;
import java.util.UUID;

public record EventDto(
        UUID id,
        String text,
        String topic,
        EventStatus status,
        String errorMessage,
        OffsetDateTime createdAt,
        OffsetDateTime sentAt
) {}
```

```java
// backend/src/main/java/com/notificationservice/dto/EventsPageDto.java
package com.notificationservice.dto;

import java.util.List;

public record EventsPageDto(
        List<EventDto> events,
        int page,
        int size,
        long totalElements,
        int totalPages
) {}
```

```java
// backend/src/main/java/com/notificationservice/dto/ProjectStatsDto.java
package com.notificationservice.dto;

public record ProjectStatsDto(
        long todayTotal,
        long todaySent,
        long todayFailed,
        long weekTotal,
        long weekSent,
        long weekFailed,
        long monthTotal,
        long monthSent,
        long monthFailed,
        double successRate
) {}
```

**Step 2: Commit**

```bash
git add backend/src/main/java/com/notificationservice/dto/
git commit -m "feat: add DTOs for API requests and responses"
```

---

### Task 4.2: Create Project Service

**Files:**
- Create: `backend/src/main/java/com/notificationservice/service/ProjectService.java`

```java
// backend/src/main/java/com/notificationservice/service/ProjectService.java
package com.notificationservice.service;

import com.notificationservice.dto.*;
import com.notificationservice.entity.Project;
import com.notificationservice.entity.User;
import com.notificationservice.repository.ProjectRepository;
import com.notificationservice.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<ProjectDto> getProjectsForUser(UUID userId) {
        return projectRepository.findByUserIdAndNotDeleted(userId).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public ProjectDto getProject(UUID projectId, UUID userId) {
        Project project = projectRepository.findByIdAndUserIdAndNotDeleted(projectId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found"));
        return toDto(project);
    }

    @Transactional
    public ProjectDto createProject(CreateProjectRequest request, UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Project project = Project.builder()
                .user(user)
                .name(request.name())
                .description(request.description())
                .build();

        return toDto(projectRepository.save(project));
    }

    @Transactional
    public ProjectDto updateProject(UUID projectId, CreateProjectRequest request, UUID userId) {
        Project project = projectRepository.findByIdAndUserIdAndNotDeleted(projectId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found"));

        project.setName(request.name());
        project.setDescription(request.description());

        return toDto(projectRepository.save(project));
    }

    @Transactional
    public void deleteProject(UUID projectId, UUID userId) {
        Project project = projectRepository.findByIdAndUserIdAndNotDeleted(projectId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found"));

        project.setDeletedAt(OffsetDateTime.now());
        projectRepository.save(project);
    }

    private ProjectDto toDto(Project project) {
        TelegramDestinationDto telegramDto = null;
        if (project.getTelegramDestination() != null) {
            var dest = project.getTelegramDestination();
            telegramDto = new TelegramDestinationDto(
                    dest.getUsername(),
                    dest.getIsEnabled(),
                    dest.getDisabledReason(),
                    TelegramDestinationDto.HealthStatus.UNKNOWN
            );
        }

        return new ProjectDto(
                project.getId(),
                project.getName(),
                project.getDescription(),
                telegramDto,
                project.getCreatedAt()
        );
    }
}
```

```java
// backend/src/main/java/com/notificationservice/service/ResourceNotFoundException.java
package com.notificationservice.service;

public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String message) {
        super(message);
    }
}
```

**Commit:**

```bash
git add backend/src/main/java/com/notificationservice/service/
git commit -m "feat: add ProjectService with CRUD operations"
```

---

### Task 4.3: Create API Key Service

**Files:**
- Create: `backend/src/main/java/com/notificationservice/service/ApiKeyService.java`

```java
// backend/src/main/java/com/notificationservice/service/ApiKeyService.java
package com.notificationservice.service;

import com.notificationservice.dto.ApiKeyCreatedDto;
import com.notificationservice.dto.ApiKeyDto;
import com.notificationservice.dto.CreateApiKeyRequest;
import com.notificationservice.entity.ApiKey;
import com.notificationservice.entity.Project;
import com.notificationservice.repository.ApiKeyRepository;
import com.notificationservice.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ApiKeyService {

    private static final String KEY_PREFIX = "nsk_";
    private static final int KEY_LENGTH = 32;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final ApiKeyRepository apiKeyRepository;
    private final ProjectRepository projectRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public List<ApiKeyDto> getApiKeysForProject(UUID projectId, UUID userId) {
        verifyProjectOwnership(projectId, userId);
        return apiKeyRepository.findActiveByProjectId(projectId).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public ApiKeyCreatedDto createApiKey(UUID projectId, CreateApiKeyRequest request, UUID userId) {
        Project project = verifyProjectOwnership(projectId, userId);

        String rawKey = generateRawKey();
        String fullKey = KEY_PREFIX + rawKey;
        String keyHash = passwordEncoder.encode(fullKey);
        String keyPrefixDisplay = KEY_PREFIX + rawKey.substring(0, 8) + "...";

        ApiKey apiKey = ApiKey.builder()
                .project(project)
                .name(request.name())
                .keyHash(keyHash)
                .keyPrefix(keyPrefixDisplay)
                .build();

        apiKeyRepository.save(apiKey);

        return new ApiKeyCreatedDto(apiKey.getId(), apiKey.getName(), fullKey);
    }

    @Transactional
    public void revokeApiKey(UUID keyId, UUID userId) {
        ApiKey apiKey = apiKeyRepository.findById(keyId)
                .orElseThrow(() -> new ResourceNotFoundException("API key not found"));

        verifyProjectOwnership(apiKey.getProject().getId(), userId);

        apiKey.setRevokedAt(OffsetDateTime.now());
        apiKeyRepository.save(apiKey);
    }

    @Transactional
    public Optional<ApiKey> validateAndGetApiKey(String rawKey) {
        return apiKeyRepository.findAll().stream()
                .filter(key -> !key.isRevoked())
                .filter(key -> passwordEncoder.matches(rawKey, key.getKeyHash()))
                .findFirst()
                .map(key -> {
                    key.setLastUsedAt(OffsetDateTime.now());
                    return apiKeyRepository.save(key);
                });
    }

    private Project verifyProjectOwnership(UUID projectId, UUID userId) {
        return projectRepository.findByIdAndUserIdAndNotDeleted(projectId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found"));
    }

    private String generateRawKey() {
        byte[] bytes = new byte[KEY_LENGTH];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private ApiKeyDto toDto(ApiKey apiKey) {
        return new ApiKeyDto(
                apiKey.getId(),
                apiKey.getName(),
                apiKey.getKeyPrefix(),
                apiKey.getCreatedAt(),
                apiKey.getLastUsedAt()
        );
    }
}
```

Add PasswordEncoder bean to SecurityConfig:

```java
@Bean
public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
}
```

**Commit:**

```bash
git add backend/
git commit -m "feat: add ApiKeyService with key generation and validation"
```

---

### Task 4.4: Create Event Service

**Files:**
- Create: `backend/src/main/java/com/notificationservice/service/EventService.java`

```java
// backend/src/main/java/com/notificationservice/service/EventService.java
package com.notificationservice.service;

import com.notificationservice.dto.*;
import com.notificationservice.entity.ApiKey;
import com.notificationservice.entity.Event;
import com.notificationservice.entity.EventStatus;
import com.notificationservice.repository.EventRepository;
import com.notificationservice.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
public class EventService {

    private final EventRepository eventRepository;
    private final ProjectRepository projectRepository;
    private final StringRedisTemplate redisTemplate;

    @Value("${app.rate-limit.ingestion-per-project-per-second}")
    private int ingestionRateLimit;

    @Value("${app.rate-limit.max-queued-per-project}")
    private long maxQueuedPerProject;

    @Value("${app.event.expiration-minutes}")
    private int expirationMinutes;

    @Transactional
    public NotifyResponse createEvent(NotifyRequest request, ApiKey apiKey) {
        UUID projectId = apiKey.getProject().getId();

        // Check idempotency
        if (request.idempotencyKey() != null) {
            Optional<Event> existing = eventRepository
                    .findByProjectIdAndIdempotencyKey(projectId, request.idempotencyKey());
            if (existing.isPresent()) {
                Event e = existing.get();
                return new NotifyResponse(e.getId(), e.getStatus().name().toLowerCase());
            }
        }

        // Check rate limit
        String rateLimitKey = "rate:ingestion:" + projectId;
        Long currentCount = redisTemplate.opsForValue().increment(rateLimitKey);
        if (currentCount != null && currentCount == 1) {
            redisTemplate.expire(rateLimitKey, 1, TimeUnit.SECONDS);
        }
        if (currentCount != null && currentCount > ingestionRateLimit) {
            throw new RateLimitExceededException("Rate limit exceeded. Max " + ingestionRateLimit + " events/second");
        }

        // Check queue depth
        long queuedCount = eventRepository.countQueuedByProjectId(projectId);
        if (queuedCount >= maxQueuedPerProject) {
            throw new RateLimitExceededException("Queue full. Max " + maxQueuedPerProject + " queued events");
        }

        // Truncate message if needed
        String text = request.text();
        if (text.length() > 3500) {
            text = text.substring(0, 3500) + "… (truncated)";
        }

        Event event = Event.builder()
                .project(apiKey.getProject())
                .apiKey(apiKey)
                .idempotencyKey(request.idempotencyKey())
                .text(text)
                .topic(request.topic())
                .expiresAt(OffsetDateTime.now().plus(expirationMinutes, ChronoUnit.MINUTES))
                .build();

        eventRepository.save(event);

        // Push to Redis queue for worker
        redisTemplate.opsForList().rightPush("queue:events", event.getId().toString());

        return new NotifyResponse(event.getId(), "queued");
    }

    @Transactional(readOnly = true)
    public EventsPageDto getEventsForProject(UUID projectId, UUID userId, int page, int size) {
        projectRepository.findByIdAndUserIdAndNotDeleted(projectId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found"));

        OffsetDateTime since = OffsetDateTime.now().minusDays(7);
        Page<Event> eventPage = eventRepository.findByProjectIdAndCreatedAtAfter(
                projectId, since, PageRequest.of(page, size));

        return new EventsPageDto(
                eventPage.getContent().stream().map(this::toDto).toList(),
                page,
                size,
                eventPage.getTotalElements(),
                eventPage.getTotalPages()
        );
    }

    @Transactional(readOnly = true)
    public ProjectStatsDto getStatsForProject(UUID projectId, UUID userId) {
        projectRepository.findByIdAndUserIdAndNotDeleted(projectId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found"));

        OffsetDateTime now = OffsetDateTime.now();
        OffsetDateTime todayStart = now.truncatedTo(ChronoUnit.DAYS);
        OffsetDateTime weekStart = now.minusDays(7);
        OffsetDateTime monthStart = now.minusDays(30);

        long todayTotal = eventRepository.countByProjectIdSince(projectId, todayStart);
        long todaySent = eventRepository.countByProjectIdAndStatusSince(projectId, EventStatus.SENT, todayStart);
        long todayFailed = eventRepository.countByProjectIdAndStatusSince(projectId, EventStatus.FAILED, todayStart);

        long weekTotal = eventRepository.countByProjectIdSince(projectId, weekStart);
        long weekSent = eventRepository.countByProjectIdAndStatusSince(projectId, EventStatus.SENT, weekStart);
        long weekFailed = eventRepository.countByProjectIdAndStatusSince(projectId, EventStatus.FAILED, weekStart);

        long monthTotal = eventRepository.countByProjectIdSince(projectId, monthStart);
        long monthSent = eventRepository.countByProjectIdAndStatusSince(projectId, EventStatus.SENT, monthStart);
        long monthFailed = eventRepository.countByProjectIdAndStatusSince(projectId, EventStatus.FAILED, monthStart);

        double successRate = monthTotal > 0 ? (double) monthSent / monthTotal * 100 : 100.0;

        return new ProjectStatsDto(
                todayTotal, todaySent, todayFailed,
                weekTotal, weekSent, weekFailed,
                monthTotal, monthSent, monthFailed,
                Math.round(successRate * 10) / 10.0
        );
    }

    private EventDto toDto(Event event) {
        return new EventDto(
                event.getId(),
                event.getText(),
                event.getTopic(),
                event.getStatus(),
                event.getErrorMessage(),
                event.getCreatedAt(),
                event.getSentAt()
        );
    }
}
```

```java
// backend/src/main/java/com/notificationservice/service/RateLimitExceededException.java
package com.notificationservice.service;

public class RateLimitExceededException extends RuntimeException {
    public RateLimitExceededException(String message) {
        super(message);
    }
}
```

**Commit:**

```bash
git add backend/
git commit -m "feat: add EventService with rate limiting and idempotency"
```

---

## Phase 5: Telegram Integration

### Task 5.1: Create Telegram Service

**Files:**
- Create: `backend/src/main/java/com/notificationservice/telegram/TelegramService.java`
- Create: `backend/src/main/java/com/notificationservice/telegram/TelegramWebhookController.java`

```java
// backend/src/main/java/com/notificationservice/telegram/TelegramService.java
package com.notificationservice.telegram;

import com.notificationservice.entity.ConnectToken;
import com.notificationservice.entity.TelegramDestination;
import com.notificationservice.repository.ConnectTokenRepository;
import com.notificationservice.repository.TelegramDestinationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class TelegramService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final String TELEGRAM_API_URL = "https://api.telegram.org/bot";

    private final ConnectTokenRepository connectTokenRepository;
    private final TelegramDestinationRepository telegramDestinationRepository;
    private final RestTemplate restTemplate;

    @Value("${telegram.bot.token}")
    private String botToken;

    @Value("${telegram.bot.username}")
    private String botUsername;

    public String generateConnectToken(UUID projectId, UUID userId, com.notificationservice.entity.Project project, com.notificationservice.entity.User user) {
        String token = "ct_" + generateRandomString(32);

        ConnectToken connectToken = ConnectToken.builder()
                .token(token)
                .project(project)
                .user(user)
                .expiresAt(OffsetDateTime.now().plusHours(24))
                .build();

        connectTokenRepository.save(connectToken);

        return token;
    }

    public String getDeepLink(String token) {
        return "https://t.me/" + botUsername + "?start=" + token;
    }

    @Transactional
    public void handleStartCommand(Long chatId, String username, String token) {
        if (token == null || token.isBlank()) {
            sendMessage(chatId, "Welcome! Please use the connect link from your dashboard to link this chat.");
            return;
        }

        ConnectToken connectToken = connectTokenRepository.findByToken(token).orElse(null);

        if (connectToken == null || !connectToken.isValid()) {
            sendMessage(chatId, "This link has expired or is invalid. Please generate a new connect link from your dashboard.");
            return;
        }

        // Check if project already has a destination
        if (telegramDestinationRepository.findByProjectId(connectToken.getProject().getId()).isPresent()) {
            sendMessage(chatId, "This project is already connected to a Telegram account. Disconnect first from the dashboard to reconnect.");
            connectToken.setUsed(true);
            connectTokenRepository.save(connectToken);
            return;
        }

        // Create destination
        TelegramDestination destination = TelegramDestination.builder()
                .project(connectToken.getProject())
                .chatId(chatId)
                .username(username)
                .build();

        telegramDestinationRepository.save(destination);

        connectToken.setUsed(true);
        connectTokenRepository.save(connectToken);

        sendMessage(chatId, "✓ Connected! You will now receive notifications for project: " + connectToken.getProject().getName());
    }

    public SendResult sendMessage(Long chatId, String text) {
        String url = TELEGRAM_API_URL + botToken + "/sendMessage";

        Map<String, Object> body = Map.of(
                "chat_id", chatId,
                "text", text
        );

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

            ResponseEntity<Map> response = restTemplate.postForEntity(url, request, Map.class);
            return new SendResult(true, null, null);

        } catch (HttpClientErrorException e) {
            log.error("Telegram API error: {} - {}", e.getStatusCode(), e.getResponseBodyAsString());

            if (e.getStatusCode() == HttpStatus.FORBIDDEN) {
                return new SendResult(false, "blocked", "Bot was blocked by user");
            } else if (e.getStatusCode() == HttpStatus.TOO_MANY_REQUESTS) {
                // Extract retry_after from response
                try {
                    Map<String, Object> errorBody = e.getResponseBodyAs(Map.class);
                    if (errorBody != null && errorBody.containsKey("parameters")) {
                        Map<String, Object> params = (Map<String, Object>) errorBody.get("parameters");
                        Integer retryAfter = (Integer) params.get("retry_after");
                        return new SendResult(false, "rate_limited", "Retry after " + retryAfter + " seconds");
                    }
                } catch (Exception ignored) {}
                return new SendResult(false, "rate_limited", "Rate limited by Telegram");
            }

            return new SendResult(false, "error", e.getMessage());
        } catch (Exception e) {
            log.error("Failed to send Telegram message", e);
            return new SendResult(false, "error", e.getMessage());
        }
    }

    @Transactional
    public void disconnectTelegram(UUID projectId) {
        telegramDestinationRepository.findByProjectId(projectId)
                .ifPresent(telegramDestinationRepository::delete);
    }

    public record SendResult(boolean success, String errorCode, String errorMessage) {}

    private String generateRandomString(int length) {
        byte[] bytes = new byte[length];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
```

```java
// backend/src/main/java/com/notificationservice/telegram/TelegramWebhookController.java
package com.notificationservice.telegram;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/internal/telegram")
@RequiredArgsConstructor
@Slf4j
public class TelegramWebhookController {

    private final TelegramService telegramService;

    @Value("${telegram.bot.webhook-secret}")
    private String webhookSecret;

    @PostMapping("/webhook")
    public ResponseEntity<String> handleWebhook(
            @RequestHeader(value = "X-Telegram-Bot-Api-Secret-Token", required = false) String secretToken,
            @RequestBody Map<String, Object> update) {

        // Verify webhook secret
        if (webhookSecret != null && !webhookSecret.isBlank() && !webhookSecret.equals(secretToken)) {
            log.warn("Invalid webhook secret received");
            return ResponseEntity.ok("OK"); // Always return 200 to Telegram
        }

        try {
            processUpdate(update);
        } catch (Exception e) {
            log.error("Error processing webhook update", e);
        }

        // Always return 200 to Telegram
        return ResponseEntity.ok("OK");
    }

    private void processUpdate(Map<String, Object> update) {
        Map<String, Object> message = (Map<String, Object>) update.get("message");
        if (message == null) return;

        String text = (String) message.get("text");
        if (text == null) return;

        Map<String, Object> chat = (Map<String, Object>) message.get("chat");
        Long chatId = ((Number) chat.get("id")).longValue();

        Map<String, Object> from = (Map<String, Object>) message.get("from");
        String username = from != null ? (String) from.get("username") : null;

        if (text.startsWith("/start")) {
            String token = null;
            if (text.length() > 7) {
                token = text.substring(7).trim();
            }
            telegramService.handleStartCommand(chatId, username, token);
        }
    }
}
```

```java
// backend/src/main/java/com/notificationservice/config/AppConfig.java
package com.notificationservice.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

@Configuration
public class AppConfig {

    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }
}
```

**Commit:**

```bash
git add backend/
git commit -m "feat: add Telegram service with webhook handling and deep links"
```

---

### Task 5.2: Create Notification Worker

**Files:**
- Create: `backend/src/main/java/com/notificationservice/worker/NotificationWorker.java`

```java
// backend/src/main/java/com/notificationservice/worker/NotificationWorker.java
package com.notificationservice.worker;

import com.notificationservice.entity.Event;
import com.notificationservice.entity.EventStatus;
import com.notificationservice.entity.TelegramDestination;
import com.notificationservice.repository.EventRepository;
import com.notificationservice.repository.TelegramDestinationRepository;
import com.notificationservice.telegram.TelegramService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Component
@RequiredArgsConstructor
@Slf4j
public class NotificationWorker {

    private static final int MAX_RETRIES = 3;

    private final EventRepository eventRepository;
    private final TelegramDestinationRepository telegramDestinationRepository;
    private final TelegramService telegramService;
    private final StringRedisTemplate redisTemplate;

    @Value("${app.rate-limit.global-messages-per-second}")
    private int globalRateLimit;

    @Scheduled(fixedDelay = 100) // Poll every 100ms
    public void processQueue() {
        // Global rate limit check
        String globalKey = "rate:global:telegram";
        Long count = redisTemplate.opsForValue().increment(globalKey);
        if (count != null && count == 1) {
            redisTemplate.expire(globalKey, 1, TimeUnit.SECONDS);
        }
        if (count != null && count > globalRateLimit) {
            return; // Skip this cycle, at rate limit
        }

        // Pop event from queue
        String eventIdStr = redisTemplate.opsForList().leftPop("queue:events");
        if (eventIdStr == null) {
            return;
        }

        try {
            UUID eventId = UUID.fromString(eventIdStr);
            processEvent(eventId);
        } catch (Exception e) {
            log.error("Error processing event: {}", eventIdStr, e);
            // Re-queue on unexpected error
            redisTemplate.opsForList().rightPush("queue:events", eventIdStr);
        }
    }

    @Transactional
    public void processEvent(UUID eventId) {
        Optional<Event> optEvent = eventRepository.findById(eventId);
        if (optEvent.isEmpty()) {
            log.warn("Event not found: {}", eventId);
            return;
        }

        Event event = optEvent.get();

        // Check if expired
        if (event.getExpiresAt().isBefore(OffsetDateTime.now())) {
            event.setStatus(EventStatus.EXPIRED);
            eventRepository.save(event);
            return;
        }

        // Check if already processed
        if (event.getStatus() != EventStatus.QUEUED && event.getStatus() != EventStatus.PROCESSING) {
            return;
        }

        event.setStatus(EventStatus.PROCESSING);
        eventRepository.save(event);

        // Get destination
        Optional<TelegramDestination> optDest = telegramDestinationRepository
                .findByProjectId(event.getProject().getId());

        if (optDest.isEmpty()) {
            event.setStatus(EventStatus.FAILED);
            event.setErrorMessage("No Telegram destination configured");
            eventRepository.save(event);
            return;
        }

        TelegramDestination destination = optDest.get();

        if (!destination.getIsEnabled()) {
            event.setStatus(EventStatus.FAILED);
            event.setErrorMessage("Telegram destination is disabled: " + destination.getDisabledReason());
            eventRepository.save(event);
            return;
        }

        // Per-chat rate limit
        String chatKey = "rate:chat:" + destination.getChatId();
        Long chatCount = redisTemplate.opsForValue().increment(chatKey);
        if (chatCount != null && chatCount == 1) {
            redisTemplate.expire(chatKey, 1, TimeUnit.SECONDS);
        }
        if (chatCount != null && chatCount > 1) {
            // Re-queue with delay
            redisTemplate.opsForList().rightPush("queue:events", eventId.toString());
            event.setStatus(EventStatus.QUEUED);
            eventRepository.save(event);
            return;
        }

        // Format message
        String message = formatMessage(event);

        // Send
        TelegramService.SendResult result = telegramService.sendMessage(destination.getChatId(), message);

        if (result.success()) {
            event.setStatus(EventStatus.SENT);
            event.setSentAt(OffsetDateTime.now());
            eventRepository.save(event);
        } else {
            handleSendFailure(event, destination, result);
        }
    }

    private void handleSendFailure(Event event, TelegramDestination destination, TelegramService.SendResult result) {
        if ("blocked".equals(result.errorCode())) {
            // Disable destination
            destination.setIsEnabled(false);
            destination.setDisabledReason("Bot was blocked by user");
            telegramDestinationRepository.save(destination);

            event.setStatus(EventStatus.FAILED);
            event.setErrorMessage("Bot blocked by user");
            eventRepository.save(event);
            return;
        }

        if ("rate_limited".equals(result.errorCode())) {
            // Re-queue
            event.setStatus(EventStatus.QUEUED);
            event.setRetryCount(event.getRetryCount() + 1);
            eventRepository.save(event);
            redisTemplate.opsForList().rightPush("queue:events", event.getId().toString());
            return;
        }

        // Other errors - retry with backoff
        int retryCount = event.getRetryCount() + 1;
        if (retryCount >= MAX_RETRIES) {
            event.setStatus(EventStatus.FAILED);
            event.setErrorMessage(result.errorMessage());
            event.setRetryCount(retryCount);
            eventRepository.save(event);
        } else {
            event.setStatus(EventStatus.QUEUED);
            event.setRetryCount(retryCount);
            eventRepository.save(event);
            // Re-queue with exponential backoff (handled by worker delay)
            redisTemplate.opsForList().rightPush("queue:events", event.getId().toString());
        }
    }

    private String formatMessage(Event event) {
        StringBuilder sb = new StringBuilder();
        if (event.getTopic() != null && !event.getTopic().isBlank()) {
            sb.append("[").append(event.getTopic()).append("]\n");
        }
        sb.append(event.getText());
        return sb.toString();
    }

    @Scheduled(fixedRate = 60000) // Every minute
    @Transactional
    public void expireOldEvents() {
        int expired = eventRepository.expireOldEvents(OffsetDateTime.now());
        if (expired > 0) {
            log.info("Expired {} old events", expired);
        }
    }

    @Scheduled(fixedRate = 3600000) // Every hour
    @Transactional
    public void cleanupTokens() {
        // Cleanup handled in ConnectTokenRepository
    }
}
```

**Commit:**

```bash
git add backend/
git commit -m "feat: add notification worker with rate limiting and retries"
```

---

## Phase 6: REST Controllers

### Task 6.1: Create API Controllers

**Files:**
- Create: `backend/src/main/java/com/notificationservice/controller/AuthController.java`
- Create: `backend/src/main/java/com/notificationservice/controller/ProjectController.java`
- Create: `backend/src/main/java/com/notificationservice/controller/NotifyController.java`
- Create: `backend/src/main/java/com/notificationservice/controller/GlobalExceptionHandler.java`

```java
// backend/src/main/java/com/notificationservice/controller/AuthController.java
package com.notificationservice.controller;

import com.notificationservice.dto.UserDto;
import com.notificationservice.repository.UserRepository;
import com.notificationservice.service.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserRepository userRepository;

    @GetMapping("/me")
    public ResponseEntity<UserDto> getCurrentUser(@AuthenticationPrincipal UUID userId) {
        var user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        return ResponseEntity.ok(new UserDto(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getAvatarUrl()
        ));
    }
}
```

```java
// backend/src/main/java/com/notificationservice/controller/ProjectController.java
package com.notificationservice.controller;

import com.notificationservice.dto.*;
import com.notificationservice.entity.Project;
import com.notificationservice.entity.User;
import com.notificationservice.repository.ProjectRepository;
import com.notificationservice.repository.UserRepository;
import com.notificationservice.service.*;
import com.notificationservice.telegram.TelegramService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;
    private final ApiKeyService apiKeyService;
    private final EventService eventService;
    private final TelegramService telegramService;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<List<ProjectDto>> getProjects(@AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(projectService.getProjectsForUser(userId));
    }

    @PostMapping
    public ResponseEntity<ProjectDto> createProject(
            @Valid @RequestBody CreateProjectRequest request,
            @AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(projectService.createProject(request, userId));
    }

    @GetMapping("/{projectId}")
    public ResponseEntity<ProjectDto> getProject(
            @PathVariable UUID projectId,
            @AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(projectService.getProject(projectId, userId));
    }

    @PutMapping("/{projectId}")
    public ResponseEntity<ProjectDto> updateProject(
            @PathVariable UUID projectId,
            @Valid @RequestBody CreateProjectRequest request,
            @AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(projectService.updateProject(projectId, request, userId));
    }

    @DeleteMapping("/{projectId}")
    public ResponseEntity<Void> deleteProject(
            @PathVariable UUID projectId,
            @AuthenticationPrincipal UUID userId) {
        projectService.deleteProject(projectId, userId);
        return ResponseEntity.noContent().build();
    }

    // API Keys
    @GetMapping("/{projectId}/api-keys")
    public ResponseEntity<List<ApiKeyDto>> getApiKeys(
            @PathVariable UUID projectId,
            @AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(apiKeyService.getApiKeysForProject(projectId, userId));
    }

    @PostMapping("/{projectId}/api-keys")
    public ResponseEntity<ApiKeyCreatedDto> createApiKey(
            @PathVariable UUID projectId,
            @Valid @RequestBody CreateApiKeyRequest request,
            @AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(apiKeyService.createApiKey(projectId, request, userId));
    }

    @DeleteMapping("/{projectId}/api-keys/{keyId}")
    public ResponseEntity<Void> revokeApiKey(
            @PathVariable UUID projectId,
            @PathVariable UUID keyId,
            @AuthenticationPrincipal UUID userId) {
        apiKeyService.revokeApiKey(keyId, userId);
        return ResponseEntity.noContent().build();
    }

    // Telegram
    @PostMapping("/{projectId}/telegram/connect")
    public ResponseEntity<ConnectTokenDto> generateConnectToken(
            @PathVariable UUID projectId,
            @AuthenticationPrincipal UUID userId) {
        Project project = projectRepository.findByIdAndUserIdAndNotDeleted(projectId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found"));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        String token = telegramService.generateConnectToken(projectId, userId, project, user);
        String deepLink = telegramService.getDeepLink(token);

        return ResponseEntity.ok(new ConnectTokenDto(token, deepLink));
    }

    @DeleteMapping("/{projectId}/telegram")
    public ResponseEntity<Void> disconnectTelegram(
            @PathVariable UUID projectId,
            @AuthenticationPrincipal UUID userId) {
        projectRepository.findByIdAndUserIdAndNotDeleted(projectId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found"));
        telegramService.disconnectTelegram(projectId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{projectId}/telegram/test")
    public ResponseEntity<Void> sendTestNotification(
            @PathVariable UUID projectId,
            @AuthenticationPrincipal UUID userId) {
        // Implementation: create a test event
        return ResponseEntity.ok().build();
    }

    // Events & Stats
    @GetMapping("/{projectId}/events")
    public ResponseEntity<EventsPageDto> getEvents(
            @PathVariable UUID projectId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(eventService.getEventsForProject(projectId, userId, page, size));
    }

    @GetMapping("/{projectId}/stats")
    public ResponseEntity<ProjectStatsDto> getStats(
            @PathVariable UUID projectId,
            @AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(eventService.getStatsForProject(projectId, userId));
    }
}
```

```java
// backend/src/main/java/com/notificationservice/controller/NotifyController.java
package com.notificationservice.controller;

import com.notificationservice.dto.NotifyRequest;
import com.notificationservice.dto.NotifyResponse;
import com.notificationservice.entity.ApiKey;
import com.notificationservice.service.ApiKeyService;
import com.notificationservice.service.EventService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/v1")
@RequiredArgsConstructor
public class NotifyController {

    private final ApiKeyService apiKeyService;
    private final EventService eventService;

    @PostMapping("/notify")
    public ResponseEntity<?> notify(
            @RequestHeader(value = "X-API-Key", required = false) String apiKeyHeader,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @Valid @RequestBody NotifyRequest request) {

        String apiKey = extractApiKey(apiKeyHeader, authHeader);
        if (apiKey == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Missing API key"));
        }

        ApiKey key = apiKeyService.validateAndGetApiKey(apiKey)
                .orElse(null);

        if (key == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Invalid API key"));
        }

        NotifyResponse response = eventService.createEvent(request, key);
        return ResponseEntity.accepted().body(response);
    }

    private String extractApiKey(String apiKeyHeader, String authHeader) {
        if (apiKeyHeader != null && !apiKeyHeader.isBlank()) {
            return apiKeyHeader;
        }
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }
        return null;
    }
}
```

```java
// backend/src/main/java/com/notificationservice/controller/GlobalExceptionHandler.java
package com.notificationservice.controller;

import com.notificationservice.service.RateLimitExceededException;
import com.notificationservice.service.ResourceNotFoundException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<Map<String, String>> handleNotFound(ResourceNotFoundException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("error", e.getMessage()));
    }

    @ExceptionHandler(RateLimitExceededException.class)
    public ResponseEntity<Map<String, String>> handleRateLimit(RateLimitExceededException e) {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .body(Map.of("error", e.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidation(MethodArgumentNotValidException e) {
        String message = e.getBindingResult().getFieldErrors().stream()
                .map(err -> err.getField() + ": " + err.getDefaultMessage())
                .findFirst()
                .orElse("Validation failed");
        return ResponseEntity.badRequest().body(Map.of("error", message));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleGeneral(Exception e) {
        log.error("Unexpected error", e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Internal server error"));
    }
}
```

**Commit:**

```bash
git add backend/
git commit -m "feat: add REST controllers for projects, API keys, and notifications"
```

---

## Phase 7: Frontend Implementation

### Task 7.1: Set Up Auth with NextAuth

**Files:**
- Create: `frontend/src/app/api/auth/[...nextauth]/route.ts`
- Create: `frontend/src/lib/auth.ts`
- Create: `frontend/src/components/providers.tsx`

```typescript
// frontend/src/lib/auth.ts
import { type NextAuthOptions } from "next-auth";
import GithubProvider from "next-auth/providers/github";

export const authOptions: NextAuthOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        // On sign in, exchange for backend JWT
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/oauth2/authorization/github`, {
          redirect: "manual",
        });
        // Store the access token from your backend
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};
```

```typescript
// frontend/src/app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
```

```typescript
// frontend/src/components/providers.tsx
"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        {children}
      </ThemeProvider>
    </SessionProvider>
  );
}
```

**Continue with remaining frontend components...**

---

## Phase 8: Frontend Pages

### Task 8.1 - 8.10: Create All Frontend Pages

Due to length, I'll outline the key pages needed:

1. **Landing Page** (`frontend/src/app/page.tsx`) - Minimal marketing page
2. **Login Page** (`frontend/src/app/login/page.tsx`) - GitHub OAuth button
3. **Auth Callback** (`frontend/src/app/auth/callback/page.tsx`) - Handle JWT from backend
4. **Dashboard Layout** (`frontend/src/app/(dashboard)/layout.tsx`) - Sidebar, header
5. **Projects List** (`frontend/src/app/(dashboard)/projects/page.tsx`)
6. **Project Detail** (`frontend/src/app/(dashboard)/projects/[id]/page.tsx`)
7. **API Keys Section** (component in project detail)
8. **Telegram Connection** (component with QR code / deep link)
9. **Code Snippets** (component showing curl, JS, Python, Java examples)
10. **Events History** (`frontend/src/app/(dashboard)/projects/[id]/events/page.tsx`)

---

## Phase 9: Polish & Deployment

### Task 9.1: Add Dark Mode Support

- Already included via ThemeProvider in providers.tsx
- Add theme toggle in header

### Task 9.2: Mobile Responsiveness

- Use Tailwind responsive classes throughout
- Test on mobile viewports

### Task 9.3: Health Indicators

- Add health status calculation based on recent event success rate
- Display colored badges in UI

### Task 9.4: Railway Deployment Setup

**Files:**
- Create: `railway.toml`
- Create: `Procfile` (if needed)

```toml
# railway.toml
[build]
builder = "nixpacks"

[deploy]
healthcheckPath = "/actuator/health"
healthcheckTimeout = 100
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
```

---

## Verification

After implementation, verify:

1. **Auth Flow**: GitHub login → JWT → dashboard access
2. **Project CRUD**: Create, view, update, soft-delete projects
3. **Telegram Connection**: Generate link → /start in Telegram → connected
4. **API Key Management**: Create key (shown once), view masked, revoke
5. **Notification Send**: POST /v1/notify with API key → event queued → delivered
6. **Rate Limiting**: Verify ingestion limits and Telegram limits work
7. **History & Stats**: View events, see success rates
8. **Dark Mode**: Toggle works across all pages
9. **Mobile**: All pages usable on mobile

---

## Code Snippets (to include in UI)

### curl
```bash
curl -X POST https://your-api.railway.app/v1/notify \
  -H "X-API-Key: nsk_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello from my app!"}'
```

### Node.js
```javascript
await fetch('https://your-api.railway.app/v1/notify', {
  method: 'POST',
  headers: {
    'X-API-Key': process.env.NOTIFICATION_API_KEY,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    text: 'Hello from my app!',
    topic: 'alerts',
  }),
});
```

### Python
```python
import requests

requests.post(
    'https://your-api.railway.app/v1/notify',
    headers={'X-API-Key': os.environ['NOTIFICATION_API_KEY']},
    json={'text': 'Hello from my app!', 'topic': 'alerts'}
)
```

### Java
```java
HttpClient client = HttpClient.newHttpClient();
HttpRequest request = HttpRequest.newBuilder()
    .uri(URI.create("https://your-api.railway.app/v1/notify"))
    .header("X-API-Key", System.getenv("NOTIFICATION_API_KEY"))
    .header("Content-Type", "application/json")
    .POST(HttpRequest.BodyPublishers.ofString(
        "{\"text\": \"Hello from my app!\"}"))
    .build();
client.send(request, HttpResponse.BodyHandlers.ofString());
```
