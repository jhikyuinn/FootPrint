import React, {useState,useEffect,useReducer} from 'react';
import CryptoJS from "crypto-js";
import axios from 'axios';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {Modal, View, Text,TextInput,StyleSheet,ScrollView, KeyboardAvoidingView, ActivityIndicator} from 'react-native';
import { Header, withTheme } from 'react-native-elements';
import { TouchableOpacity } from 'react-native';

import WebviewCrypto from 'react-native-webview-crypto';
import 'react-native-get-random-values';
import "gun/lib/mobile.js";
import GUN from 'gun/gun';
import SEA from 'gun/sea';
import 'gun/lib/radix.js';
import 'gun/lib/radisk.js';
import 'gun/lib/store.js';
import AsyncStorage from '@react-native-async-storage/async-storage'
import asyncStore from 'gun/lib/ras.js';

import Message from '../Components/Message';


Gun({ store: asyncStore({ AsyncStorage }) })

const gun = new Gun('http://203.247.240.236:8765/gun');

const initialState = {
  messages: [],
};

const reducer = (state, message) => {
    return {
      messages: [ ...state.messages,message],
    };
  };

function Chat({route,navigation}){
    const {alias}=route.params
    const {pair}=route.params
    const {roomState}=route.params

    const [isModalVisible, setIsModalVisible] = useState(false);
    const [state, dispatch] = useReducer(reducer, initialState);
    const [originalhash, setoriginalhash] = useState("");
    const [messageState, setMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [userList, setUserList] = useState([]);
    const [messageList, setMessageList] = useState([]);

    const userInfo = {
      alias: alias,
      epub: pair.epub,
      pub: pair.pub
    }

    useEffect(() => {
      console.log("User Name: ", alias);
      console.log("Chatting Room Name: ", roomState.RoomState);
      // const currentRoom = gun.get(roomState.RoomState);
      // currentRoom.map().once(async (msg) => {
      //   console.log("🐥"+msg.message+"🐥")
      //   setMessageList([msg.message,...messageList]);
      // })
      onQueryRoom()
      initRoom();
      getMessage();
    }, [roomState.RoomState]);

    async function initRoom() {
      const currentRoom = gun.get(roomState.RoomState);
      currentRoom.get('user').get(alias).put(userInfo);
      currentRoom.get('user').map().once((user) => {
        
        setUserList([user.alias])
      })
    }

    async function saveMessage() {
      const messages = gun.get(roomState.RoomState);
      const createdAt = new Date().toLocaleString();
      const encryptAlias = await SEA.encrypt(alias, pair.epub);
      const encryptMsg = await SEA.encrypt(messageState, pair.epub);
      const encryptTime = await SEA.encrypt(createdAt, pair.epub);
      const signAlias = await SEA.sign(encryptAlias, pair);
      const signMsg = await SEA.sign(encryptMsg, pair);
      const signTime = await SEA.sign(encryptTime, pair);
      messages.set({
        name: signAlias,
        message: signMsg,
        createdAt: signTime,
      });
      setMessage("");
  }

    function getMessage() {
      const messages = gun.get(roomState.RoomState);
      const users = gun.get(roomState.RoomState).get('user');
      messages.map().once(async (msg) => {
        users.map().once(async (user) => {
          const verifiedAlias = await SEA.verify(msg.name, user.pub);
          const verifiedMsg = await SEA.verify(msg.message, user.pub);
          const verifiedTime = await SEA.verify(msg.createdAt, user.pub);
          const decryptedAlias = await SEA.decrypt(verifiedAlias, user.epub);
          const decryptedMsg = await SEA.decrypt(verifiedMsg, user.epub);
          const decryptedTime = await SEA.decrypt(verifiedTime, user.epub);

          if(decryptedAlias !== undefined) {
            dispatch({
              name: decryptedAlias,
              message: decryptedMsg,
              createdAt: decryptedTime,
            });
          }
        })
      });
    }

    //블록체인에 총 메세지의 해쉬값 전달 완성
    const onHashMessage = async () => {
      const hash=CryptoJS.SHA256(JSON.stringify(messageList)).toString() 
      //그 전의 메세지들의 해쉬값(블록체인에 저장되어있는 해쉬값)
      //그전의 메세지와 현대 메세지가 동일할경우, 그전의 메세지의 값이 존재하지 않는 경우 트랜잭션 발생
      axios.get(`http://203.247.240.236:1206/api/query/${roomState.RoomState}`).then((res) => {
        if(res.data.Hash==hash){
          alert("Same Hash is already recorded");
        }else{
          axios.post(`http://203.247.240.236:1206/api/recordhash`, {
                "RoomNumber":roomState.RoomState,
                "Function":"record",
                "HostID": res.data.HostID,
                "PostID": alias,
                "Hash":hash,
                "DateTime":Date().toLocaleString()
          }).then((res) => {
            setIsLoading(false);
            alert("Hash Recorded: \n"+res.data.Hash);
          })
        }
    })
  }

    //처음 개설된 방도 해쉬값을 저장(처음개설된 방은 빈 값이 저장)/ 원래 개설되어있던 방은 블록체인에 있는 해쉬값 가져와서 저장
    function onQueryRoom(){
      const hash=CryptoJS.SHA256("ㄴㅇㄹㄴㅇㄹㄴㅇ").toString()
      console.log("Queryroomhash:"+hash+"🦬")
      //개설되어있는 방인지 확인
        axios.get(`http://203.247.240.236:1206/api/query/${roomState.RoomState}`).then((res) => {
          //처음 개설되는 방 저장(방 이름, 방 개설, 호스트 이름, 입장한 이름, 당시 해시값, 저장 시간)
            if(res.data=="None"){
              axios.post(`http://203.247.240.236:1206/api/recordhash`, {
                "RoomNumber":roomState.RoomState,
                "Function":"create",
                "HostID": alias,
                "PostID": alias,
                "Hash":hash,
                "DateTime":Date().toLocaleString()
              }).then((res) => {
                alert("Room create hash: \n"+res.data.Hash);
                setoriginalhash(res.data.hash);
              })
            }
            //이미 개설되어있는 방 입장하면서 저장(방 이름, 방 입장, 호스트 이름, 입장한 이름, 당시 해시값, 저장 시간)
            else{
              axios.post(`http://203.247.240.236:1206/api/recordhash`, {
                "RoomNumber":roomState.RoomState,
                "Function":"enter",
                "HostID": res.data.HostID,
                "PostID": alias,
                "Hash":hash,
                "DateTime":Date().toLocaleString()
              }).then((res) => {
                console.log("res:"+res+"/res")
                alert("Room enter hash: \n"+res.data.Hash);
                setoriginalhash(res.data.hash);
              })
            }
          });
    }

    //블록체인에 저장되어있는 해쉬값 호출
    function onQueryHash(){
      const hash=CryptoJS.SHA256(JSON.stringify(messageList)).toString()
        axios.get(`http://203.247.240.236:1206/api/query/${roomState.RoomState}`).then((res) => {
          alert("✏️ "+res.data.PostID +" Recorded Hash at "+res.data.DateTime+"\n"+res.data.Hash+" \n  \n 🔎 Now Hash \n"+hash)
        })
    }

    function Back(){
      navigation.navigate('Ready',{
      alias: alias,
      roomState: "",
      pair: pair
      })
    }

    function modalopen(){
      setIsModalVisible(!isModalVisible)
    }

    const onChange = (keyvalue, e) => {
      setMessage(e)
    }   
    


    return(
      <View style={styles.home}>
        <Modal
          useNativeDriver={true}
          transparent={true}
          visible={isModalVisible}
        >
          <View style={styles.modalview}>
            <TouchableOpacity onPress={() => modalopen()}>
              <Ionicons name="list-outline" size={25} color="black" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.rowicon} onPress={() => onHashMessage()}>
              <Ionicons name="save-outline" size={30} color="black"/><Text style={styles.Textsize}> Record Hash {"\n"}{"\n"}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.rowicon} onPress={() => onQueryHash()}>
              <Ionicons name="checkbox-outline" size={30} color="black" /><Text style={styles.Textsize}>  Check Hash{"\n"}{"\n"}</Text>
            </TouchableOpacity>
            {<Text>alias</Text>}
            
          </View>
        </Modal>
        
        <KeyboardAvoidingView 
          style = {{ flex: 0.99 }}
          behavior={Platform.OS === "ios" ? "padding" : null}>
          <Header
          backgroundColor='rgba(23,36,65,0)'
          leftComponent={<TouchableOpacity onPress={Back}><Ionicons name="chevron-back-outline" size={35} color="black" /></TouchableOpacity>}
          centerComponent={{ text:roomState.RoomState,style:{width:220,fontSize:28,fontWeight:'bold',color:"black"}}}
          rightComponent={<TouchableOpacity onPress={() => modalopen()}>
                            <Ionicons name="list-outline" size={25} color="black" />
                          </TouchableOpacity>}
          />
          <View style={styles.main}>
              <ScrollView removeClippedSubviews={true} overScrollMode="never">
                  {state.messages.map((message, createdAt) => (
                      <View  key={createdAt}>
                          <Message message={message} name={alias}/>
                      </View>
                  ))}
              </ScrollView>
              <View style={styles.row}>
                  <TextInput style={styles.Chatinput} type="text" placeholder="My message" value={messageState} onChangeText={(e) => onChange("messageState",e)}/>
                  <TouchableOpacity onPress={()=> saveMessage()}>
                    <Ionicons name="send" size={30} color="black"></Ionicons>
                  </TouchableOpacity>
              </View>
          </View>
          </KeyboardAvoidingView>
      </View>

    )
}

export default Chat;


const styles = StyleSheet.create({
  modalview:{
    borderTopLeftRadius:10,
    borderBottomLeftRadius:10,
    position:"absolute",
    right:0,
    width:"60%",
    height:"100%",
    backgroundColor:"#c7cff0",
    padding:5
  },
  home:{
    alignItems: "center",
    justifyContent: "center",
    backgroundColor:"#6c7bb8",
    width:"100%",
    height:"100%"
  },
  main:{
    marginTop:"2%",
    marginLeft:"2%",
    height:"85%",
    width:"98%",
  },
  addtext:{
    fontSize:8,
    color:"darkgrey",
  },
  messages:{ 
    marginTop:"2%",
  },
  Textsize:{
    fontSize:20,
    color:"black",
    fontWeight: 'bold'
  },
  Roominput:{
    width:"80%",
    height:"10%",
    marginLeft:"4%",
    marginRight:"4%",
    borderWidth: 1,
    padding: 10,
  },
  Chatinput:{
    width:"86%",
    height:"98%",
    marginLeft:"1%",
    marginRight:"2%",
    borderWidth: 1,
    borderRadius:10,
    padding: 10,
    borderColor:"white",
    backgroundColor:"white",
    },
    row:{ 
      marginBottom:"1%",
      backgroundColor:"rgba(23,36,65,00)",
      flexDirection:"row",
      flexWrap: "wrap",
      alignItems: "center",
      justifyContent: "center",
      padding: 2,
    },
    rowicon:{ 
      marginTop:"3%",
      width:200,
      backgroundColor:"rgba(23,36,65,00)",
      flexDirection:"row",
      flexWrap: "wrap",
      justifyContent: "center",
      padding: 2,
    },
  });

