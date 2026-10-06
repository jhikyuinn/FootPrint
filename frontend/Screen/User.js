//react-native
import WebviewCrypto from 'react-native-webview-crypto';
import 'react-native-get-random-values';

import { StyleSheet, Text, View, TextInput,KeyboardAvoidingView } from 'react-native';
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

function User({alias,password,pair,navigation}){
    
    const LogoutBtn = async () => {
        gun.user().leave();
        navigation.navigate('Main');
    }

    return(
        <KeyboardAvoidingView 
    style = {{ flex: 1 }}
    behavior={Platform.OS === "ios" ? "padding" : null}>

    <Header
        backgroundColor='#6c7bb8'
        leftComponent={{text:"User Info",style:{width:200,fontSize:35,color:"black"}}}
    />
    <View style={styles.home} >
          <Ionicons style={{marginTop:"20%"}} name="person-circle-outline" size={200}  color="black" />
          <Text style={styles.Textsize2}>Welcome! {alias}  </Text>
          <DesignButton text="Profile edit" buttonFunction={() => LogoutBtn()} width="30%" height="6%" bgcolor="white" color={"black"} outline={false}/>
          <DesignButton text="Logout" buttonFunction={() => LogoutBtn()} width="30%" height="6%" bgcolor="white" color={"black"} outline={false}/>
        
    </View>
      </KeyboardAvoidingView>
)
}
export default User;


const styles = StyleSheet.create({
    home:{
      alignItems: "center",
      width:"100%",
      height:"100%",
      backgroundColor:"#6c7bb8"
    },
    Textsize1:{
      fontSize:40,
      color:"white",
      fontWeight: 'bold'
    },
    Textsize2:{
      fontSize:18,
      color:"black",
      fontWeight: 'bold',
      marginTop:"10%",
      marginBottom:"10%"
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