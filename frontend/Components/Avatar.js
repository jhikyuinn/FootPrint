import { Image, View, Text, StyleSheet } from 'react-native';
import { colors, fonts } from '../lib/styles';

// The profile photo, or the first letter of the name when there is none.
// photo must already have passed cleanProfile (lib/profileData.js).
function Avatar({photo, name, size}) {
  const round = { width: size, height: size, borderRadius: size / 2 };
  if(photo) { return <Image source={{ uri: photo }} style={round} accessibilityLabel={name + " profile photo"}/>; }
  return (
    <View style={[round, styles.fallback]}>
      <Text style={[styles.initial, { fontSize: size * 0.46 }]}>{(name || "?").charAt(0).toUpperCase()}</Text>
    </View>
  );
}

export default Avatar;

const styles = StyleSheet.create({
  fallback:{
    backgroundColor:colors.primary,
    alignItems:"center",
    justifyContent:"center",
  },
  initial:{
    fontFamily:fonts.serif,
    color:colors.background,
  },
});
