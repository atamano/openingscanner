import { DEFAULT_LOCALE, type Locale } from "./config";

export interface Dictionary {
  meta: {
    title: string;
    titleTemplate: string;
    description: string;
    tagline: string;
    keywords: string[];
  };
  landing: {
    badge: string;
    h1: string;
    subtitle: string;
    footer: string;
    sisterSitesPrefix: string;
  };
  header: {
    newScan: string;
    backToHome: string;
    changeLanguage: string;
    languageLabel: string;
  };
  form: {
    placeholderLichess: string;
    placeholderChesscom: string;
    sourcesTitle: string;
    sourcesHint: string;
    addAccount: string;
    removeAccount: string;
    popular: string;
    colorWhite: string;
    colorBlack: string;
    colorBoth: string;
    asColorPrefix: string;
    submit: string;
    stop: string;
    timeControls: string;
    window: string;
    ratedOnly: string;
    timeBullet: string;
    timeBlitz: string;
    timeRapid: string;
    timeClassical: string;
    timeCorrespondence: string;
    window30d: string;
    window6m: string;
    window1y: string;
    windowAll: string;
    limit: string;
    limitAll: string;
  };
  progress: {
    streaming: string;
    complete: string;
    fetched: string;
    classified: string;
  };
  livePreview: {
    title: string;
    subtitle: string;
  };
  summary: {
    asWhite: string;
    asBlack: string;
    bothSides: string;
    windowLast30d: string;
    windowLast6m: string;
    windowLast1y: string;
    windowAllTime: string;
    streamingLabel: string;
    gamesLabel: string;
    stop: string;
    collapse: string;
    editFilters: string;
    newScan: string;
  };
  dashboard: {
    openings: string;
    families: string;
    hits: string;
    variantsOne: string;
    variantsMany: string;
    allOpenings: string;
    searchPlaceholder: string;
    clearSearch: string;
    noMatch: string;
    noDataYet: string;
    boardLabel: string;
    exploringInitial: string;
    pickOpeningHint: string;
    tipLegend: string;
    uncategorized: string;
    avgOpponentRating: string;
    previewNotice: string;
    closePreview: string;
    continuations: string;
    firstMoves: string;
    noOpeningSelected: string;
    previewingLine: string;
    previewingDesc: string;
    pickOpeningDesc: string;
    clickRow: string;
    kpiN: string;
    kpiWin: string;
    kpiDraw: string;
    kpiLoss: string;
    filterLabel: string;
    filterPlySuffix: string;
    filterPlyChipLabel: string;
    clearFilter: string;
    colorFilterLabel: string;
  };
  continuations: {
    move: string;
    games: string;
    results: string;
    noFurther: string;
    noRecurring: string;
    prev: string;
    reset: string;
    pick: string;
    play: string;
    back: string;
    fromPlyPrefix: string;
    plySuffix: string;
    start: string;
  };
  gaps: {
    titleGlobal: string;
    titleScoped: string;
    descGlobalWhite: string;
    descGlobalBlack: string;
    descScoped: string;
    reasonPlayed: string;
    reasonPlayedPlural: string;
    reasonRare: string;
    showingOf: string;
    showMore: string;
    collapse: string;
  };
  weakSpots: {
    titleGlobal: string;
    titleScoped: string;
    descGlobalWhite: string;
    descGlobalBlack: string;
    descScoped: string;
    coverageHint: string;
    afterPly: string;
    gameSuffixOne: string;
    gameSuffixMany: string;
    showingOf: string;
    showMore: string;
    collapse: string;
  };
  strongSpots: {
    titleGlobal: string;
    titleScoped: string;
    descGlobalWhite: string;
    descGlobalBlack: string;
    descScoped: string;
    coverageHint: string;
    afterPly: string;
    gameSuffixOne: string;
    gameSuffixMany: string;
    showingOf: string;
    showMore: string;
    collapse: string;
  };
  export: {
    trigger: string;
    scopeLabel: string;
    scopeVariation: string;
    scopeSelectedOpening: string;
    scopeAllColorGamesWhite: string;
    scopeAllColorGamesBlack: string;
    exportGames: string;
    exportGamesDesc: string;
    exportGamesDescPosition: string;
    exportGamesDescRepertoireWhite: string;
    exportGamesDescRepertoireBlack: string;
    exportRepertoire: string;
    exportRepertoireDesc: string;
    toastNoGamesMatch: string;
    toastNoGamesYet: string;
    toastGamesDownloaded: string;
    toastGamesDownloadedPlural: string;
    toastRepertoireDownloaded: string;
    toastNothingYet: string;
    toastNotEnough: string;
  };
  page: {
    scanFailed: string;
    noGamesMatched: string;
    widenTryHint: string;
  };
  loading: string;
}

/**
 * Lazy-load the JSON dictionary on the server. JSON files live next to this
 * module; the loader map is `Record<Locale, ...>` so adding a new locale to
 * `LOCALES` without registering its JSON loader is a compile error rather
 * than a runtime `undefined`.
 */
const LOADERS: Record<Locale, () => Promise<{ default: Dictionary }>> = {
  en: () => import("./dictionaries/en.json"),
  es: () => import("./dictionaries/es.json"),
  fr: () => import("./dictionaries/fr.json"),
  de: () => import("./dictionaries/de.json"),
  it: () => import("./dictionaries/it.json"),
  "pt-BR": () => import("./dictionaries/pt-BR.json"),
  nl: () => import("./dictionaries/nl.json"),
  pl: () => import("./dictionaries/pl.json"),
  tr: () => import("./dictionaries/tr.json"),
  ru: () => import("./dictionaries/ru.json"),
  uk: () => import("./dictionaries/uk.json"),
  ja: () => import("./dictionaries/ja.json"),
  "zh-CN": () => import("./dictionaries/zh-CN.json"),
};

export async function getDictionary(locale: Locale): Promise<Dictionary> {
  const load = LOADERS[locale] ?? LOADERS[DEFAULT_LOCALE];
  return (await load()).default;
}
