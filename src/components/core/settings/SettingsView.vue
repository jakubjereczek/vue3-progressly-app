<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { toast } from 'vue-sonner';
import { KeyRound, Globe, Mail, Loader2, UserRound, Monitor, Sun, Moon } from 'lucide-vue-next';
import { useUserStore } from '@/stores';
import { useTranslation } from '@/composables';
import { useLocale } from '@/composables';
import { useTheme, type ThemeMode } from '@/composables/useTheme';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const { t } = useTranslation();
const { locale, setLocale } = useLocale();
const { theme, setTheme } = useTheme();
const userStore = useUserStore();
const { user, loading } = storeToRefs(userStore);

const activeTab = ref<'account' | 'preferences'>('account');

const email = computed(() => user.value?.email ?? '');

const displayName = ref('');
const displayNameLoading = ref(false);

watch(
  user,
  (u) => {
    if (!displayNameLoading.value && u?.user_metadata?.full_name) {
      displayName.value = u.user_metadata.full_name;
    }
  },
  { immediate: true },
);

async function handleUpdateDisplayName() {
  if (!displayName.value.trim()) {
    return;
  }
  displayNameLoading.value = true;
  const { success } = await userStore.updateDisplayName(displayName.value.trim());
  displayNameLoading.value = false;
  if (success) {
    toast.success(t('app.toast_notification.settings.display_name_updated'));
  } else {
    toast.error(t('app.toast_notification.settings.display_name_error'));
  }
}

const currentPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const passwordError = ref('');

function validatePassword(): boolean {
  passwordError.value = '';
  if (!currentPassword.value) {
    passwordError.value = t('app.module.settings.password.current_required');
    return false;
  }
  if (newPassword.value.length < 6) {
    passwordError.value = t('app.module.settings.password.too_short');
    return false;
  }
  if (newPassword.value !== confirmPassword.value) {
    passwordError.value = t('app.module.settings.password.mismatch');
    return false;
  }
  return true;
}

async function handleUpdatePassword() {
  if (!validatePassword()) {
    return;
  }
  const { success, invalidCurrent } = await userStore.updatePassword(currentPassword.value, newPassword.value);
  if (success) {
    toast.success(t('app.toast_notification.settings.password_updated'));
    currentPassword.value = '';
    newPassword.value = '';
    confirmPassword.value = '';
  } else if (invalidCurrent) {
    passwordError.value = t('app.module.settings.password.current_invalid');
  } else {
    toast.error(t('app.toast_notification.settings.password_error'));
  }
}

const languages = [
  { code: 'en-US', label: 'app.module.settings.language.en' },
  { code: 'pl-PL', label: 'app.module.settings.language.pl' },
  { code: 'es-ES', label: 'app.module.settings.language.es' },
];

const themeOptions: { value: ThemeMode; labelKey: string; icon: unknown }[] = [
  { value: 'system', labelKey: 'app.module.settings.theme.system', icon: Monitor },
  { value: 'light', labelKey: 'app.module.settings.theme.light', icon: Sun },
  { value: 'dark', labelKey: 'app.module.settings.theme.dark', icon: Moon },
];
</script>

<template>
  <Card class="p-6 flex flex-col gap-6 rounded-2xl border border-border/40 h-full overflow-hidden">
    <div class="flex-shrink-0">
      <p class="text-sm font-medium text-muted-foreground">{{ t('app.module.settings.title') }}</p>
      <p class="text-xs text-muted-foreground/60 mt-0.5">{{ t('app.module.settings.description') }}</p>

      <div class="flex items-center gap-1 mt-5 border-b border-border/40 -mx-5 px-5">
        <button
          @click="activeTab = 'account'"
          :class="
            cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-b-2 -mb-px transition-colors',
              activeTab === 'account'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )
          "
        >
          <UserRound class="w-3.5 h-3.5" />
          {{ t('app.module.settings.section.account') }}
        </button>
        <button
          @click="activeTab = 'preferences'"
          :class="
            cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-b-2 -mb-px transition-colors',
              activeTab === 'preferences'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )
          "
        >
          <Globe class="w-3.5 h-3.5" />
          {{ t('app.module.settings.section.preferences') }}
        </button>
      </div>
    </div>
    <div class="flex-1 overflow-y-auto">
      <div v-if="activeTab === 'account'" class="flex flex-col gap-6 max-w-lg">
        <div class="flex flex-col gap-3">
          <div>
            <div class="flex items-center gap-2 text-sm font-medium">
              <UserRound class="w-4 h-4 text-muted-foreground" />
              {{ t('app.module.settings.display_name.label') }}
            </div>
            <p class="text-xs text-muted-foreground mt-0.5">{{ t('app.module.settings.display_name.hint') }}</p>
          </div>
          <div class="flex flex-col gap-2">
            <Input
              v-model="displayName"
              type="text"
              :placeholder="t('app.module.settings.display_name.placeholder')"
              @keydown.enter="handleUpdateDisplayName"
            />
            <Button
              size="sm"
              class="w-fit gap-1.5"
              :disabled="displayNameLoading || !displayName.trim()"
              @click="handleUpdateDisplayName"
            >
              <Loader2 v-if="displayNameLoading" class="w-3.5 h-3.5 animate-spin" />
              {{ t('app.module.settings.display_name.submit') }}
            </Button>
          </div>
        </div>
        <div class="flex flex-col gap-2">
          <div class="flex items-center gap-2 text-sm font-medium">
            <Mail class="w-4 h-4 text-muted-foreground" />
            {{ t('app.module.settings.email.label') }}
          </div>
          <div class="flex items-center gap-3 px-3 py-3 rounded-lg bg-muted/40 border border-border/50">
            <span class="text-sm text-foreground">{{ email }}</span>
          </div>
          <p class="text-xs text-muted-foreground">{{ t('app.module.settings.email.hint') }}</p>
        </div>
        <div class="flex flex-col gap-3">
          <div class="flex items-center gap-2 text-sm font-medium">
            <KeyRound class="w-4 h-4 text-muted-foreground" />
            {{ t('app.module.settings.password.label') }}
          </div>
          <div class="flex flex-col gap-2">
            <Input v-model="currentPassword" type="password" :placeholder="t('app.module.settings.password.current')" />
            <Input v-model="newPassword" type="password" :placeholder="t('app.module.settings.password.new')" />
            <Input
              v-model="confirmPassword"
              type="password"
              :placeholder="t('app.module.settings.password.confirm')"
              @keydown.enter="handleUpdatePassword"
            />
            <p v-if="passwordError" class="text-xs text-destructive">{{ passwordError }}</p>
            <Button
              size="sm"
              class="w-fit gap-1.5 mt-1"
              :disabled="loading || !currentPassword || !newPassword || !confirmPassword"
              @click="handleUpdatePassword"
            >
              <Loader2 v-if="loading" class="w-3.5 h-3.5 animate-spin" />
              {{ t('app.module.settings.password.submit') }}
            </Button>
          </div>
        </div>
      </div>
      <div v-else class="flex flex-col gap-6 max-w-lg">
        <div class="flex flex-col gap-3">
          <div>
            <div class="flex items-center gap-2 text-sm font-medium">
              <Globe class="w-4 h-4 text-muted-foreground" />
              {{ t('app.module.settings.language.label') }}
            </div>
            <p class="text-xs text-muted-foreground mt-0.5">{{ t('app.module.settings.language.hint') }}</p>
          </div>
          <div class="flex gap-2">
            <button
              v-for="lang in languages"
              :key="lang.code"
              @click="setLocale(lang.code)"
              class="px-4 py-2 rounded-lg text-sm font-medium border transition-colors"
              :class="
                locale === lang.code
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-foreground border-border/60 hover:bg-muted'
              "
            >
              {{ t(lang.label) }}
            </button>
          </div>
        </div>
        <div class="flex flex-col gap-3">
          <div>
            <div class="flex items-center gap-2 text-sm font-medium">
              <Sun class="w-4 h-4 text-muted-foreground" />
              {{ t('app.module.settings.theme.label') }}
            </div>
            <p class="text-xs text-muted-foreground mt-0.5">{{ t('app.module.settings.theme.hint') }}</p>
          </div>
          <div class="flex gap-2">
            <button
              v-for="opt in themeOptions"
              :key="opt.value"
              @click="setTheme(opt.value)"
              class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors"
              :class="
                theme === opt.value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-foreground border-border/60 hover:bg-muted'
              "
            >
              <component :is="opt.icon" class="w-3.5 h-3.5" />
              {{ t(opt.labelKey) }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Card>
</template>
