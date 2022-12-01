import WebviewCrypto from 'react-native-webview-crypto';
import 'react-native-get-random-values';
import { StyleSheet, Image,Text, View, TextInput,KeyboardAvoidingView } from 'react-native';
import { useState, useEffect } from 'react';
import "gun/lib/mobile.js";
import GUN from 'gun/gun';
import SEA from 'gun/sea';
import 'gun/lib/radix.js';
import 'gun/lib/radisk.js';
import 'gun/lib/store.js';
import AsyncStorage from '@react-native-async-storage/async-storage'
import asyncStore from 'gun/lib/ras.js';
import DesignButton from '../Components/DesignButton'


Gun({ store: asyncStore({ AsyncStorage }) })

const gun = new Gun('http://203.247.240.236:8765/gun');

const timer = () => {
  let current = Date.now();
  return () => {
    const res = `${(Date.now() - current) / 1000} seconds`;
    current = Date.now();
    return res;
  };
};

function Main({navigation}) {
  const [userForm, setUserForm] = useState({
    alias: "",
    password: "",
  });
  const [alias, setAlias] = useState('');

  const clearStorage = () => {
    AsyncStorage.clear();
  };

  useEffect(() => {
    if(gun.user().is) {
        gun.user(gun.user().is.pub).once((res) => {
            setAlias(res.alias);
        });
    }
  }, [])

  const createUser = () => 
    new Promise((resolve, reject) => {
        gun.user().create(userForm.alias, userForm.password, async res => {
            resolve(true);
        })
        alert("Hello "+userForm.alias + "\nLogin now")
    })
  

  const authUser = () => 
    new Promise((resolve, reject) => {
        gun.user().auth(userForm.alias, userForm.password, async res => {
            if(!res.err) {
              setAlias(res.put.alias);
              navigation.navigate("Menu", {
                  alias: res.put.alias,
                  password: userForm.password,
                  pair: res.sea,
              });
              resolve({user: gun.user().pair(), err: res.err});
            } else {
              window.alert(res.err);
              resolve({user: gun.user().pair()});
            }
        })
    })
  

  const signUpBtn = async () => {
    const getElapsed = timer();
    await createUser();
    console.log('created', getElapsed());
  }

  const loginBtn = async () => {
    const getElapsed = timer();
    await authUser();
    console.log('authenticated', getElapsed());
  }

  const onChangeHandler = (keyValue, e) => {
    setUserForm({
      ...userForm,
      [keyValue]: e,
    })
  }

  return(
    <KeyboardAvoidingView 
    style = {{ flex: 1 }}
    behavior={Platform.OS === "ios" ? "padding" : null}>
    <WebviewCrypto />
    <View style={styles.home}>
      <View style={styles.row}>
    <Text style={styles.Textsize1}>Foot Print {"\n"}{"\n"}</Text>
    <Image style={styles.image} source={require("../assets/footprint.png")} />
    </View>
    <TextInput  style={styles.input1} type="text" placeholder="ID" name="alias" value={userForm.alias} onChangeText={(e) => onChangeHandler("alias", e)}/>
    <TextInput  style={styles.input2} type="password" placeholder="Password" value={userForm.password} name="password" secureTextEntry={true} onChangeText={(e) => onChangeHandler("password", e)}/>
    <DesignButton text="Login" disabled={!((userForm.alias).length > 0 && (userForm.password).length > 5)} buttonFunction={() =>loginBtn()} width="60%" height={40} bgcolor="white" color={"black"} outline={false} />
    <DesignButton text="SignUp" disabled={!((userForm.alias).length > 0 && (userForm.password).length > 5)} buttonFunction={() => signUpBtn()} width="60%" height={40} bgcolor="white" color={"black"} outline={false} />
  </View>
  </KeyboardAvoidingView>
    
    )
}

export default Main;
const styles = StyleSheet.create({
  image:{
    width:50,
    height: 50,
  },
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
  input1: {
    color:"black",
    borderBottomWidth: 2,
    borderStyle: 'solid',
    borderRadius:10,
    width:"60%",
    height:40,
    marginRight:10,
    marginBottom:"5%",
    padding: 10,
  },
  input2: {
    color:"black",
    borderBottomWidth: 2,
    borderStyle: 'solid',
    borderRadius:10,
    width:"60%",
    height:40,
    marginRight:10,
    marginBottom:"10%",
    padding: 10,
  },
  row:{ 
    width:"80%",
    height:"14%",
    marginBottom:"10%",
    flexDirection:"row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
  },
});