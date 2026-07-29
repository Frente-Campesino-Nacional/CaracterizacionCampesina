import { StyleSheet } from 'react-native';
import { Theme } from '../theme/colors';

export const sharedScreenStyles = StyleSheet.create({
  surfaceSoft: {
    flex: 1,
    backgroundColor: '#f5f7fb',
  },
  surfaceWhite: {
    flex: 1,
    backgroundColor: Theme.colors.white,
  },
  contentMd: {
    padding: Theme.spacing.md,
    gap: Theme.spacing.md,
  },
  contentLg: {
    padding: Theme.spacing.lg,
    gap: Theme.spacing.lg,
    paddingBottom: Theme.spacing.xxl,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.lg,
  },
  helperText: {
    color: '#334155',
    fontWeight: Theme.fontWeight.semibold,
  },
  card: {
    backgroundColor: Theme.colors.white,
    borderRadius: 14,
    padding: 14,
  },
  cardTitleXl: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
  },
  cardTitleLg: {
    fontSize: Theme.fontSize.lg,
    fontWeight: Theme.fontWeight.bold,
    color: Theme.colors.darkGray,
    marginBottom: Theme.spacing.sm,
  },
  subtitleStrong: {
    color: '#1f2937',
    fontWeight: '700',
    marginBottom: 4,
  },
  metaText: {
    color: '#475569',
    marginBottom: 2,
  },
  emptyCard: {
    backgroundColor: Theme.colors.white,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  emptyTitle: {
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  emptySubtitle: {
    color: '#64748b',
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: '#1d4ed8',
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 11,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#e2e8f0',
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 11,
  },
  secondaryButtonText: {
    color: '#1f2937',
    fontWeight: '700',
  },
  statusSuccess: {
    color: '#047857',
    fontWeight: '700',
  },
  statusWarning: {
    color: '#b45309',
    fontWeight: '700',
  },
  fieldRow: {
    marginBottom: Theme.spacing.md,
  },
  fieldLabel: {
    color: Theme.colors.mediumGray,
    fontSize: Theme.fontSize.sm,
    marginBottom: Theme.spacing.xs,
  },
  fieldValue: {
    color: Theme.colors.darkGray,
    fontSize: Theme.fontSize.base,
    fontWeight: Theme.fontWeight.semibold,
  },
});