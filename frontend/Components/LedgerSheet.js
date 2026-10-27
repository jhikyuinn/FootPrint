import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import common, { colors, fonts } from '../lib/styles';

// Says which ledger record the current chat matches. Records without a hash (entries, invitations) are skipped.
function summary(hash, records) {
  const hashed = records.filter((record) => record.Value.hash);
  if(hashed.length === 0) { return "No hash has been recorded for this room yet."; }
  if(hashed[hashed.length-1].Value.hash === hash) { return "The current chat matches the latest recorded hash."; }
  const match = records.findIndex((record) => record.Value.hash === hash);
  if(match !== -1) { return "The current chat matches record #"+(match+1)+", but newer hashes were recorded after it."; }
  return "The current chat matches none of the recorded hashes.";
}

// The Check Hash sheet: hash is the current chat's hash, records the room's ledger history, oldest first
function LedgerSheet({hash, records, onClose}) {
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
      <Text style={common.sheetSummary}>{summary(hash, records)}</Text>
      <Text style={[common.label, styles.count]}>{records.length} RECORDS · NEWEST FIRST</Text>
      <ScrollView>
        {records.map((record, idx) => {
          const matches = record.Value.hash !== "" && record.Value.hash === hash;
          return (
            <View key={record.TxId} style={[common.card, styles.card, !matches && styles.cardOther]}>
              <Text style={common.label}>#{idx+1} · {String(record.Value.function).toUpperCase()} · {record.Value.postid}</Text>
              <Text style={styles.time}>{new Date(record.Timestamp).toLocaleString()}</Text>
              <Text style={styles.hash}>{record.Value.hash || "(no hash)"}</Text>
              {matches && <Text style={styles.match}>✓ MATCHES THE CURRENT CHAT</Text>}
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
});
