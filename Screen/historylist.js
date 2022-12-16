import React from 'react';
import { StyleSheet, Text, View, TextInput,KeyboardAvoidingView,TouchableOpacity, ScrollView} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import axios from 'axios';

const HistoryList = (props) => {

    console.log("🎅"+JSON.stringify(props)+"🎅")

    const EntranceBtn=()=>{
        axios.get(`http://203.247.240.236:1206/api/query/Graduate`, {
        }).then((res) => {
            const Roomhistory=[]
            res.data.map((records)=>{
                Roomhistory.push([records.Value.roomnumber,records.Value.function,records.Value.hostid,records.Value.postid,records.Value.hash,records.Value.datetime,])
            })
//             window.alert(`
//             1 Record. 
//             TxId:db843562348708854ce85992f3088d33c6442fb4acbd3792f3a4782344efa215,
// Function: create,
// Hostid: james,
// Postid: james,
// Hash: 4ea5c508a6566e76240543f8feb06fd457777be39549c4016436afda65d2330e,
// Datetime: thu nov 24 2022 23:53:00 gmt+0900 (kst) 

//             2 Record.
//             TxId:a8048d7481103f33814008aef81303f29ed4c3b753ebde1ae0110438bb335b17,
// Function: enter,
// Hostid: james,
// Postid: kyu,
// Hash: d9207d7ebd7c9a7e24728a610ac77a94bc7ebaaa8bdb11473ca76e3fd69ff739,
// Datetime: fri nov 25 2022 00:01:08 gmt+0900 (kst)  
//             `)
        })
    }

    return (
        <>
        <View style={styles.alarm}>
            <Ionicons name="trail-sign-outline" size={18} color={"black"}/><Text style={styles.Textsize2}>Room : Graduate</Text>
            <Ionicons name="people-outline" size={18} color={"black"}/><Text style={styles.Textsize2}>Host : James</Text>
            <TouchableOpacity onPress={() => EntranceBtn(props.value[1])} style={{marginLeft:"80%"}}>
                <Ionicons name="receipt-outline" size={35} color={"black"}/>
            </TouchableOpacity>
        </View> 
    </> 
    );
};

export default HistoryList;

const styles = StyleSheet.create({
    Textsize2:{
        fontSize:18,
        marginBottom:"3%",
        color:"black",
        fontWeight: 'bold'
    },
    alarm:{
        width:"100%",
        height:160,
        borderBottomWidth: 2,
        padding: 10,
    },
});