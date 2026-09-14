import type { HugeiconsIconProps, IconSvgElement } from '@hugeicons/react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Activity01Icon,
  Add01Icon,
  Alert01Icon,
  ArrowDown01Icon,
  ArrowRight01Icon,
  ArrowUp01Icon,
  Cancel01Icon,
  ChartLineData01Icon,
  CircleIcon,
  Copy01Icon,
  DashboardSquare01Icon,
  DatabaseIcon,
  Dollar01Icon,
  File01Icon,
  FolderLibraryIcon,
  FolderOpenIcon,
  Loading03Icon,
  LockPasswordIcon,
  Logout03Icon,
  Mail01Icon,
  MoreHorizontalCircle01Icon,
  Plug01Icon,
  Search01Icon,
  SecurityBlockIcon,
  SecurityCheckIcon,
  SecurityWarningIcon,
  Tick01Icon,
  Upload01Icon,
  UserGroupIcon,
  Wallet01Icon,
  WorkflowCircle01Icon,
} from '@hugeicons/core-free-icons';

type IconProps = Omit<HugeiconsIconProps, 'icon'>;

function platformIcon(icon: IconSvgElement) {
  return function PlatformIcon({ strokeWidth = 1.7, ...props }: IconProps) {
    return <HugeiconsIcon icon={icon} strokeWidth={strokeWidth} aria-hidden="true" {...props} />;
  };
}

export const Activity = platformIcon(Activity01Icon);
export const AlertTriangle = platformIcon(Alert01Icon);
export const ArrowRight = platformIcon(ArrowRight01Icon);
export const Ban = platformIcon(SecurityBlockIcon);
export const Check = platformIcon(Tick01Icon);
export const ChevronDown = platformIcon(ArrowDown01Icon);
export const ChevronRight = platformIcon(ArrowRight01Icon);
export const ChevronUp = platformIcon(ArrowUp01Icon);
export const Circle = platformIcon(CircleIcon);
export const Copy = platformIcon(Copy01Icon);
export const Database = platformIcon(DatabaseIcon);
export const DollarSign = platformIcon(Dollar01Icon);
export const FileText = platformIcon(File01Icon);
export const FolderKanban = platformIcon(FolderLibraryIcon);
export const FolderOpen = platformIcon(FolderOpenIcon);
export const LayoutDashboard = platformIcon(DashboardSquare01Icon);
export const LineChart = platformIcon(ChartLineData01Icon);
export const Loader2 = platformIcon(Loading03Icon);
export const Lock = platformIcon(LockPasswordIcon);
export const LogOut = platformIcon(Logout03Icon);
export const Mail = platformIcon(Mail01Icon);
export const MoreHorizontal = platformIcon(MoreHorizontalCircle01Icon);
export const PlugZap = platformIcon(Plug01Icon);
export const Plus = platformIcon(Add01Icon);
export const Search = platformIcon(Search01Icon);
export const ShieldAlert = platformIcon(SecurityWarningIcon);
export const ShieldCheck = platformIcon(SecurityCheckIcon);
export const ShieldX = platformIcon(SecurityBlockIcon);
export const Upload = platformIcon(Upload01Icon);
export const Users = platformIcon(UserGroupIcon);
export const Wallet = platformIcon(Wallet01Icon);
export const Waypoints = platformIcon(WorkflowCircle01Icon);
export const X = platformIcon(Cancel01Icon);
