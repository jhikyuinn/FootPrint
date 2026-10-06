import { RabbitLegacy } from 'crypto-js';
import {View, Text, StyleSheet} from 'react-native';
import { colors, fonts } from '../lib/styles';

function Message({message, name}) {
    console.log(message.name,name)
    const isSender = message.name === name;

    return (
        <View style={[styles.message, isSender ? styles.message_sender : styles.message_receiver]}>
            {!isSender && <Text style={styles.name}>{message.name}</Text>}
            <View style={[styles.bubble, isSender ? styles.bubble_sender : styles.bubble_receiver]}>
                <Text style={isSender ? styles.text_sender : styles.text_receiver}>{message.message}</Text>
            </View>
            <Text style={styles.addtext}>{message.createdAt}</Text>
        </View>
    )
}

export default Message;


const styles = StyleSheet.create({
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
