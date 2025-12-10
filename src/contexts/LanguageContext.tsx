import React, { createContext, useState, useContext, ReactNode } from 'react';

type Language = 'en' | 'es' | 'fr';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  en: {
    // Header
    'timeclock.title': 'CICO Timeclock',

    // Date and time labels
    'timeclock.selectEmployee': 'Select Employee',
    'timeclock.pleaseSelectAndPin': 'Please select your name and project',

    // Form fields
    'timeclock.selectEmployeeDropdown': 'Select Employee',
    'timeclock.selectProjects': 'Select Projects',
    'timeclock.projectsSelected': '{count} Project Selected',
    'timeclock.projectsSelected_plural': '{count} Projects Selected',
    'timeclock.removeProject': 'Remove Project',

    // Buttons
    'timeclock.clockIn': 'Clock In',
    'timeclock.clockOut': 'Clock Out',
    'timeclock.break': 'Break',
    'timeclock.closePage': 'Close Page',

    // Language names
    'language.english': 'English',
    'language.spanish': 'Spanish',
    'language.french': 'French'
  },
  es: {
    // Header
    'timeclock.title': 'Reloj CICO',

    // Date and time labels
    'timeclock.selectEmployee': 'Seleccionar Empleado',
    'timeclock.pleaseSelectAndPin': 'Por favor seleccione su nombre y proyecto',

    // Form fields
    'timeclock.selectEmployeeDropdown': 'Seleccionar Empleado',
    'timeclock.selectProjects': 'Seleccionar Proyectos',
    'timeclock.projectsSelected': '{count} Proyecto Seleccionado',
    'timeclock.projectsSelected_plural': '{count} Proyectos Seleccionados',
    'timeclock.removeProject': 'Eliminar Proyecto',

    // Buttons
    'timeclock.clockIn': 'Registrar Entrada',
    'timeclock.clockOut': 'Registrar Salida',
    'timeclock.break': 'Descanso',
    'timeclock.closePage': 'Cerrar Página',

    // Language names
    'language.english': 'Inglés',
    'language.spanish': 'Español',
    'language.french': 'Francés'
  },
  fr: {
    // Header
    'timeclock.title': 'Pointeuse CICO',

    // Date and time labels
    'timeclock.selectEmployee': 'Sélectionner un Employé',
    'timeclock.pleaseSelectAndPin': 'Veuillez sélectionner votre nom et projet',

    // Form fields
    'timeclock.selectEmployeeDropdown': 'Sélectionner un Employé',
    'timeclock.selectProjects': 'Sélectionner des Projets',
    'timeclock.projectsSelected': '{count} Projet Sélectionné',
    'timeclock.projectsSelected_plural': '{count} Projets Sélectionnés',
    'timeclock.removeProject': 'Supprimer le Projet',

    // Buttons
    'timeclock.clockIn': 'Pointer Entrée',
    'timeclock.clockOut': 'Pointer Sortie',
    'timeclock.break': 'Pause',
    'timeclock.closePage': 'Fermer la Page',

    // Language names
    'language.english': 'Anglais',
    'language.spanish': 'Español',
    'language.french': 'Français'
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');

  const translate = (key: string): string => {
    const translation = translations[language][key as keyof typeof translations[typeof language]];

    if (!translation) {
      console.warn(`Translation missing for key: ${key} in language: ${language}`);
      return key;
    }

    return translation;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: translate }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
