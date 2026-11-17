// Which copy of the app this is. Alexey's beta ships this file as is. tools/build_friend.sh lays
// flavors/friend/ over the beta for the clean copy a friend tests with his own GitHub
// (Alexey, 17.11: «Сделай отдельную чистую версию»): same code, only these values differ.
export const FLAVOR = {
  id: "own",
  db: "planprojekt-beta",            // IndexedDB name: each copy keeps its own entries
  key: "pp.",                        // localStorage prefix: key, theme, sort order
  by: "alexey:iphone",               // `by` of events made on the phone (data_contract §3)
  byMac: "alexey:mac",
  defaultRepo: "alexeynovopashin-lab/planprojekt-entries",
  setup: false                       // true: the setup instruction is the first screen until GitHub works
};
export const key = name => FLAVOR.key + name;
