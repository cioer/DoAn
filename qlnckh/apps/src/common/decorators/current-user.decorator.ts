import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as { id?: string; email?: string; role?: string; facultyId?: string | null } | undefined;

    // If data is provided (e.g., @CurrentUser('id')), return that specific property
    // Otherwise, return the entire user object
    return data ? user?.[data] : user;
  },
);
