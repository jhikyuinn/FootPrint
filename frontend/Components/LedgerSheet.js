import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import common, { colors, fonts } from '../lib/styles';
import { checkRecords } from '../lib/messages';

// Says whether the chat still matches its records. matches[i] is null for a record without a hash (entries).
function summary(hash, records, matches) {
  const hashed = records.filter((record, i) => matches[i] !== null);
  if(hashed.length === 0) { return "No hash has been recorded for this room yet."; }
  const changed = matches.indexOf(false);
  if(changed !== -1) { return "Record #"+(changed+1)+" and the hashed records after it no longer match: earlier messages were changed."; }
  if(hashed[hashed.length-1].Value.hash === hash) { return "The current chat matches the latest recorded hash."; }
  return "Every recorded hash matches the start of the current chat. The newest messages are not recorded yet.";
}

// The Check Hash sheet: hash is the current chat's hash, records the room's ledger history (oldest first),
// messages the chat's messages. Each hashed record is checked against the messages it covered.
function LedgerSheet({hash, records, messages, onClose}) {
  const matches = checkRecords(messages, records);
  return (
    <View style={common.sheet}>
      <View style={common.sheetHead}>
        <Text style={common.sheetTitle}>Ledger records</Text>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close-outline" size={30} color={colors.text} />
        </TouchableOpacity>
      </View>
      <Text style={common.label}>CURRENT HASH</Text>
      <Text style={styles.hash}>{hash}</Text>
      <Text style={common.sheetSummary}>{summary(hash, records, matches)}</Text>
      <Text style={[common.label, styles.count]}>{records.length} RECORDS · NEWEST FIRST</Text>
      <ScrollView>
        {records.map((record, idx) => {
          const match = matches[idx];
          return (
            <View key={record.TxId} style={[common.card, styles.card, !match && styles.cardOther]}>
              <Text style={common.label}>#{idx+1} · {String(record.Value.function).toUpperCase()} · {record.Value.postid}</Text>
              <Text style={styles.time}>{new Date(record.Timestamp).toLocaleString()}</Text>
              <Text style={styles.hash}>{record.Value.hash || "(no hash)"}</Text>
              {match && <Text style={styles.match}>✓ MATCHES THE CURRENT CHAT</Text>}
              {match === false && <Text style={[styles.match, styles.mismatch]}>✗ DOES NOT MATCH THE CURRENT CHAT</Text>}
            </View>
          );
        }).reverse()}
      </ScrollView>
    </View>
  );
}

export default LedgerSheet;

const styles = StyleSheet.create({
  count:{
    marginBottom:10,
    paddingBottom:8,
    borderBottomWidth:1,
    borderColor:colors.border,
  },
  card:{
    flexDirection:"column",
    alignItems:"stretch",
  },
  cardOther:{
    borderLeftColor:colors.border,
  },
  hash:{
    fontFamily:fonts.mono,
    fontSize:12,
    color:colors.text,
    marginTop:4,
  },
  time:{
    fontSize:14,
    fontWeight:'600',
    color:colors.text,
    marginTop:6,
  },
  match:{
    fontFamily:fonts.mono,
    fontSize:11,
    letterSpacing:1,
    color:colors.accent,
    marginTop:8,
  },
  mismatch:{
    color:colors.subtext,
  },
});
