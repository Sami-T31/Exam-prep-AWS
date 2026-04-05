'use client';

import { useI18n } from '@/lib/i18n';
import { DropdownOption, DropdownSelect, ThemeToggle } from '@/components/ui';

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();
  const languageOptions: DropdownOption[] = [
    { value: 'en', label: t('language.english', 'English') },
    { value: 'am', label: t('language.amharic', 'Amharic') },
  ];

  return (
    <div className="ui-dropdown-panel fixed bottom-4 right-4 z-[70] flex items-center gap-2 p-2 backdrop-blur">
      <ThemeToggle />
      <div className="w-36">
        <DropdownSelect
          label={t('language.label', 'Language')}
          value={locale}
          options={languageOptions}
          onChange={(nextValue) => setLocale(nextValue as 'en' | 'am')}
          menuPlacement="top"
          triggerClassName="h-8 px-3 text-xs"
          menuClassName="max-h-44"
        />
      </div>
    </div>
  );
}



