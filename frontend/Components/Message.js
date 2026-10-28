import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import Avatar from './Avatar';
import { colors, fonts } from '../lib/styles';

// mine: the message was sent by this account (by key, since two accounts can share a name)
// photo: the sender's checked profile photo; onPressSender opens their profile
function Message({message, mine, photo, onPressSender}) {
    const body = (
        <View style={[styles.message, mine ? styles.message_sender : styles.message_receiver]}>
            {!mine && <Text style={styles.name}>{message.name}</Text>}
            <View style={[styles.bubble, mine ? styles.bubble_sender : styles.bubble_receiver]}>
                <Text style={mine ? styles.text_sender : styles.text_receiver}>{message.message}</Text>
            </View>
            <Text style={styles.addtext}>{message.createdAt}</Text>
        </View>
    );
    if(mine) { return body; }
    return (
        <View style={styles.row}>
            <TouchableOpacity onPress={onPressSender} accessibilityLabel={"Open " + message.name + "'s profile"} style={styles.avatar}>
                <Avatar photo={photo} name={message.name} size={34}/>
            </TouchableOpacity>
            {body}
        </View>
    )
}

export default Message;


const styles = StyleSheet.create({
    row: {
        flexDirection:"row",
        alignItems:"flex-start",
    },
    avatar: {
        marginRight:8,
        marginTop:2,
    },
    message: {
        maxWidth:"78%",
        marginBottom:12,
    },
    message_sender: {
        alignSelf: "flex-end",
        alignItems: "flex-end",
    },
    message_receiver: {
        alignSelf: "flex-start",
        alignItems: "flex-start",
    },
    name:{
        fontSize:12,
        fontWeight:'600',
        color: colors.subtext,
        marginBottom:4,
        marginLeft:4,
    },
    bubble:{
        paddingVertical:9,
        paddingHorizontal:14,
        borderRadius:14,
    },
    bubble_sender:{
        backgroundColor: colors.primary,
        borderBottomRightRadius:4,
    },
    bubble_receiver:{
        backgroundColor: colors.surface,
        borderWidth:1,
        borderColor: colors.border,
        borderBottomLeftRadius:4,
    },
    text_sender:{
        fontSize:15,
        color: colors.background,
    },
    text_receiver:{
        fontSize:15,
        color: colors.text,
    },
    addtext:{
        fontFamily: fonts.mono,
        fontSize:10,
        color: colors.subtext,
        marginTop:3,
        marginHorizontal:4,
    },
})
