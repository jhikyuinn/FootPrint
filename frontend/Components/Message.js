import { RabbitLegacy } from 'crypto-js';
import {View, Text, StyleSheet} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import common from '../lib/styles';

function Message({message, name}) {
    console.log(message.name,name)
    const isSender = message.name === name;

    return (
        <View >
            <View style={[styles.message, isSender ? styles.message_sender : styles.message_receiver]}>
                <View style={[common.row, styles.row]}>
                <Ionicons name="person-circle-outline" size={25} color="black" />
                <Text style={{marginLeft:"3%"}}>{message.name}</Text>
                </View>
                    <Text>{message.message}</Text>
                    <Text style={styles.addtext}>{message.createdAt}</Text>
            </View>
        </View>
    )
}

export default Message;


const styles = StyleSheet.create({
    message: {
        width:"40%",
        marginBottom:"3%",
    },
    message_sender: {
        paddingRight: "2%",
        marginLeft: "60%",
    },
    message_receiver: {
        paddingLeft: "2%",
        marginRight: "2%",
    },
    addtext:{
        fontSize:8,
        color:"rgb(23,36,65)",
    },
    row:{
        width:"90%",
        height:30,
    },
})