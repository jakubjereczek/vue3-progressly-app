import type { ComposerTranslation } from 'vue-i18n';

export interface Column {
  id: string;
  label: string;
  visible: boolean;
  class: string;
  isToggleable: boolean;
}

export const getColumnDefinitions = (t: ComposerTranslation): Column[] => [
  { id: 'status', label: t('app.module.activities_history.category.status'), visible: true, class: 'w-[120px]', isToggleable: false },
  { id: 'description', label: t('app.module.activities_history.category.description'), visible: true, class: '', isToggleable: false },
  { id: 'category', label: t('app.module.activities_history.category.category'), visible: true, class: 'w-[150px]', isToggleable: true },
  { id: 'tags', label: t('app.module.activities_history.category.tags'), visible: true, class: 'w-[180px]', isToggleable: true },
  { id: 'duration', label: t('app.module.activities_history.category.duration'), visible: true, class: 'w-[120px]', isToggleable: false },
  {
    id: 'startedAt',
    label: t('app.module.activities_history.category.started_at'),
    visible: true,
    class: 'w-[180px] text-right',
    isToggleable: true,
  },
  {
    id: 'finishedAt',
    label: t('app.module.activities_history.category.finished_at'),
    visible: true,
    class: 'w-[180px] text-right',
    isToggleable: true,
  },
  {
    id: 'actions',
    label: t('app.module.activities_history.actions'),
    visible: true,
    class: 'w-[50px] text-right',
    isToggleable: false,
  },
];
