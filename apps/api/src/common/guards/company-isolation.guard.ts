import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';

/**
 * CompanyIsolationGuard
 * 
 * Ensures strict multi-tenant data isolation by validating that:
 * 1. User belongs to a company
 * 2. Resource being accessed belongs to the same company
 * 3. Unauthorized access returns 403 Forbidden
 * 
 * Usage:
 * @UseGuards(JwtAuthGuard, CompanyIsolationGuard)
 * @CheckCompanyResource('contact') // Specify resource type
 * 
 * Supported resources:
 * - contact, campaign, script, prompt, knowledge, ai-agent, call, etc.
 */
@Injectable()
export class CompanyIsolationGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as any;

    // Must be authenticated
    if (!user || !user.companyId) {
      throw new UnauthorizedException('User must be authenticated with a valid company');
    }

    // Get resource type from decorator
    const resourceType = this.reflector.get<string>(
      'companyResource',
      context.getHandler(),
    );

    // If no resource type specified, skip validation (assumes controller handles it)
    if (!resourceType) {
      return true;
    }

    // Get resource ID from params
    const resourceId = request.params.id;

    // If no ID in params, this might be a list/create operation
    // List operations should filter by companyId in service
    // Create operations should use companyId from user
    if (!resourceId) {
      return true;
    }

    // Verify resource belongs to user's company
    await this.verifyResourceOwnership(
      user.companyId,
      resourceType,
      resourceId,
      user,
    );

    return true;
  }

  private async verifyResourceOwnership(
    userCompanyId: string,
    resourceType: string,
    resourceId: string,
    user: any,
  ): Promise<void> {
    let resource: any;

    switch (resourceType) {
      case 'contact':
        resource = await this.prisma.contact.findUnique({
          where: { id: resourceId },
          select: { companyId: true, deletedAt: true },
        });
        break;

      case 'campaign':
        resource = await this.prisma.campaign.findUnique({
          where: { id: resourceId },
          select: { companyId: true, deletedAt: true },
        });
        break;

      case 'script':
        resource = await this.prisma.script.findUnique({
          where: { id: resourceId },
          select: { companyId: true, deletedAt: true },
        });
        break;

      case 'prompt':
        resource = await this.prisma.prompt.findUnique({
          where: { id: resourceId },
          select: { companyId: true, deletedAt: true },
        });
        break;

      case 'knowledge-base':
        resource = await this.prisma.knowledgeBase.findUnique({
          where: { id: resourceId },
          select: { companyId: true, deletedAt: true },
        });
        break;

      case 'ai-agent':
        resource = await this.prisma.aIAgent.findUnique({
          where: { id: resourceId },
          select: { companyId: true },
        });
        break;

      case 'call':
        resource = await this.prisma.call.findFirst({
          where: { id: resourceId },
          include: { campaign: { select: { companyId: true } } },
        });
        
        if (resource) {
          resource = { companyId: resource.campaign?.companyId };
        }
        break;

      case 'analytics':
        resource = await this.prisma.analytics.findUnique({
          where: { id: resourceId },
          select: { companyId: true },
        });
        break;

      case 'voice-profile':
        resource = await this.prisma.voiceProfile.findUnique({
          where: { id: resourceId },
          select: { companyId: true, deletedAt: true },
        });
        break;

      case 'telephony-profile':
        resource = await this.prisma.telephonyProfile.findUnique({
          where: { id: resourceId },
          select: { companyId: true, deletedAt: true },
        });
        break;

      case 'agent-session':
        resource = await this.prisma.agentSession.findUnique({
          where: { id: resourceId },
          select: { companyId: true },
        });
        break;

      case 'knowledge-document':
        resource = await this.prisma.knowledgeDocument.findUnique({
          where: { id: resourceId },
          select: { companyId: true, deletedAt: true },
        });
        break;

      case 'knowledge-entry':
        resource = await this.prisma.knowledgeEntry.findUnique({
          where: { id: resourceId },
          select: { companyId: true },
        });
        break;

      default:
        // For unknown resource types, allow but log warning
        console.warn(`[CompanyIsolationGuard] Unknown resource type: ${resourceType}`);
        return;
    }

    // Resource not found
    if (!resource) {
      throw new ForbiddenException('Resource not found or access denied');
    }

    // Check if resource is deleted (soft delete)
    if (resource.deletedAt !== undefined && resource.deletedAt !== null) {
      throw new ForbiddenException('Resource has been deleted');
    }

    // Super admin can access all resources
    const isSuperAdmin = user.roles?.some((role: any) => 
      role.slug === 'super-admin' || role === 'super-admin'
    );

    if (isSuperAdmin) {
      return; // Allow access
    }

    // Verify company ownership
    if (resource.companyId !== userCompanyId) {
      throw new ForbiddenException(
        'Access denied: Resource belongs to another company',
      );
    }
  }
}
