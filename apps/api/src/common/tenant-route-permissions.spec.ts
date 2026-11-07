import { ForbiddenException, RequestMethod, type ExecutionContext } from '@nestjs/common';
import { METHOD_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { tenantAccessRoles, roleHasPermission, type AccessPermission } from '@telpen/domain';
import { describe, expect, it } from 'vitest';

import { AdvertsController } from '../modules/adverts/adverts.controller';
import { AnalyticsController } from '../modules/analytics/analytics.controller';
import { ConversationsController } from '../modules/conversations/conversations.controller';
import { LeadsController } from '../modules/leads/leads.controller';
import { NotificationsController } from '../modules/notifications/notifications.controller';
import { ProfilesController } from '../modules/profiles/profiles.controller';
import { RelationshipsController } from '../modules/relationships/relationships.controller';
import { SourceFinderController } from '../modules/source-finder/source-finder.controller';
import { TENANT_PERMISSION_KEY, TenantPermissionGuard } from './tenant-permission.guard';

type Handler = (...args: never[]) => unknown;
type ControllerClass = { name: string; prototype: object };

const tenantControllers: ControllerClass[] = [
  AdvertsController,
  AnalyticsController,
  ConversationsController,
  LeadsController,
  NotificationsController,
  ProfilesController,
  RelationshipsController,
  SourceFinderController,
];

/**
 * Tenant write routes that any signed-in team member may call on purpose:
 * browsing signals and a read-only preview. Everything else that writes must
 * name the permission it needs (owner standing rule, 02/11/26: least privilege,
 * enforced on the server).
 */
const writesOpenToEveryRole = new Set([
  'AdvertsController.recordDiscoveryEvent',
  'AdvertsController.previewDraft',
  'AnalyticsController.recordEvent',
  'ProfilesController.previewDraft',
  'ProfilesController.reviewDraft',
  'SourceFinderController.search',
  'SourceFinderController.explain',
]);

const reflector = new Reflector();

function handlers(controller: ControllerClass): Array<{ name: string; handler: Handler }> {
  return Object.getOwnPropertyNames(controller.prototype)
    .filter((name) => name !== 'constructor')
    .map((name) => ({
      name,
      handler: (controller.prototype as Record<string, Handler>)[name] as Handler,
    }))
    .filter(({ handler }) => typeof handler === 'function' && Reflect.getMetadata(METHOD_METADATA, handler) !== undefined);
}

function requiredPermission(handler: Handler): AccessPermission | undefined {
  return reflector.get<AccessPermission | undefined>(TENANT_PERMISSION_KEY, handler);
}

function contextFor(handler: Handler, role: string, controller: ControllerClass): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => controller,
    switchToHttp: () => ({ getRequest: () => ({ authSession: { role } }) }),
  } as unknown as ExecutionContext;
}

describe('tenant route permissions (least privilege on the server)', () => {
  it('every tenant write route names the permission it needs', () => {
    const missing: string[] = [];
    for (const controller of tenantControllers) {
      for (const { name, handler } of handlers(controller)) {
        const method = Reflect.getMetadata(METHOD_METADATA, handler) as RequestMethod;
        const key = `${controller.name}.${name}`;
        if (method === RequestMethod.GET || writesOpenToEveryRole.has(key)) continue;
        if (!requiredPermission(handler)) missing.push(key);
      }
    }
    expect(missing).toEqual([]);
  });

  const expectations: Array<[ControllerClass, string, AccessPermission]> = [
    [LeadsController, 'listLeads', 'MANAGE_LEADS'],
    [LeadsController, 'updateLeadStatus', 'MANAGE_LEADS'],
    [LeadsController, 'createInquiry', 'CHAT_WITH_LEADS'],
    [ConversationsController, 'listConversations', 'CHAT_WITH_LEADS'],
    [ConversationsController, 'listMessages', 'CHAT_WITH_LEADS'],
    [ConversationsController, 'sendMessage', 'CHAT_WITH_LEADS'],
    [ConversationsController, 'assignConversation', 'MANAGE_LEADS'],
    [RelationshipsController, 'createClaim', 'EDIT_PROFILE'],
    [RelationshipsController, 'decideClaim', 'EDIT_PROFILE'],
    [SourceFinderController, 'rebuildIndex', 'MANAGE_PLATFORM'],
    [NotificationsController, 'updatePreferences', 'MANAGE_TENANT'],
    [AnalyticsController, 'exportTenantReport', 'VIEW_ANALYTICS'],
    [AnalyticsController, 'summarizeTenant', 'VIEW_ANALYTICS'],
    [AdvertsController, 'runLifecycle', 'MANAGE_LISTINGS'],
    [AdvertsController, 'rebuildDiscoveryIndex', 'MANAGE_LISTINGS'],
  ];

  it('each route requires its department permission and refuses roles without it', () => {
    const guard = new TenantPermissionGuard(reflector);
    for (const [controller, method, permission] of expectations) {
      const handler = (controller.prototype as Record<string, Handler>)[method] as Handler;
      expect(requiredPermission(handler), `${controller.name}.${method}`).toBe(permission);

      for (const role of tenantAccessRoles) {
        if (roleHasPermission(role, permission)) {
          expect(guard.canActivate(contextFor(handler, role, controller))).toBe(true);
        } else {
          expect(() => guard.canActivate(contextFor(handler, role, controller)), `${role} on ${method}`).toThrow(
            ForbiddenException,
          );
        }
      }
    }
  });

  it('no business role can rebuild the platform-wide Source Finder index', () => {
    const guard = new TenantPermissionGuard(reflector);
    const handler = SourceFinderController.prototype.rebuildIndex as unknown as Handler;
    for (const role of tenantAccessRoles) {
      expect(() => guard.canActivate(contextFor(handler, role, SourceFinderController))).toThrow(
        ForbiddenException,
      );
    }
  });

  it('a read-only viewer cannot read leads, conversations or analytics', () => {
    const guard = new TenantPermissionGuard(reflector);
    const routes: Array<[ControllerClass, string]> = [
      [LeadsController, 'listLeads'],
      [ConversationsController, 'listConversations'],
      [AnalyticsController, 'exportTenantReport'],
    ];
    for (const [controller, method] of routes) {
      const handler = (controller.prototype as Record<string, Handler>)[method] as Handler;
      expect(() => guard.canActivate(contextFor(handler, 'READ_ONLY_VIEWER', controller))).toThrow(
        ForbiddenException,
      );
    }
  });
});
