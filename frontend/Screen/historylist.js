import React from 'react';
import { StyleSheet, Text, View, TextInput,KeyboardAvoidingView,TouchableOpacity, ScrollView} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import axios from 'axios';
import { API_URL } from '../lib/config';
import common, { colors } from '../lib/styles';

// One room of the room list: props.room = { name, host }, props.unread = messages since this user last had it open
const HistoryList = (props) => {

    const EntranceBtn=()=>{
        props.navigation.navigate("Chat", { room: props.room.name });
    }

    // every record the ledger holds for this room
    const RecordBtn=()=>{
        axios.get(`${API_URL}/api/history/${props.room.name}`, {
        }).then((res) => {
            if(res.data.length === 0) {
                alert("No ledger records for " + props.room.name);
                return;
            }
            const Roomhistory=res.data.map((records, idx)=>
                (idx+1)+" Record.\n"+
                "TxId: "+records.TxId+"\n"+
                "Function: "+records.Value.function+"\n"+
                "Hostid: "+records.Value.hostid+"\n"+
                "Postid: "+records.Value.postid+"\n"+
                "Hash: "+records.Value.hash+"\n"+
                "Datetime: "+records.Value.datetime
            )
            alert(Roomhistory.join("\n\n"))
        }).catch((err) => {
            alert("Ledger history: "+err.message)
        })
    }

    return (
        <>
        <View style={common.card}>
            <View style={styles.info}>
                <Text style={common.label}>ROOM</Text>
                <View style={[styles.title, styles.line]}>
                    <Text style={common.alarmText}>{props.room.name}</Text>
                    {props.unread > 0 &&
                    <View style={styles.badge} accessibilityLabel={props.unread + " new messages"}>
                        <Text style={styles.badgeText}>{props.unread > 99 ? "99+" : props.unread}</Text>
                    </View>}
                </View>
                <Text style={common.label}>HOST</Text>
                <Text style={common.alarmText}>{props.room.host || "-"}</Text>
            </View>
            <TouchableOpacity style={styles.action} onPress={() => RecordBtn()}>
                <Ionicons name="receipt-outline" size={28} color={colors.accent}/>
            </TouchableOpacity>
            <TouchableOpacity style={styles.action} onPress={() => EntranceBtn()}>
                <Ionicons name="enter-outline" size={30} color={colors.primary}/>
            </TouchableOpacity>
        </View>
    </>
    );
};

export default HistoryList;

const styles = StyleSheet.create({
    info:{
        flex:1,
    },
    line:{
        marginBottom:8,
    },
    title:{
        flexDirection:"row",
        alignItems:"center",
    },
    badge:{
        marginLeft:8,
        minWidth:22,
        height:22,
        borderRadius:11,
        paddingHorizontal:6,
        backgroundColor:colors.primary,
        alignItems:"center",
        justifyContent:"center",
    },
    badgeText:{
        color:colors.surface,
        fontSize:12,
        fontWeight:"bold",
    },
    action:{
        marginLeft:14,
    },
});
