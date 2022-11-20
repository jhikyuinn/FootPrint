//react-native
import WebviewCrypto from 'react-native-webview-crypto';
import 'react-native-get-random-values';

import { StyleSheet, Text, View, TouchableOpacity,KeyboardAvoidingView, Touchable } from 'react-native';
import { useState, useEffect } from 'react';
import DesignButton from '../Components/DesignButton';
import { Header } from 'react-native-elements';
import Ionicons from 'react-native-vector-icons/Ionicons';

//gunDB
import "gun/lib/mobile.js";
import GUN from 'gun/gun';
import SEA from 'gun/sea';
import 'gun/lib/radix.js';
import 'gun/lib/radisk.js';
import 'gun/lib/store.js';
import AsyncStorage from '@react-native-async-storage/async-storage'
import asyncStore from "gun/lib/ras.js";
import { RabbitLegacy } from 'crypto-js';
import { withTheme } from 'react-native-elements';

Gun({ store: asyncStore({ AsyncStorage }) })
const gun = new Gun("http://203.247.240.236:8765");  

function Notification({alias,password,pair,navigation}){
    const [roomState, setRoom] = useState("");

    const onChangeRoomHandler = (keyvalue,e) => {
        setRoom({
            [keyvalue]: e,
        })
    }
    const EntranceBtn=()=>{
        console.log(alias,roomState,pair)
        navigation.navigate("Chat", {
            alias:alias,
            roomState: {"RoomState": "Study"},
            pair: pair,
            navigation: navigation

        });

    }

    return(
        <KeyboardAvoidingView 
    style = {{ flex: 1 }}
    behavior={Platform.OS === "ios" ? "padding" : null}>

    <Header
        backgroundColor='#6c7bb8'
        leftComponent={{text:"Notification",style:{width:200,fontSize:35,color:"black"}}}
        />
        <View style={styles.home} >
        <View style={styles.alarm}>
          <Text style={styles.Textsize2}>Host : Younglee</Text>
          <Text style={styles.Textsize2}>Room : leele</Text>
          <TouchableOpacity onPress={() => EntranceBtn()} style={{marginLeft:"80%"}}>
              <Ionicons name="enter-outline" size={35} color={"black"}/>
          </TouchableOpacity>
        </View>
        </View>


      </KeyboardAvoidingView>
)
}
export default Notification;


const styles = StyleSheet.create({
    home:{
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:"#6c7bb8",
      width:"100%",
      height:"100%"
    },
    Textsize1:{
      fontSize:40,
      color:"black",
      fontWeight: 'bold'
    },
    Textsize2:{
      fontSize:18,
      color:"black",
      fontWeight: 'bold'
    },
    alarm:{
      width:"90%",
      height:"20%",
      borderBottomWidth: 2,
      padding: 10,
  },
    input: {
      backgroundColor:"white",
      borderBottomWidth: 2,
      borderStyle: 'solid',
      width:"60%",
      height:40,
      marginRight:10,
      padding: 10,
    },
    row:{ 
      width:"80%",
      flexDirection:"row",
      flexWrap: "wrap",
      alignItems: "center",
      justifyContent: "center",
    },
  });