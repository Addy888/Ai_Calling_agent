import { SetMetadata } from '@nestjs/common';

/**
 * CheckCompanyResource Decorator
 * 
 * Marks a route handler to enforce company isolation for a specific resource type.
 * Used in conjunction with CompanyIsolationGuard.
 * 
 * @param resourceType - The type of resource to check (e.g., 'contact', 'campaign', 'script')
 * 
 * @example
 * ```typescript
 * @Get(':id')
 * @UseGuards(JwtAuthGuard, CompanyIsolationGuard)
 * @CheckCompanyResource('contact')
 * async findOne(@Param('id') id: string, @Req() req: Request) {
 *   // Company isolation automatically enforced
 *   return this.contactsService.findOne(id);
 * }
 * ```
 */
export const CheckCompanyResource = (resourceType: string) => 
  SetMetadata('companyResource', resourceType);

/**
 * GetCompanyId Decorator
 * 
 * Extracts the companyId from the authenticated user.
 * 
 * @example
 * ```typescript
 * @Get()
 * async findAll(@GetCompanyId() companyId: string) {
 *   return this.contactsService.findAll(companyId);
 * }
 * ```
 */
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const GetCompanyId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    
    if (!user || !user.companyId) {
      throw new Error('User companyId not found in request context');
    }
    
    return user.companyId;
  },
);

/**
 * GetUser Decorator
 * 
 * Extracts the full user object from the authenticated request.
 * 
 * @example
 * ```typescript
 * @Post()
 * async create(@GetUser() user: any, @Body() dto: CreateDto) {
 *   return this.service.create(user.companyId, user.id, dto);
 * }
 * ```
 */
export const GetUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
