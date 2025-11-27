/**
 * DMVCFramework Log Viewer - Internationalization (i18n)
 * Lightweight i18n system with support for EN, ES, IT, PT
 */

(function () {
    'use strict';

    // Translation dictionaries
    const translations = {
        en: {
            // Header
            appTitle: 'DMVCFramework Log Viewer',
            connected: 'Connected',
            paused: 'Paused',
            lastUpdate: 'Last update',

            // Filters
            filterByLevel: 'Filter by level',
            filterByDateTime: 'Filter by date/time',
            searchPlaceholder: 'Search in logs...',
            from: 'From',
            to: 'To',

            // Level buttons
            levelAll: 'All',
            levelInfo: 'INFO',
            levelWarning: 'WARNING',
            levelError: 'ERROR',
            levelDebug: 'DEBUG',
            levelFatal: 'FATAL',

            // Action buttons
            btnClear: 'Clear',
            btnPause: 'Pause',
            btnResume: 'Resume',
            btnAutoScroll: 'Auto-scroll',

            // Footer stats
            totalEntries: 'Total entries',
            filtered: 'Filtered',
            detectedTags: 'Detected tags',
            updateInterval: 'Update interval',

            // Messages
            loadingLogs: 'Loading logs...',
            noLogsFound: 'No log files found',
            noLogsMatch: 'No logs match the filters',
            connectionError: 'Could not connect to server',
            verifyConfig: 'Verify the configuration in',
            startServer: 'Start the server with:',
            emptyState: 'No logs available for',

            // Language selector
            selectLanguage: 'Select language'
        },

        es: {
            // Header
            appTitle: 'DMVCFramework Log Viewer',
            connected: 'Conectado',
            paused: 'Pausado',
            lastUpdate: 'Última actualización',

            // Filters
            filterByLevel: 'Filtrar por nivel',
            filterByDateTime: 'Filtrar por fecha/hora',
            searchPlaceholder: 'Buscar en logs...',
            from: 'Desde',
            to: 'Hasta',

            // Level buttons
            levelAll: 'Todos',
            levelInfo: 'INFO',
            levelWarning: 'WARNING',
            levelError: 'ERROR',
            levelDebug: 'DEBUG',
            levelFatal: 'FATAL',

            // Action buttons
            btnClear: 'Limpiar',
            btnPause: 'Pausar',
            btnResume: 'Reanudar',
            btnAutoScroll: 'Auto-scroll',

            // Footer stats
            totalEntries: 'Total de entradas',
            filtered: 'Filtradas',
            detectedTags: 'Tags detectados',
            updateInterval: 'Intervalo de actualización',

            // Messages
            loadingLogs: 'Cargando logs...',
            noLogsFound: 'No se encontraron archivos de log',
            noLogsMatch: 'No hay logs que coincidan con los filtros',
            connectionError: 'No se pudo conectar con el servidor',
            verifyConfig: 'Verifica la configuración en',
            startServer: 'Inicia el servidor con:',
            emptyState: 'No hay logs disponibles para',

            // Language selector
            selectLanguage: 'Seleccionar idioma'
        },

        it: {
            // Header
            appTitle: 'DMVCFramework Log Viewer',
            connected: 'Connesso',
            paused: 'In pausa',
            lastUpdate: 'Ultimo aggiornamento',

            // Filters
            filterByLevel: 'Filtra per livello',
            filterByDateTime: 'Filtra per data/ora',
            searchPlaceholder: 'Cerca nei log...',
            from: 'Da',
            to: 'A',

            // Level buttons
            levelAll: 'Tutti',
            levelInfo: 'INFO',
            levelWarning: 'WARNING',
            levelError: 'ERROR',
            levelDebug: 'DEBUG',
            levelFatal: 'FATAL',

            // Action buttons
            btnClear: 'Cancella',
            btnPause: 'Pausa',
            btnResume: 'Riprendi',
            btnAutoScroll: 'Auto-scroll',

            // Footer stats
            totalEntries: 'Voci totali',
            filtered: 'Filtrate',
            detectedTags: 'Tag rilevati',
            updateInterval: 'Intervallo di aggiornamento',

            // Messages
            loadingLogs: 'Caricamento log...',
            noLogsFound: 'Nessun file di log trovato',
            noLogsMatch: 'Nessun log corrisponde ai filtri',
            connectionError: 'Impossibile connettersi al server',
            verifyConfig: 'Verifica la configurazione in',
            startServer: 'Avvia il server con:',
            emptyState: 'Nessun log disponibile per',

            // Language selector
            selectLanguage: 'Seleziona lingua'
        },

        pt: {
            // Header
            appTitle: 'DMVCFramework Log Viewer',
            connected: 'Conectado',
            paused: 'Pausado',
            lastUpdate: 'Última atualização',

            // Filters
            filterByLevel: 'Filtrar por nível',
            filterByDateTime: 'Filtrar por data/hora',
            searchPlaceholder: 'Pesquisar nos logs...',
            from: 'De',
            to: 'Até',

            // Level buttons
            levelAll: 'Todos',
            levelInfo: 'INFO',
            levelWarning: 'WARNING',
            levelError: 'ERROR',
            levelDebug: 'DEBUG',
            levelFatal: 'FATAL',

            // Action buttons
            btnClear: 'Limpar',
            btnPause: 'Pausar',
            btnResume: 'Retomar',
            btnAutoScroll: 'Auto-scroll',

            // Footer stats
            totalEntries: 'Total de entradas',
            filtered: 'Filtradas',
            detectedTags: 'Tags detectadas',
            updateInterval: 'Intervalo de atualização',

            // Messages
            loadingLogs: 'Carregando logs...',
            noLogsFound: 'Nenhum arquivo de log encontrado',
            noLogsMatch: 'Nenhum log corresponde aos filtros',
            connectionError: 'Não foi possível conectar ao servidor',
            verifyConfig: 'Verifique a configuração em',
            startServer: 'Inicie o servidor com:',
            emptyState: 'Nenhum log disponível para',

            // Language selector
            selectLanguage: 'Selecionar idioma'
        }
    };

    // Current language
    let currentLang = 'en';

    // Initialize i18n
    function init() {
        // Try to get language from localStorage
        const savedLang = localStorage.getItem('dmvc-log-viewer-lang');

        if (savedLang && translations[savedLang]) {
            currentLang = savedLang;
        } else {
            // Detect browser language
            const browserLang = navigator.language || navigator.userLanguage;
            const langCode = browserLang.split('-')[0].toLowerCase();

            if (translations[langCode]) {
                currentLang = langCode;
            }
        }

        // Apply translations
        translatePage();
    }

    // Translate a key
    function t(key) {
        return translations[currentLang][key] || key;
    }

    // Set language
    function setLanguage(lang) {
        if (!translations[lang]) {
            console.error(`Language "${lang}" not supported`);
            return;
        }

        currentLang = lang;
        localStorage.setItem('dmvc-log-viewer-lang', lang);
        translatePage();

        // Dispatch event for app.js to update dynamic content
        window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
    }

    // Get current language
    function getCurrentLanguage() {
        return currentLang;
    }

    // Translate all elements with data-i18n attribute
    function translatePage() {
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = t(key);

            if (element.tagName === 'INPUT' && element.type === 'text') {
                element.placeholder = translation;
            } else {
                element.textContent = translation;
            }
        });

        // Update language selector active state
        document.querySelectorAll('.lang-option').forEach(option => {
            option.classList.toggle('active', option.dataset.lang === currentLang);
        });
    }

    // Export to global
    window.i18n = {
        init,
        t,
        setLanguage,
        getCurrentLanguage,
        translatePage
    };

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
