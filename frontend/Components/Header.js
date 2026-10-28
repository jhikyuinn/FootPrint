// A screen's top bar: left, center and right slots below the status bar.
// Same layout as the react-native-elements Header it replaces (#43): slots 1 : 3 : 1, a bottom border.
import { View, StatusBar, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../lib/styles';

export default function Header({ left, center, right, backgroundColor = colors.background }) {
  return (
    <>
      <StatusBar translucent={true} backgroundColor={backgroundColor} />
      <View style={[styles.bar, { backgroundColor }]}>
        <SafeAreaView edges={['left', 'top', 'right']} style={styles.row}>
          <View style={[styles.side, { alignItems: 'flex-start' }]}>{left}</View>
          <View style={styles.center}>{center}</View>
          <View style={[styles.side, { alignItems: 'flex-end' }]}>{right}</View>
        </SafeAreaView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  row: {
    width: '100%',
    flexDirection: 'row',
  },
  side: {
    flex: 1,
  },
  center: {
    flex: 3,
    alignItems: 'center',
  },
});
