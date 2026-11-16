// First projects.yml, from INDEX.md tags (data_contract §5). Plain data: the phone writes it on
// first launch, `pp sync` on the Mac puts it into the entries repo when the repo has none yet.
export const SEED_REGISTRY = {
  contract: 1,
  projects: [
    { tag: "light_plan", title: "Light Plan", icon: "sun.max", color: "orange", aliases: ["light plan", "лайт план", "лайтплан", "lightplan"], repo: "alexeynovopashin-lab/Light-Plan", pinned: true },
    { tag: "plan_projekt", title: "PlanProjekt", icon: "mic", color: "green", aliases: ["план проект", "plan projekt", "планпроект"], pinned: true },
    { tag: "event_os", title: "Event OS", icon: "calendar.badge", color: "blue", aliases: ["event", "ивент"] },
    { tag: "broni_os", title: "BroniOS", icon: "building.2", color: "indigo", aliases: ["бронь ос", "брони ос", "бронеос"] },
    { tag: "cursed_sword", title: "Проклятый меч", icon: "shield", color: "red", aliases: ["проклятый меч", "меч", "мечу"] },
    { tag: "color_harmony", title: "Цветовой круг", icon: "paintpalette", color: "purple", aliases: ["круг", "колор", "цветовой круг"] },
    { tag: "tomson_site", title: "Сайт Томсона", icon: "camera.aperture", color: "pink", aliases: ["томсон", "сайт томсона"] },
    { tag: "sun_compass", title: "Sun Compass", icon: "location.north", color: "yellow", aliases: ["сан компас", "компас"] },
    { tag: "camerateka", title: "Камератека", icon: "books", color: "teal", aliases: ["камератека"] },
    { tag: "alice_soulledger", title: "Склеп", icon: "theatermasks", color: "gray", aliases: ["склеп", "алиса"] }
  ]
};
