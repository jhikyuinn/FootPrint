import React from 'react';
import { StyleSheet, Text, View, TextInput,KeyboardAvoidingView,TouchableOpacity, ScrollView} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const List = (props) => {

    console.log("🎅"+JSON.stringify(props)+"🎅")

    const EntranceBtn=(roomnumbericon)=>{
        props.navigation.navigate("Chat", {
            alias:alias,
            roomState: {"RoomState":roomnumbericon},
            pair: pair
        });
    }

    return (
        <>
        <View style={styles.alarm}>
            <Ionicons name="trail-sign-outline" size={18} color={"black"}/><Text style={styles.Textsize2}>Room : studyroom</Text>
            <Ionicons name="people-outline" size={18} color={"black"}/><Text style={styles.Textsize2}>Host : {props.value}</Text>
            <TouchableOpacity onPress={() => EntranceBtn(props.enterroomnumber)} style={{marginLeft:"80%"}}>
                <Ionicons name="enter-outline" size={35} color={"black"}/>
            </TouchableOpacity>
        </View> 
        <View style={styles.alarm}>
            <Ionicons name="trail-sign-outline" size={18} color={"black"}/><Text style={styles.Textsize2}>Room : graduate</Text>
            <Ionicons name="people-outline" size={18} color={"black"}/><Text style={styles.Textsize2}>Host : {props.value}</Text>
            <TouchableOpacity onPress={() => EntranceBtn(props.enterroomnumber)} style={{marginLeft:"80%"}}>
                <Ionicons name="enter-outline" size={35} color={"black"}/>
            </TouchableOpacity>
        </View> 
    </> 
    );
};

export default List;

const styles = StyleSheet.create({
    Textsize2:{
        fontSize:18,
        marginBottom:"3%",
        color:"black",
        fontWeight: 'bold'
    },
    alarm:{
        width:"100%",
        height:170,
        borderBottomWidth: 2,
        padding: 10,
    },
});