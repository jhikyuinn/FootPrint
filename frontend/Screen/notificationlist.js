import React from 'react';
import { StyleSheet, Text, View, TextInput,KeyboardAvoidingView,TouchableOpacity, ScrollView} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import common from '../lib/styles';

const NotificationList = (props) => {

    const EntranceBtn=(roomnumbericon)=>{
        props.navigation.navigate("Chat", {
            alias:props.alias,
            roomState: {"RoomState":roomnumbericon},
            pair: props.pair
        });
    }

    return (
        <>
        <View style={[common.alarm, styles.alarm]}>
            <Ionicons name="trail-sign-outline" size={18} color={"black"}/><Text style={common.alarmText}>Room : {props.value[1]}</Text>
            <Ionicons name="people-outline" size={18} color={"black"}/><Text style={common.alarmText}>Host : {props.value[0]}</Text>
            <TouchableOpacity onPress={() => EntranceBtn(props.value[1])} style={{marginLeft:"80%"}}>
                <Ionicons name="enter-outline" size={35} color={"black"}/>
            </TouchableOpacity>
        </View> 
    </> 
    );
};

export default NotificationList;

const styles = StyleSheet.create({
    alarm:{
        height:180,
    },
});