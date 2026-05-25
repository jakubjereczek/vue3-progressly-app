import type { ComposerTranslation } from 'vue-i18n';

export interface Column {
  id: string;
  label: string;
  visible: boolean;
  class: string;
  isToggleable: boolean;
  isSortable?: boolean;
}

export const getColumnDefinitions = (t: ComposerTranslation): Column[] => [
  {
    id: 'status',
    label: t('app.module.activities_history.category.status'),
    visible: true,
    class: 'w-[120px]',
    isToggleable: false,
    isSortable: true,
  },
  {
    id: 'description',
    label: t('app.module.activities_history.category.description'),
    visible: true,
    class: 'w-[360px]',
    isToggleable: false,
    isSortable: true,
  },
  {
    id: 'category',
    label: t('app.module.activities_history.category.category'),
    visible: true,
    class: 'w-[120px]',
    isToggleable: true,
    isSortable: false,
  },
  {
    id: 'tags',
    label: t('app.module.activities_history.category.tags'),
    visible: true,
    class: 'w-[180px]',
    isToggleable: true,
    isSortable: false,
  },
  {
    id: 'duration',
    label: t('app.module.activities_history.category.duration'),
    visible: true,
    class: 'w-[120px]',
    isToggleable: false,
    isSortable: true,
  },
  {
    id: 'startedAt',
    label: t('app.module.activities_history.category.started_at'),
    visible: true,
    class: 'w-[180px]',
    isToggleable: true,
    isSortable: true,
  },
  {
    id: 'finishedAt',
    label: t('app.module.activities_history.category.finished_at'),
    visible: true,
    class: 'w-[180px]',
    isToggleable: true,
    isSortable: true,
  },
];
