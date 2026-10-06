//react-native
import WebviewCrypto from 'react-native-webview-crypto';
import 'react-native-get-random-values';

import { StyleSheet, Text, View, TextInput,KeyboardAvoidingView,TouchableOpacity, ScrollView} from 'react-native';
import { useState, useEffect } from 'react';
import { Header } from 'react-native-elements';
import Ionicons from 'react-native-vector-icons/Ionicons';
import axios from 'axios';
import HistoryList from './historylist';

//gunDB
import "gun/lib/mobile.js";
import GUN from 'gun/gun';
import SEA from 'gun/sea';
import 'gun/lib/radix.js';
import 'gun/lib/radisk.js';
import 'gun/lib/store.js';
import AsyncStorage from '@react-native-async-storage/async-storage'
import asyncStore from "gun/lib/ras.js";

Gun({ store: asyncStore({ AsyncStorage }) })

const gun = new Gun('http://203.247.240.236:8765');

function Ready({alias,password,pair,navigation}){
    const [roomState, setRoom] = useState("");
    const [currentalias, setCurrentAlias] = useState("");

    const [roomenterinfo, setRoomenterInfo] = useState({
      enterroompostID:"",
      enterroomnumber:"",
    });

    const onChangeRoomHandler = (keyvalue,e) => {
        setRoom({
            [keyvalue]: e,
        })
    }

    useEffect(() => {
        authUser()
        history()
        console.log(roomenterinfo)
    }, [])

    const history=()=>{
      axios.get(`http://203.247.240.236:1206/api/query/${roomnumber}`, {
        }).then((res) => {
          const Roomhistory=[] 
            res.data.map((records) => {
              console.log(records.Value.postid)
            {records.Value.postid === alias && records.Value.function==="enter"?
              Roomhistory.push([records.Value.postid,records.Value.roomnumber]):
              <></>
            }
            setRoomenterInfo(Roomhistory)
            })
          })
        }
  
    const authUser = () => 
      new Promise((resolve, reject) => {
          gun.user().auth(alias, password, async res => {

              if(!res.err) {
                setCurrentAlias(res.put.alias);
                resolve({user: gun.user().pair(), err: res.err});
              } else {
                window.alert(res.err);
                resolve({user : gun.user().pair()});
              }
          })
      })
    const EntranceBtn=()=>{
      setRoom("")
        navigation.navigate("Chat", {
            alias:alias,
            roomState: roomState,
            pair: pair
        });
    }

  
  return(
    <KeyboardAvoidingView 
    style = {{ flex: 1 }}
    behavior={Platform.OS === "ios" ? "padding" : null}>

    <Header
        backgroundColor='#6c7bb8'
        leftComponent={{text:"Chat Search",style:{width:400,fontSize:35,color:"black"}}}
        />
        <View style={styles.home} >
          <View style={styles.row}>
          <TextInput  style={styles.input} type="text" placeholder="Room Number" value={roomState} name="Roomnumber" onChangeText={(e) => onChangeRoomHandler("RoomState", e)}/>
          <TouchableOpacity onPress={() => EntranceBtn()}>
              <Ionicons name="search-outline" size={35} color={"black"}/>
          </TouchableOpacity>
          </View>
          <View style={{marginTop:"12%",width:"90%"}}>
            <Text style={styles.Textsize3}>History </Text>
            <ScrollView style={{marginBottom:"18%",height:"70%"}}>
            <HistoryList key="qq" value="dd" navigation={navigation} alias={alias} pair={pair} /> 
              {/* {roomenterinfo && <Text>roomenterinfo.enterroomnumber</Text>!==""?
              <>
              {console.log("→"+JSON.stringify(roomenterinfo))}
              {Object.values(roomenterinfo).map((value,idx) => (<>{console.log("😊"+value)}<HistoryList key={idx} value={value} navigation={navigation} alias={alias} pair={pair} /></>))}
              </>:
              <><HistoryList key={idx} value="dd" navigation={navigation} alias={alias} pair={pair} /> </>
            } */}
            </ScrollView>
          </View>
        </View>
        </KeyboardAvoidingView>
      )
  }
export default Ready;


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
      color:"white",
      fontWeight: 'bold'
    },
    Textsize2:{
      fontSize:18,
      marginBottom:"3%",
      color:"black",
      fontWeight: 'bold'
    },
    Textsize3:{
      marginTop:"10%",
      marginBottom:"5%",
      fontSize:20,
      justifyContent:"flex-start",
      alignItems:"flex-start",
      color:"black",
      fontWeight: 'bold'
    },
    alarm:{
      width:"90%",
      height:130,
      borderBottomWidth: 2,
      padding: 10,
  },
    input: {
      backgroundColor:"white",
      borderBottomWidth: 2,
      borderStyle: 'solid',
      width:"80%",
      height:40,
      marginRight:10,
      padding: 10,
      borderRadius:10,
      marginBottom:10,
    },
    row:{ 
      position:"absolute",
      top:"5%",
      width:"80%",
      flexDirection:"row",
      flexWrap: "wrap",
      alignItems: "center",
      justifyContent: "center",
    },
  });