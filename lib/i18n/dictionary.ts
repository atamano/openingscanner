import type { Locale } from "./config";

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
  };
  playerDirectory: {
    popularOn: string;
    handlesHint: string;
    searchPlaceholder: string;
    clearSearch: string;
    allCountries: string;
    noMatch: string;
    page: string;
    prevPage: string;
    nextPage: string;
  };
  form: {
    placeholderLichess: string;
    placeholderChesscom: string;
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
    window30d: string;
    window6m: string;
    window1y: string;
    windowAll: string;
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
    clearFilter: string;
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
    descGlobal: string;
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
    descGlobal: string;
    descScoped: string;
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
    descGlobal: string;
    descScoped: string;
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
    scopeAllColorGames: string;
    exportGames: string;
    exportGamesDesc: string;
    exportGamesDescPosition: string;
    exportGamesDescRepertoire: string;
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
 * Lazy-load the JSON dictionary on the server. The JSON files live next to
 * this module and are resolved at build time via dynamic import.
 */
export async function getDictionary(locale: Locale): Promise<Dictionary> {
  switch (locale) {
    case "en":
      return (await import("./dictionaries/en.json")).default as Dictionary;
    case "es":
      return (await import("./dictionaries/es.json")).default as Dictionary;
    case "fr":
      return (await import("./dictionaries/fr.json")).default as Dictionary;
    case "de":
      return (await import("./dictionaries/de.json")).default as Dictionary;
    case "it":
      return (await import("./dictionaries/it.json")).default as Dictionary;
    case "pt-BR":
      return (await import("./dictionaries/pt-BR.json")).default as Dictionary;
    case "nl":
      return (await import("./dictionaries/nl.json")).default as Dictionary;
    case "pl":
      return (await import("./dictionaries/pl.json")).default as Dictionary;
    case "tr":
      return (await import("./dictionaries/tr.json")).default as Dictionary;
    case "ru":
      return (await import("./dictionaries/ru.json")).default as Dictionary;
    case "uk":
      return (await import("./dictionaries/uk.json")).default as Dictionary;
    case "ja":
      return (await import("./dictionaries/ja.json")).default as Dictionary;
    case "zh-CN":
      return (await import("./dictionaries/zh-CN.json")).default as Dictionary;
  }
}
