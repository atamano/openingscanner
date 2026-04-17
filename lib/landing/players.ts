// Curated directory of well-known chess accounts used to seed the landing
// page. Entries combine elite classical players, online blitz/bullet
// specialists, and major streamers/content creators so there's always
// someone interesting to click on. Where a handle isn't known on one
// platform we leave it undefined — the UI hides the corresponding chip.
//
// Country codes are ISO 3166-1 alpha-2. Titles follow FIDE conventions
// (GM/IM/FM/WGM/WIM/WFM/NM). Treat the list as a best-effort starting
// point — usernames can shift, so we'll iterate based on user reports.

export interface PopularPlayer {
  name: string;
  country: string;
  title?: string;
  lichess?: string;
  chesscom?: string;
  /** Freeform tag used for quick grouping in the UI. */
  tag?: "elite" | "streamer" | "top" | "content";
  note?: string;
}

export const POPULAR_PLAYERS: PopularPlayer[] = [
  // ──────────────────────────────────────────────────────────────
  // Super-elite — classical top 20ish
  // ──────────────────────────────────────────────────────────────
  { name: "Magnus Carlsen", country: "NO", title: "GM", lichess: "DrNykterstein", chesscom: "MagnusCarlsen", tag: "elite" },
  { name: "Hikaru Nakamura", country: "US", title: "GM", chesscom: "Hikaru", tag: "elite" },
  { name: "Fabiano Caruana", country: "US", title: "GM", chesscom: "FabianoCaruana", tag: "elite" },
  { name: "Gukesh Dommaraju", country: "IN", title: "GM", chesscom: "GukeshDommaraju", tag: "elite" },
  { name: "Ian Nepomniachtchi", country: "RU", title: "GM", chesscom: "lachesisQ", tag: "elite" },
  { name: "R Praggnanandhaa", country: "IN", title: "GM", chesscom: "rpragchess", tag: "elite" },
  { name: "Alireza Firouzja", country: "FR", title: "GM", lichess: "alireza2003", tag: "elite" },
  { name: "Anish Giri", country: "NL", title: "GM", lichess: "AnishGiri", chesscom: "AnishGiri", tag: "elite" },
  { name: "Wesley So", country: "US", title: "GM", chesscom: "GMWSO", tag: "elite" },
  { name: "Ding Liren", country: "CN", title: "GM", chesscom: "DingLiren", tag: "elite" },
  { name: "Levon Aronian", country: "US", title: "GM", chesscom: "LevonAronian", tag: "elite" },
  { name: "Maxime Vachier-Lagrave", country: "FR", title: "GM", lichess: "UnVieuxMonsieur", chesscom: "LyonBeast", tag: "elite" },
  { name: "Nodirbek Abdusattorov", country: "UZ", title: "GM", chesscom: "ChessWarrior7197", tag: "elite" },
  { name: "Vidit Gujrathi", country: "IN", title: "GM", chesscom: "viditchess", tag: "elite" },
  { name: "Nihal Sarin", country: "IN", title: "GM", lichess: "nihalsarin2004", chesscom: "nihalsarin", tag: "elite" },
  { name: "Jan-Krzysztof Duda", country: "PL", title: "GM", chesscom: "Polish_fighter3000", tag: "elite" },
  { name: "Alexander Grischuk", country: "RU", title: "GM", chesscom: "Grischuk", tag: "elite" },
  { name: "Parham Maghsoodloo", country: "IR", title: "GM", chesscom: "Parhamov", tag: "elite" },
  { name: "Nijat Abasov", country: "AZ", title: "GM", chesscom: "Nijat_Abasov", tag: "elite" },
  { name: "Daniil Dubov", country: "RU", title: "GM", chesscom: "Duhless", tag: "elite" },
  { name: "Jorden van Foreest", country: "NL", title: "GM", chesscom: "JordenVanForeest", tag: "elite" },
  { name: "Jeffery Xiong", country: "US", title: "GM", chesscom: "JefferyX", tag: "elite" },
  { name: "Peter Svidler", country: "RU", title: "GM", chesscom: "Peter_Svidler", tag: "elite" },

  // ──────────────────────────────────────────────────────────────
  // Online speed specialists / blitz grinders
  // ──────────────────────────────────────────────────────────────
  { name: "Andrew Tang", country: "US", title: "GM", lichess: "penguingm1", tag: "top" },
  { name: "Sergei Zhigalko", country: "BY", title: "GM", lichess: "Zhigalko_Sergei", chesscom: "Zhigalko_Sergei", tag: "top" },
  { name: "Vladislav Kovalev", country: "BY", title: "GM", lichess: "Konevlad", tag: "top" },
  { name: "Oleksandr Bortnyk", country: "UA", title: "GM", chesscom: "Oleksandr_Bortnyk", tag: "top" },
  { name: "José Martínez", country: "PE", title: "GM", chesscom: "jospem", tag: "top" },
  { name: "Denis Lazavik", country: "BY", title: "GM", chesscom: "DenLaz", tag: "top" },
  { name: "Bassem Amin", country: "EG", title: "GM", chesscom: "bassem2007" },
  { name: "Alexey Shirov", country: "ES", title: "GM", chesscom: "alexeishirov", tag: "top" },
  { name: "Ivan Šarić", country: "HR", title: "GM", chesscom: "IvanShas" },
  { name: "Sanan Sjugirov", country: "HU", title: "GM", chesscom: "SugarBoy" },
  { name: "Daniel Fridman", country: "DE", title: "GM", chesscom: "daniel_fridman" },
  { name: "Alexandr Predke", country: "RS", title: "GM", chesscom: "alexandr_predke" },

  // ──────────────────────────────────────────────────────────────
  // Streamers & content creators (primary reach)
  // ──────────────────────────────────────────────────────────────
  { name: "Levy Rozman (GothamChess)", country: "US", title: "IM", chesscom: "GothamChess", tag: "streamer" },
  { name: "Antonio Radić (Agadmator)", country: "HR", lichess: "agadmator", chesscom: "agadmator", tag: "streamer" },
  { name: "Stjepan Tomić (Hanging Pawns)", country: "HR", lichess: "hpy", tag: "streamer" },
  { name: "Kevin Bordi (Blitzstream)", country: "FR", title: "NM", chesscom: "blitzstream", tag: "streamer" },
  { name: "Julien Song", country: "FR", title: "IM", chesscom: "MIJulienSong", lichess: "MIJulienSong", tag: "streamer" },
  { name: "Nelson Lopez (Chess Vibes)", country: "US", title: "NM", chesscom: "nelsi", tag: "streamer" },
  { name: "Jonathan Schrantz", country: "US", title: "NM", chesscom: "VampireChicken", tag: "streamer" },
  { name: "Samay Raina", country: "IN", chesscom: "samayraina", tag: "streamer" },
  { name: "Benjamin Bok", country: "NL", title: "GM", chesscom: "GMBenjaminBok", tag: "streamer" },
  { name: "Robert Ramirez", country: "VE", title: "NM", chesscom: "RobRam", tag: "streamer" },
  { name: "Ayelen Martinez", country: "AR", title: "WIM", chesscom: "ayelenchess", tag: "streamer" },
  { name: "Eric Rosen", country: "US", title: "IM", lichess: "EricRosen", tag: "streamer" },
  { name: "Anna Cramling", country: "SE", title: "WFM", chesscom: "AnnaCramling", tag: "streamer" },
  { name: "Alexandra Botez", country: "CA", title: "WFM", chesscom: "BotezLive", tag: "streamer" },
  { name: "Eric Hansen (Chessbrah)", country: "CA", title: "GM", chesscom: "GMHansen", tag: "streamer" },
  { name: "Benjamin Finegold", country: "US", title: "GM", chesscom: "GMBenjaminFinegold", tag: "streamer" },
  { name: "Daniel King (PowerPlay)", country: "GB", title: "GM", chesscom: "DanielKing", tag: "streamer" },
  { name: "Daniel Rensch", country: "US", title: "IM", chesscom: "DanielRensch", tag: "streamer" },
  { name: "Jerry (ChessNetwork)", country: "US", title: "NM", chesscom: "ChessNetwork", lichess: "Chess-Network", tag: "streamer" },
  { name: "Pia Cramling", country: "SE", title: "GM", chesscom: "PiaCramling" },
  { name: "Dina Belenkaya", country: "IL", title: "WGM", chesscom: "DinaBelenkaya", tag: "streamer" },
  { name: "Irina Krush", country: "US", title: "GM", chesscom: "krushchess" },
  { name: "Alexandra Kosteniuk", country: "CH", title: "GM", chesscom: "chessqueen" },
  { name: "Arturs Neiksans", country: "LV", title: "GM", chesscom: "GMNeiksans", tag: "streamer" },
  { name: "Sergei Shipov (Crestbook)", country: "RU", title: "GM", chesscom: "crestbook", tag: "streamer" },
  { name: "Tamas Banusz", country: "HU", title: "GM", chesscom: "bancsoo", tag: "streamer" },
  { name: "Sergiusz Górski (NitroZyniak)", country: "PL", chesscom: "TheNitroZyniak", tag: "streamer" },
  { name: "Jonathan Li (JonLiMusic)", country: "US", chesscom: "JonLiMusic", tag: "streamer" },
  { name: "Aleksandra Maltsevskaya", country: "PL", title: "IM", chesscom: "AleksandraPL", tag: "streamer" },
  { name: "Christof Sielecki (ChessExplained)", country: "DE", title: "IM", chesscom: "ChessExplained", tag: "streamer" },
  { name: "Greg Shahade", country: "US", title: "IM", chesscom: "GregShahade" },
  { name: "John Bartholomew", country: "US", title: "IM", chesscom: "Fins0905", lichess: "Fins", tag: "streamer" },

  // ──────────────────────────────────────────────────────────────
  // Top women players
  // ──────────────────────────────────────────────────────────────
  { name: "Aleksandra Goryachkina", country: "RU", title: "GM", chesscom: "Goryachkina" },
  { name: "Kateryna Lagno", country: "RU", title: "GM", chesscom: "KaterinaLagno" },
  { name: "Nana Dzagnidze", country: "GE", title: "GM", chesscom: "NanaDzagnidze" },
  { name: "Vaishali R", country: "IN", title: "GM", chesscom: "VaishaliR" },

  // ──────────────────────────────────────────────────────────────
  // Regional strong GMs (a sample across countries)
  // ──────────────────────────────────────────────────────────────
  { name: "Daniel Dardha", country: "BE", title: "GM", chesscom: "Daniel_Dardha" },
  { name: "Luis Paulo Supi", country: "BR", title: "GM", chesscom: "LPSupi" },
  { name: "Romain Edouard", country: "FR", title: "GM", chesscom: "ChessMood" },
  { name: "Nigel Short", country: "GB", title: "GM", chesscom: "NigelDShort" },
  { name: "Vasyl Ivanchuk", country: "UA", title: "GM", chesscom: "Ivanchuk" },
  { name: "Pavel Eljanov", country: "UA", title: "GM", chesscom: "Eljanov" },
  { name: "Anton Kovalyov", country: "AR", title: "GM", chesscom: "Kovalyov" },
  { name: "M. Amin Tabatabaei", country: "IR", title: "GM", chesscom: "AminTabatabaei" },
  { name: "Sam Sevian", country: "US", title: "GM", chesscom: "samsevian" },
  { name: "Daniel Naroditsky — remembered", country: "US", title: "GM", chesscom: "DanielNaroditsky", note: "RIP", tag: "content" },

  // ──────────────────────────────────────────────────────────────
  // Legends / notable veterans
  // ──────────────────────────────────────────────────────────────

  // ──────────────────────────────────────────────────────────────
  // Fast-rising juniors
  // ──────────────────────────────────────────────────────────────
  { name: "Aydin Suleymanli", country: "AZ", title: "GM", chesscom: "AydinSuleymanli" },
  { name: "Frederik Svane", country: "DE", title: "GM", chesscom: "FrederikSvane" },
  { name: "Savitha Shri B", country: "IN", title: "IM", chesscom: "savithasri" },

  // ──────────────────────────────────────────────────────────────
  // Smaller streamers / community regulars
  // ──────────────────────────────────────────────────────────────
  { name: "Andras Toth", country: "HU", title: "IM", chesscom: "AndrasToth", tag: "streamer" },
  { name: "Alex Colovic", country: "MK", title: "GM", chesscom: "AlexColovic", tag: "streamer" },
  { name: "Peter Leko", country: "HU", title: "GM", chesscom: "PeterLeko", tag: "streamer" },
  { name: "Tryfon Gavriel (Kingscrusher)", country: "GB", title: "FM", chesscom: "Kingscrusher", tag: "streamer" },
  { name: "Sam Copeland", country: "US", title: "IM", chesscom: "SamCopeland", tag: "streamer" },
  { name: "Daniel Stellwagen", country: "NL", title: "GM", chesscom: "stellwagen" },
  { name: "Baskaran Adhiban", country: "IN", title: "GM", chesscom: "thechesspuffin" },
  { name: "Parimarjan Negi", country: "IN", title: "GM", chesscom: "parimarjan" },
  { name: "Pentala Harikrishna", country: "IN", title: "GM", chesscom: "PHarikrishna" },
  { name: "Zurab Azmaiparashvili", country: "GE", title: "GM", chesscom: "Azmaiparashvili" },
  { name: "Maxim Rodshtein", country: "IL", title: "GM", chesscom: "rodshtein" },
  { name: "Boris Grachev", country: "RU", title: "GM", chesscom: "Grach" },
  { name: "Ediz Gurel", country: "TR", title: "IM", chesscom: "EdizGurel", tag: "top" },
  { name: "Hrant Melkumyan", country: "AM", title: "GM", chesscom: "Melkumyan" },
  { name: "Karen Grigoryan", country: "AM", title: "GM", chesscom: "Karen-Grigoryan" },
  { name: "Marin Bosiocic", country: "HR", title: "GM", chesscom: "bosiocic" },
];

export function playerCountries(): string[] {
  const set = new Set<string>();
  for (const p of POPULAR_PLAYERS) set.add(p.country);
  return Array.from(set).sort();
}
