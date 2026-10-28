import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '@siteguard/database';
import type { UserRole } from '@siteguard/shared';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role?: UserRole;
  organizationId?: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthenticatedUser;
    organization?: {
      id: string;
      name: string;
      slug: string;
      role: UserRole;
    };
  }
}

/**
 * Tenant Isolation & Auth Middleware:
 * Resolves current user and verifies user belongs to :orgId with the required role.
 */
export async function authenticateAndAuthorize(
  req: FastifyRequest,
  reply: FastifyReply,
  requiredRoles: UserRole[] = ['owner', 'admin', 'operator', 'viewer']
) {
  // In dev / MVP mode, allow authorization header or explicit headers, default to seed owner
  const authHeader = req.headers.authorization;
  const headerUserId = req.headers['x-user-id'] as string | undefined;
  const headerEmail = req.headers['x-user-email'] as string | undefined;

  let userWhere: any = { email: 'alex@apexweb.com' };

  if (headerUserId) {
    userWhere = { id: headerUserId };
  } else if (headerEmail) {
    userWhere = { email: headerEmail };
  } else if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    if (token.includes('@')) {
      userWhere = { email: token };
    } else {
      userWhere = { id: token };
    }
  }

  const user = await prisma.user.findFirst({
    where: userWhere,
    include: { memberships: { include: { organization: true } } },
  });

  if (!user) {
    return reply.status(401).send({
      error: { code: 'UNAUTHENTICATED', message: 'Valid user authentication required.' },
    });
  }

  const params = req.params as { orgId?: string };
  const requestedOrgId = params.orgId;

  if (requestedOrgId) {
    const membership = user.memberships.find(
      (m) => m.organizationId === requestedOrgId || m.organization.slug === requestedOrgId
    );

    if (!membership) {
      // 404 / 403 to prevent cross-tenant discovery
      return reply.status(404).send({
        error: { code: 'ORGANIZATION_NOT_FOUND', message: 'Organization not found or access denied.' },
      });
    }

    if (!requiredRoles.includes(membership.role as UserRole)) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Insufficient role permissions for this operation.' },
      });
    }

    req.organization = {
      id: membership.organization.id,
      name: membership.organization.name,
      slug: membership.organization.slug,
      role: membership.role as UserRole,
    };
  }

  req.user = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: req.organization?.role,
    organizationId: req.organization?.id,
  };
}
