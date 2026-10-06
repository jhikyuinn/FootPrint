import React from 'react';
import { StyleSheet, Text, View, TextInput,KeyboardAvoidingView,TouchableOpacity, ScrollView} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import axios from 'axios';
import common, { colors } from '../lib/styles';

// One room of the room list: props.room = { name, host }
const HistoryList = (props) => {

    const EntranceBtn=()=>{
        props.navigation.navigate("Chat", {
            alias:props.alias,
            roomState: {"RoomState":props.room.name},
            pair: props.pair
        });
    }

    // every record the ledger holds for this room
    const RecordBtn=()=>{
        axios.get(`http://localhost:1206/api/history/${props.room.name}`, {
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
                <Text style={[common.alarmText, styles.line]}>{props.room.name}</Text>
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
    action:{
        marginLeft:14,
    },
});
