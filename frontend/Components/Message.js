import { RabbitLegacy } from 'crypto-js';
import {View, Text, StyleSheet} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

function Message({message, name}) {
    console.log(message.name,name)
    const messageState = message.name === name ? 'sender' : 'receiver';

    return (
        <View >
            {messageState === 'sender' ? 
                <View style={styles.message_sender}>
                    <View style={styles.row}>
                    <Ionicons name="person-circle-outline" size={25} color="black" />
                    <Text style={{marginLeft:"3%"}}>{message.name}</Text>
                    </View>
                        <Text style={styles.message}>{message.message}</Text>
                        <Text style={styles.addtext}>{message.createdAt}</Text>
                </View> 
                : 
                <View style={styles.message_receiver}>
                    <View style={styles.row}>
                    <Ionicons name="person-circle-outline" size={25} color="black" />
                    <Text  style={{marginLeft:"3%"}}>{message.name}</Text>
                    </View>
                        <Text style={styles.message}>{message.message}</Text>
                        <Text style={styles.addtext}>{message.createdAt}</Text>
                </View>
            }
        </View>
    )
}

export default Message;


const styles = StyleSheet.create({
    message_sender: {
        width:"40%",
        paddingRight: "2%",
        marginLeft: "60%",
        marginBottom:"3%",
    },
    message_receiver: {
        width:"40%", 
        paddingLeft: "2%",
        marginRight: "2%",
        marginBottom:"3%",
    },
    addtext:{
        fontSize:8,
        color:"rgb(23,36,65)",
    },
    row:{ 
        width:"90%",
        height:30,
        flexDirection:"row",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "flex-start",
    },
})