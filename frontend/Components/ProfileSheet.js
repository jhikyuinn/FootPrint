import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Avatar from './Avatar';
import common, { colors } from '../lib/styles';

// Another member's profile, opened from their photo in the chat. name is their account alias.
function ProfileSheet({name, photo, bio, onClose}) {
  return (
    <View style={common.sheet}>
      <View style={common.sheetHead}>
        <Text style={common.sheetTitle}>Profile</Text>
        <TouchableOpacity onPress={onClose} accessibilityLabel="Close profile">
          <Ionicons name="close-outline" size={30} color={colors.text} />
        </TouchableOpacity>
      </View>
      <View style={styles.body}>
        <Avatar photo={photo} name={name} size={120}/>
        <Text style={[common.label, styles.label]}>ID</Text>
        <Text style={[common.boldText, styles.name]}>{name}</Text>
        <Text style={styles.bio}>{bio || "No introduction yet."}</Text>
      </View>
    </View>
  );
}

export default ProfileSheet;

const styles = StyleSheet.create({
  body:{
    alignItems:"center",
    marginTop:24,
  },
  label:{
    marginTop:20,
  },
  name:{
    fontSize:22,
    marginTop:6,
  },
  bio:{
    color:colors.subtext,
    marginTop:12,
    textAlign:"center",
    width:"80%",
  },
});
