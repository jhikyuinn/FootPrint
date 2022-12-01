import React from 'react';
import { StyleSheet, Text, View, TextInput,KeyboardAvoidingView,TouchableOpacity, ScrollView} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const HistoryList = (props) => {

    console.log("🎅"+JSON.stringify(props)+"🎅")

    const EntranceBtn=(roomnumbericon)=>{
        props.navigation.navigate("Chat", {
            alias:props.alias,
            roomState: {"RoomState":roomnumbericon},
            pair: props.pair
        });
    }

    return (
        <>
        <View style={styles.alarm}>
            <Ionicons name="trail-sign-outline" size={18} color={"black"}/><Text style={styles.Textsize2}>Room : {props.value[1]}</Text>
            <Ionicons name="people-outline" size={18} color={"black"}/><Text style={styles.Textsize2}>Host : {props.value[0]}</Text>
            <TouchableOpacity onPress={() => EntranceBtn(props.value[1])} style={{marginLeft:"80%"}}>
                <Ionicons name="enter-outline" size={35} color={"black"}/>
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