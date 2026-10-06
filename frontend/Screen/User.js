//react-native
import { StyleSheet, Text, View, TextInput,KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import DesignButton from '../Components/DesignButton';
import { Header } from 'react-native-elements';
import Ionicons from '@expo/vector-icons/Ionicons';
import gun from '../lib/gun';
import common, { colors } from '../lib/styles';

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
        backgroundColor={colors.background}
        leftComponent={{text:"User Info",style:{width:200,fontSize:35,color:"black"}}}
    />
    <View style={[common.home, styles.home]} >
          <Ionicons style={{marginTop:"20%"}} name="person-circle-outline" size={200}  color="black" />
          <Text style={[common.boldText, styles.Textsize2]}>Welcome! {alias}  </Text>
          <DesignButton text="Profile edit" buttonFunction={() => LogoutBtn()} width="30%" height="6%" bgcolor="white" color={"black"} outline={false}/>
          <DesignButton text="Logout" buttonFunction={() => LogoutBtn()} width="30%" height="6%" bgcolor="white" color={"black"} outline={false}/>
        
    </View>
      </KeyboardAvoidingView>
)
}
export default User;


const styles = StyleSheet.create({
    home:{
      justifyContent: "flex-start",
    },
    Textsize2:{
      fontSize:18,
      marginTop:"10%",
      marginBottom:"10%"
    },
  });