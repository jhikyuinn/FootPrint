import { StyleSheet, Platform } from 'react-native';

// every screen takes its colors from here: paper, ink, and a stamp red
// that is only used for things written to or read from the ledger
export const colors = {
  background: "#F3EFE6",
  surface: "#FBF9F4",
  panel: "#FBF9F4",
  primary: "#22263A",
  primarySoft: "#E6E1D4",
  accent: "#B5452F",
  text: "#22263A",
  subtext: "#6F6858",
  border: "#D9D2C2",
};

// serif for titles, mono for anything that reads like a record (labels, times, hashes)
export const fonts = {
  serif: Platform.select({ ios: "Georgia", android: "serif", default: "serif" }),
  mono: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
};

export default StyleSheet.create({
  home:{
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
    width:"100%",
    height:"100%"
  },
  screen:{
    flex: 1,
    backgroundColor: colors.background,
  },
  header:{
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle:{
    width:300,
    fontSize:26,
    fontWeight: 'bold',
    fontFamily: fonts.serif,
    color: colors.text,
  },
  row:{
    flexDirection:"row",
    flexWrap: "wrap",
    alignItems: "center",
  },
  input:{
    height:48,
    paddingHorizontal: 14,
    borderRadius:8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: 16,
  },
  boldText:{
    color: colors.text,
    fontWeight: 'bold'
  },
  label:{
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1.5,
    color: colors.subtext,
  },
  // a record card: the red edge marks it as a ledger entry
  card:{
    flexDirection:"row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
    padding: 16,
    marginBottom: 12,
  },
  alarmText:{
    fontSize:17,
    color: colors.text,
    fontWeight: '600'
  },
});
