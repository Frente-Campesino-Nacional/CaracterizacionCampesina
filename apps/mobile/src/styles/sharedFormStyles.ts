import { StyleSheet } from 'react-native';
import { Theme } from '../theme/colors';

export const sharedFormStyles = StyleSheet.create({
  pageContainer: {
    flex: 1,
    padding: 12,
    backgroundColor: '#f5f7fb',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  headerTextWrapper: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
  },
  sectionSubtitle: {
    color: '#475569',
    marginTop: 4,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryButton: {
    backgroundColor: '#0f766e',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  smallButton: {
    backgroundColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  smallButtonText: {
    color: '#1f2937',
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: 20,
    gap: 10,
  },
  emptyText: {
    color: '#64748b',
    textAlign: 'center',
    padding: 24,
  },
  linkText: {
    color: '#1d4ed8',
    fontWeight: '700',
  },
  dangerText: {
    color: '#b91c1c',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    marginBottom: 10,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    alignItems: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  saveText: {
    color: Theme.colors.greenDark,
    fontWeight: '700',
  },
});