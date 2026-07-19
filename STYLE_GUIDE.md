# ACG Style Guide

This document defines the coding standards, conventions, and best practices for the ACG codebase.

## TypeScript

### Configuration

- Target: `ES2022`
- Module: `NodeNext`
- Strict mode: `true`
- No `any` types (use `unknown` if needed)
- No `var` (use `const` or `let`)
- No `enum` (use `as const` objects)

### Naming Conventions

| Element | Convention | Example |
|---|---|---|
| Variables | camelCase | `apiKey`, `policyEngine` |
| Functions | camelCase | `validatePolicy()`, `createApiKey()` |
| Classes | PascalCase | `PolicyEngine`, `ApiKeyService` |
| Interfaces | PascalCase (no `I` prefix) | `Policy`, `ApiKey` |
| Types | PascalCase | `PolicyResult`, `CompliancePack` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_RETRY_ATTEMPTS`, `DEFAULT_TIMEOUT` |
| Files | kebab-case | `policy-engine.ts`, `api-key.service.ts` |
| Directories | kebab-case | `policy-engine/`, `api-keys/` |

### Imports

```typescript
// External packages first
import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';

// Internal packages
import { PolicyEngine } from '@acg/kernel';

// Local modules
import { validateApiKey } from './api-key.service.js';
import { Policy } from './types.js';
```

### Error Handling

```typescript
// Use custom error classes
export class PolicyViolationError extends Error {
  constructor(
    public readonly rule: string,
    public readonly reason: string,
    public readonly pack: string,
  ) {
    super(`Policy violation: ${rule}`);
    this.name = 'PolicyViolationError';
  }
}

// Always handle errors at boundaries
try {
  const result = await policyEngine.evaluate(request);
} catch (error) {
  if (error instanceof PolicyViolationError) {
    return { allowed: false, reason: error.reason };
  }
  throw error; // Re-throw unexpected errors
}
```

### Async/Await

```typescript
// Always use async/await, not .then() chains
async function getUser(id: string): Promise<User> {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new NotFoundError('User not found');
  return user;
}

// Parallel operations
const [users, policies] = await Promise.all([
  prisma.user.findMany(),
  prisma.policy.findMany(),
]);
```

## React (Dashboard)

### Component Structure

```typescript
// Function components only (no class components)
export function PolicyList({ policies }: PolicyListProps) {
  const [loading, setLoading] = useState(false);

  return (
    <div className="space-y-4">
      {policies.map((policy) => (
        <PolicyCard key={policy.id} policy={policy} />
      ))}
    </div>
  );
}

// Props interface with explicit types
interface PolicyListProps {
  policies: Policy[];
  onSelect?: (policy: Policy) => void;
}
```

### Hooks

```typescript
// Custom hooks prefixed with 'use'
export function usePolicies() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPolicies().then(setPolicies).finally(() => setLoading(false));
  }, []);

  return { policies, loading };
}
```

### State Management

- Local state: `useState`
- Server state: `@tanstack/react-query`
- Global state: `zustand` (minimal usage)

## React Native (Mobile)

### Navigation

```typescript
// Screen components with proper typing
export function PatientListScreen({ navigation }: PatientListProps) {
  return (
    <View>
      <Text>Patient List</Text>
    </View>
  );
}

interface PatientListProps {
  navigation: NativeStackNavigationProp<RootStackParamList, 'PatientList'>;
}
```

### Styling

```typescript
// StyleSheet for performance
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
});
```

## NestJS (Backend)

### Module Structure

```typescript
// Feature module
@Module({
  imports: [PrismaModule],
  controllers: [PolicyController],
  providers: [PolicyService, PolicyRepository],
  exports: [PolicyService],
})
export class PolicyModule {}
```

### Controllers

```typescript
@Controller('policies')
@UseGuards(AuthGuard)
export class PolicyController {
  constructor(private readonly policyService: PolicyService) {}

  @Get()
  async findAll(): Promise<Policy[]> {
    return this.policyService.findAll();
  }

  @Post()
  @Roles('admin')
  async create(@Body() dto: CreatePolicyDto): Promise<Policy> {
    return this.policyService.create(dto);
  }
}
```

### Services

```typescript
@Injectable()
export class PolicyService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Policy[]> {
    return this.prisma.policy.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }
}
```

## Testing

### Unit Tests

```typescript
describe('PolicyEngine', () => {
  let engine: PolicyEngine;

  beforeEach(() => {
    engine = new PolicyEngine();
  });

  it('should deny requests that violate policy', async () => {
    const request = { content: 'SSN: 123-45-6789' };
    const result = await engine.evaluate(request, { pack: 'hipaa' });

    expect(result.allowed).toBe(false);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].rule).toBe('no-ssn-exposure');
  });
});
```

### Integration Tests

```typescript
describe('POST /chat/completions', () => {
  it('should return 401 without API key', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/chat/completions',
      payload: { model: 'gpt-4o-mini', messages: [] },
    });

    expect(response.statusCode).toBe(401);
  });
});
```

## Documentation

### Code Comments

```typescript
/**
 * Evaluates a request against compliance policies.
 *
 * @param request - The incoming request to evaluate
 * @param options - Evaluation options including pack selection
 * @returns Evaluation result with allowed/denied status and violations
 *
 * @example
 * ```typescript
 * const result = await engine.evaluate(request, { pack: 'hipaa' });
 * if (!result.allowed) {
 *   console.log('Blocked:', result.violations);
 * }
 * ```
 */
async function evaluate(request: Request, options: EvaluateOptions): Promise<EvaluateResult> {
  // ...
}
```

### README Files

Every package must have a `README.md` with:
1. Package name and description
2. Installation instructions
3. Usage examples
4. API reference
5. Development instructions

## Git

### Commit Messages

```
feat: add HIPAA compliance pack
fix: resolve policy engine timeout
docs: update API reference
refactor: extract policy evaluation logic
test: add unit tests for RBAC
chore: update dependencies
```

### Branch Naming

```
feat/hipaa-compliance-pack
fix/policy-engine-timeout
docs/api-reference-update
refactor/policy-evaluation
```

## Pull Requests

### Title

```
feat: add HIPAA compliance pack
```

### Description

```markdown
## What

Add HIPAA compliance pack with 8 Rego rules.

## Why

Healthcare customers need HIPAA compliance for AI workloads.

## How

- Added 8 Rego rules for PHI detection
- Added unit tests for all rules
- Updated documentation

## Testing

- [x] Unit tests pass
- [x] Integration tests pass
- [x] Manual testing with sample data

## Checklist

- [x] Code follows style guide
- [x] Tests added/updated
- [x] Documentation updated
- [x] No breaking changes
```
