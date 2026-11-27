import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import en_common from './locales/en/common.json';
import en_auth from './locales/en/auth.json';
import en_production from './locales/en/production.json';
import en_quality from './locales/en/quality.json';
import en_inventory from './locales/en/inventory.json';
import en_packing from './locales/en/packing.json';
import en_reports from './locales/en/reports.json';
import en_errors from './locales/en/errors.json';
import en_notifications from './locales/en/notifications.json';

import ta_common from './locales/ta/common.json';
import ta_auth from './locales/ta/auth.json';
import ta_production from './locales/ta/production.json';
import ta_quality from './locales/ta/quality.json';
import ta_inventory from './locales/ta/inventory.json';
import ta_packing from './locales/ta/packing.json';
import ta_reports from './locales/ta/reports.json';
import ta_errors from './locales/ta/errors.json';
import ta_notifications from './locales/ta/notifications.json';

import hi_common from './locales/hi/common.json';
import hi_auth from './locales/hi/auth.json';
import hi_production from './locales/hi/production.json';
import hi_quality from './locales/hi/quality.json';
import hi_inventory from './locales/hi/inventory.json';
import hi_packing from './locales/hi/packing.json';
import hi_reports from './locales/hi/reports.json';
import hi_errors from './locales/hi/errors.json';
import hi_notifications from './locales/hi/notifications.json';

const deviceLanguage = Localization.getLocales()[0]?.languageCode ?? 'en';
const supportedLanguages = ['en', 'ta', 'hi'];
const defaultLanguage = supportedLanguages.includes(deviceLanguage) ? deviceLanguage : 'en';

i18n.use(initReactI18next).init({
  resources: {
    en: {
      common: en_common,
      auth: en_auth,
      production: en_production,
      quality: en_quality,
      inventory: en_inventory,
      packing: en_packing,
      reports: en_reports,
      errors: en_errors,
      notifications: en_notifications,
    },
    ta: {
      common: ta_common,
      auth: ta_auth,
      production: ta_production,
      quality: ta_quality,
      inventory: ta_inventory,
      packing: ta_packing,
      reports: ta_reports,
      errors: ta_errors,
      notifications: ta_notifications,
    },
    hi: {
      common: hi_common,
      auth: hi_auth,
      production: hi_production,
      quality: hi_quality,
      inventory: hi_inventory,
      packing: hi_packing,
      reports: hi_reports,
      errors: hi_errors,
      notifications: hi_notifications,
    },
  },
  lng: defaultLanguage,
  fallbackLng: 'en',
  defaultNS: 'common',
  ns: ['common', 'auth', 'production', 'quality', 'inventory', 'packing', 'reports', 'errors', 'notifications'],
  interpolation: {
    escapeValue: false,
  },
  compatibilityJSON: 'v3',
});

export default i18n;
