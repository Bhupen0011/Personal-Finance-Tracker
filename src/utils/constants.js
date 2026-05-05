import {
  ArrowsRightLeftIcon,
  BanknotesIcon,
  ChartBarSquareIcon,
  Cog6ToothIcon,
  HomeIcon,
  RectangleStackIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';

export const categories = ['Food', 'Travel', 'Bills', 'Shopping', 'Health', 'Education'];

export const paymentMethods = ['UPI', 'Card', 'Cash', 'Net Banking', 'Wallet'];

export const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const categoryColors = {
  Food: '#31B06B',
  Travel: '#2F6FED',
  Bills: '#D64545',
  Shopping: '#F49D37',
  Health: '#8B5CF6',
  Education: '#0F8F8C',
  Income: '#1F9D63',
};

export const sidebarLinks = [
  { label: 'Dashboard', path: '/dashboard', icon: HomeIcon },
  { label: 'Transactions', path: '/transactions', icon: ArrowsRightLeftIcon },
  { label: 'Budgets', path: '/budgets', icon: ChartBarSquareIcon },
  { label: 'Analytics', path: '/analytics', icon: RectangleStackIcon },
  { label: 'Groups', path: '/groups', icon: UserGroupIcon },
  { label: 'Settlements', path: '/settlements', icon: BanknotesIcon },
  { label: 'Profile / Settings', path: '/settings', icon: Cog6ToothIcon },
];
