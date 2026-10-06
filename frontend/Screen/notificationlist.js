import React from 'react';
import { StyleSheet, Text, View, TextInput,KeyboardAvoidingView,TouchableOpacity, ScrollView} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import common, { colors } from '../lib/styles';

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
        <View style={common.card}>
            <View>
                <Text style={common.label}>INVITED TO ROOM</Text>
                <Text style={[common.alarmText, styles.line]}>{props.value[1]}</Text>
                <Text style={common.label}>HOST</Text>
                <Text style={common.alarmText}>{props.value[0]}</Text>
            </View>
            <TouchableOpacity onPress={() => EntranceBtn(props.value[1])}>
                <Ionicons name="enter-outline" size={30} color={colors.primary}/>
            </TouchableOpacity>
        </View>
    </> 
    );
};

export default NotificationList;

const styles = StyleSheet.create({
    line:{
        marginBottom:8,
    },
});