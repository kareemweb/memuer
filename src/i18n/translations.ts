export type Language = 'en' | 'ar';

export type TranslationKey =
  | 'worldCupMode'
  | 'liveMatches'
  | 'settings'
  | 'live'
  | 'group'
  | 'fullTime'
  | 'loading'
  | 'selectCountries'
  | 'search'
  | 'saveChanges'
  | 'welcomeToMemuer'
  | 'worldCupDescription'
  | 'youCanSelectMultiple'
  | 'skipForNow'
  | 'ok'
  | 'continueBtn';

export const translations: Record<Language, Record<TranslationKey, string>> = {
  en: {
    worldCupMode: 'World Cup Mode',
    liveMatches: 'Live Matches',
    settings: 'Settings',
    live: 'Live',
    group: 'Group',
    fullTime: 'Full Time',
    loading: 'Loading',
    selectCountries: 'Select Countries',
    search: 'Search...',
    saveChanges: 'Save Changes',
    welcomeToMemuer: 'Welcome to Memuer',
    worldCupDescription: 'Follow your favorite team, get real-time match results, and customize your theme dynamically based on your support!',
    youCanSelectMultiple: 'You can select multiple countries',
    skipForNow: 'Skip for now',
    ok: 'OK',
    continueBtn: 'Continue'
  },
  ar: {
    worldCupMode: 'وضع كأس العالم',
    liveMatches: 'المباريات المباشرة',
    settings: 'الإعدادات',
    live: 'مباشر',
    group: 'مجموعة',
    fullTime: 'وقت كامل',
    loading: 'جاري التحميل',
    selectCountries: 'اختر الدول',
    search: 'بحث...',
    saveChanges: 'حفظ التغييرات',
    welcomeToMemuer: 'مرحباً بك في ميميوير',
    worldCupDescription: 'تابع فريقك المفضل، واحصل على نتائج المباريات الفورية، وخصص تطبيقك بناءً على دعمك!',
    youCanSelectMultiple: 'يمكنك اختيار أكثر من دولة واحدة',
    skipForNow: 'تخطي الآن',
    ok: 'موافق',
    continueBtn: 'متابعة'
  }
};
