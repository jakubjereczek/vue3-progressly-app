import type { ComposerTranslation } from 'vue-i18n';

export interface Column {
  id: string;
  label: string;
  visible: boolean;
  class: string;
  isToggleable: boolean;
}

export const getColumnDefinitions = (t: ComposerTranslation): Column[] => [
  { id: 'status', label: t('activitiesTable.status'), visible: true, class: 'w-[120px]', isToggleable: false },
  { id: 'description', label: t('activitiesTable.description'), visible: true, class: '', isToggleable: false },
  { id: 'category', label: t('activitiesTable.category'), visible: true, class: 'w-[150px]', isToggleable: true },
  { id: 'tags', label: t('activitiesTable.tags'), visible: true, class: 'w-[180px]', isToggleable: true },
  { id: 'duration', label: t('activitiesTable.duration'), visible: true, class: 'w-[120px]', isToggleable: false },
  {
    id: 'startedAt',
    label: t('activitiesTable.startedAt'),
    visible: true,
    class: 'w-[180px] text-right',
    isToggleable: true,
  },
  {
    id: 'finishedAt',
    label: t('activitiesTable.finishedAt'),
    visible: true,
    class: 'w-[180px] text-right',
    isToggleable: true,
  },
  {
    id: 'actions',
    label: t('activitiesTable.actions'),
    visible: true,
    class: 'w-[50px] text-right',
    isToggleable: false,
  },
];
