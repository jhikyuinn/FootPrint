//react-native
import { StyleSheet, Text, View, TextInput,KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import DesignButton from '../Components/DesignButton';
import { Header } from 'react-native-elements';
import Ionicons from '@expo/vector-icons/Ionicons';
import gun from '../lib/gun';
import common, { colors, fonts } from '../lib/styles';

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
        containerStyle={common.header}
        leftComponent={{text:"User Info",style:common.headerTitle}}
    />
    <View style={[common.home, styles.home]} >
          <View style={styles.avatar}>
            <Text style={styles.initial}>{(alias || "?").charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={[common.label, {marginTop:20}]}>SIGNED IN AS</Text>
          <Text style={[common.boldText, styles.Textsize2]}>{alias}</Text>
          <DesignButton text="Profile edit" buttonFunction={() => LogoutBtn()} width="60%" height={48} bgcolor={colors.primary} color={colors.primary} outline={true}/>
          <DesignButton text="Logout" buttonFunction={() => LogoutBtn()} width="60%" height={48} bgcolor={colors.primary} color={"white"} outline={false}/>
        
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
      fontSize:26,
      fontFamily:fonts.serif,
      marginTop:6,
      marginBottom:32
    },
    avatar:{
      marginTop:"12%",
      width:120,
      height:120,
      borderRadius:60,
      backgroundColor:colors.primary,
      alignItems:"center",
      justifyContent:"center",
    },
    initial:{
      fontSize:56,
      fontFamily:fonts.serif,
      color:colors.background,
    },
  });