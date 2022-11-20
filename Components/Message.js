import { RabbitLegacy } from 'crypto-js';
import {View, Text, StyleSheet} from 'react-native';

function Message({message, name}) {
    console.log(message.name,name)
    const messageState = message.name === name ? 'sender' : 'receiver';

    return (
        <View >
            {messageState === 'sender' ? 
                <View style={styles.message_sender}>
                    <Text>{message.name}</Text>
                        <Text style={styles.message}>{message.message}</Text>
                        <Text style={styles.addtext}>{message.createdAt}</Text>
                </View> 
                : 
                 <View style={styles.message_receiver}>
                    <Text>{message.name}</Text>
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
        width:"30%",
        paddingRight: "2%",
        marginLeft: "70%",
    },
    message_receiver: {
        width:"30%", 
        paddingLeft: "2%",
        marginRight: "2%",
    },
    addtext:{
        fontSize:8,
        color:"rgb(23,36,65)",
      },
})