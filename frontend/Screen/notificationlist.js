import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import common, { colors } from '../lib/styles';

// One pending invitation: { RoomNumber, From, Key, ... }. Key is set for an encrypted room.
const NotificationList = ({ invite, onAnswer }) => {
    return (
        <View style={common.card}>
            <View style={styles.info}>
                <Text style={common.label}>INVITED TO {invite.Key ? "ENCRYPTED ROOM" : "ROOM"}</Text>
                <Text style={[common.alarmText, styles.line]}>{invite.RoomNumber}</Text>
                <Text style={common.label}>FROM</Text>
                <Text style={common.alarmText}>{invite.From}</Text>
            </View>
            <View>
                <TouchableOpacity style={styles.button} onPress={() => onAnswer(invite, true)}>
                    <Ionicons name="enter-outline" size={28} color={colors.primary}/>
                    <Text style={styles.text}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.button} onPress={() => onAnswer(invite, false)}>
                    <Ionicons name="close-circle-outline" size={28} color={colors.subtext}/>
                    <Text style={styles.text}>Decline</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default NotificationList;

const styles = StyleSheet.create({
    info:{
        flex:1,
    },
    line:{
        marginBottom:8,
    },
    button:{
        alignItems:"center",
        marginVertical:4,
    },
    text:{
        fontSize:11,
        color:colors.subtext,
    },
});
