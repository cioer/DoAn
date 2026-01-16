import { UserCheck } from 'lucide-react';
import {
  gradients,
  shadows,
  colors,
  iconContainers,
  cx,
} from '../../../lib/design-tokens';
import type { CouncilInfo } from '../types';

/**
 * CouncilInfoCard Props
 */
export interface CouncilInfoCardProps {
  council: CouncilInfo;
}

/**
 * CouncilInfoCard Component
 *
 * Displays council information card with member count and role.
 */
export function CouncilInfoCard({ council }: CouncilInfoCardProps) {
  return (
    <div
      className={cx(
        gradients.headerBlue,
        'rounded-lg p-6',
        shadows.lg,
        colors.textWhite
      )}
    >
      <div className="flex items-center gap-4">
        <div className={cx(iconContainers['2xl'], 'bg-white/20')}>
          <UserCheck className="h-8 w-8 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-semibold">{council.name}</h3>
          <p className="text-blue-200 mt-1">
            {council.memberCount} thành viên •{' '}
            {council.isSecretary ? 'Thư ký' : 'Thành viên'}
          </p>
        </div>
        <div className={cx(iconContainers.xl, 'bg-white/20')}>
          <span className="text-2xl font-bold">{council.memberCount}</span>
        </div>
      </div>
    </div>
  );
}
