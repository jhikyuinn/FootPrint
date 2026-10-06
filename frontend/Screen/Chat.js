import React, {useState,useEffect,useReducer} from 'react';
import CryptoJS from "crypto-js";
import axios from 'axios';
import Ionicons from '@expo/vector-icons/Ionicons';
import {Modal, View, Text,TextInput,StyleSheet,ScrollView, KeyboardAvoidingView, ActivityIndicator, Platform} from 'react-native';
import { Header, withTheme } from 'react-native-elements';
import { TouchableOpacity } from 'react-native';

import Message from '../Components/Message';
import gun, { SEA } from '../lib/gun';
import common, { colors } from '../lib/styles';

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
    const [messageState, setMessage] = useState("");
    const [userList, setUserList] = useState([]);
    const [invitationuser, setInvitationuser] = useState("");
    

    const userInfo = {
      alias: alias,
      epub: pair.epub,
      pub: pair.pub
    }

    useEffect(() => {
      onInitHash();
      initRoom();
      getMessage();
    }, [roomState.RoomState]);

  // function initRoom() {
  //   const currentRoom = gun.get(roomState.RoomState);
  //   const users = gun.get(roomState.RoomState).get('user');
  //   const currentRoommessage=[];
  //   //room message 
  //   currentRoom.map().once((msg) => {
  //     console.log("🦢"+JSON.stringify(msg.message));
  //     currentRoommessage.push(msg.message);
  //     console.log("🎫"+currentRoommessage);
  //     users.map().once(async (user) => {
  //       const verifiedAlias = await SEA.verify(msg.name, user.pub);
  //       const verifiedMsg = await SEA.verify(msg.message, user.pub);
  //       const verifiedTime = await SEA.verify(msg.createdAt, user.pub);
  //       const decryptedAlias = await SEA.decrypt(verifiedAlias, user.epub);
  //       const decryptedMsg = await SEA.decrypt(verifiedMsg, user.epub);
  //       const decryptedTime = await SEA.decrypt(verifiedTime, user.epub);
  //       if(decryptedAlias !== undefined) {
  //         dispatch({
  //           name: decryptedAlias,
  //           message: decryptedMsg,
  //           createdAt: decryptedTime,
  //         });
  //       }
  //     })
  //   })
  //   //messagelist for hash
  //   //room user 
  //   const inituserlist = [];
  //   users.get(alias).put(userInfo);
  //   users.map().once((user) => {
  //     inituserlist.push(user.alias);
  //   })
  //   setMessageList(currentRoommessage);
  //   setUserList(inituserlist);
  // }

  async function initRoom() {
    const currentRoom = gun.get(roomState.RoomState);
    const currentUser=[];
    currentRoom.get('user').get(alias).put(userInfo);
    currentRoom.get('user').map().once((user) => {
      currentUser.push(user.alias)
    })
    setUserList(currentUser);
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

  
  const onInitHash = async ()=>{
    const messages = gun.get(roomState.RoomState);
    const hashmessage=[];
    messages.map((msg) => {
      if(msg.message!==undefined){
        hashmessage.push(msg.message);
      }
    })
    const hash=CryptoJS.SHA256(JSON.stringify(hashmessage)).toString()
      //개설되어있는 방인지 확인
    axios.get(`http://localhost:1206/api/query/${roomState.RoomState}`).then((res) => {
      console.log(res.data)
      console.log(hash)
      //처음 개설되는 방 저장(방 이름, 방 개설, 호스트 이름, 입장한 이름, 당시 해시값, 저장 시간)
        if(res.data=="None"){
          axios.post(`http://localhost:1206/api/recordhash`, {
            "RoomNumber":roomState.RoomState,
            "Function":"create",
            "HostID": alias,
            "PostID": alias,
            "Hash":hash,
            "DateTime":Date().toLocaleString()
          }).then((res) => {
            alert("Room create hash: \n"+res.data.Hash);
          })
        }
        //이미 개설되어있는 방 입장하면서 저장(방 이름, 방 입장, 호스트 이름, 입장한 이름, 당시 해시값, 저장 시간)
        else{
          if(res.data.Hash!==hash){
          axios.post(`http://localhost:1206/api/recordhash`, {
            "RoomNumber":roomState.RoomState,
            "Function":"enter",
            "HostID": res.data.HostID,
            "PostID": alias,
            "Hash":hash,
            "DateTime":Date().toLocaleString()
          }).then((res) => {
            alert("Room enter hash: \n"+res.data.Hash);
          })
        }
        else{
          alert("Same Hash is already recorded");
        }
        }
      });
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

    //블록체인에 총 메세지의 해쉬값 전달 완성
    const onHashMessage = async () => {
      const messages = gun.get(roomState.RoomState);
    const hashmessage=[];
    messages.map((msg) => {
      if(msg.message!==undefined){
        hashmessage.push(msg.message);
      }
    })
    const hash=CryptoJS.SHA256(JSON.stringify(hashmessage)).toString() 
      //그 전의 메세지들의 해쉬값(블록체인에 저장되어있는 해쉬값)
      //그전의 메세지와 현대 메세지가 동일할경우, 그전의 메세지의 값이 존재하지 않는 경우 트랜잭션 발생
      axios.get(`http://localhost:1206/api/query/${roomState.RoomState}`).then((res) => {
        if(res.data.Hash==hash){
          alert("Same Hash is already recorded");
        }else{
          axios.post(`http://localhost:1206/api/recordhash`, {
                "RoomNumber":roomState.RoomState,
                "Function":"record",
                "HostID": res.data.HostID,
                "PostID": alias,
                "Hash":hash,
                "DateTime":Date().toLocaleString()
          }).then((res) => {
            alert("Hash Recorded: \n"+res.data.Hash);
          })
        }
    })
  }

    //블록체인에 저장되어있는 해쉬값 호출
    function onQueryHash(){
      const messages = gun.get(roomState.RoomState);
    const hashmessage=[];
    messages.map((msg) => {
      if(msg.message!==undefined){
        hashmessage.push(msg.message);
      }
    })
    const hash=CryptoJS.SHA256(JSON.stringify(hashmessage)).toString()
        axios.get(`http://localhost:1206/api/query/${roomState.RoomState}`).then((res) => {
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

    const Invitation=(invitationuser)=>{
      axios.get(`http://localhost:1206/api/query/${roomState.RoomState}`).then((res) => {
        axios.post(`http://localhost:1206/api/recordhash`, {
          "RoomNumber":roomState.RoomState,
          "Function":"invitation",
          "HostID": res.data.HostID,
          "PostID": invitationuser,
          "Hash":"",
          "DateTime":Date().toLocaleString()
          }).then(
              alert("Send invitation notification to"+JSON.stringify(invitationuser))
          )
      })
      setInvitationuser("")
    }

    function modalopen(){
      setIsModalVisible(!isModalVisible)
    }

    const onChange = (keyvalue, e) => {
      setMessage(e)
    }  

    return(
      
      <View style={common.home}>
        <KeyboardAvoidingView 
          style = {{ flex: 0.99 }}
          behavior={Platform.OS === "ios" ? "padding" : null}>
        <Modal
          useNativeDriver={true}
          transparent={true}
          visible={isModalVisible}
        >
          <View style={styles.modalview}>
            <TouchableOpacity style={{marginBottom:"10%"}} onPress={() => modalopen()}>
              <Ionicons name="list-outline" size={25} color="black" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.rowicon} onPress={() => onHashMessage()}>
              <Ionicons name="save-outline" size={30} color="black"/><Text style={[common.boldText, styles.Textsize]}> Record Hash {"\n"}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.rowicon} onPress={() => onQueryHash()}>
              <Ionicons name="checkbox-outline" size={30} color="black" /><Text style={[common.boldText, styles.Textsize]}>  Check Hash{"\n"}</Text>
            </TouchableOpacity>
            <View style={[common.row, styles.row]}>
              <TextInput  style={[common.input, styles.input]} type="text" value={invitationuser} placeholder="Invitation" name="Invitation" onChangeText={invitationuser => setInvitationuser(invitationuser)}/>
              <TouchableOpacity onPress={() => Invitation(invitationuser)}>
                <Ionicons name="mail-outline" size={35} color={"black"}/>
              </TouchableOpacity>
          </View>
          <Text style={{fontSize:25,marginBottom:"5%"}}>User</Text>
            {userList.map(user => <View style={[common.row, styles.row]}><Ionicons name="person-circle-outline" size={25} color={alias==user?"white":"black"} /><Text> {user}</Text></View>)}
          </View>
        </Modal>
        
        
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
              <View style={[common.row, styles.row]}>
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
    backgroundColor:colors.panel,
    padding:5
  },
  main:{
    marginTop:"2%",
    marginLeft:"2%",
    height:"85%",
    width:"98%",
  },
  Textsize:{
    fontSize:20,
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
      padding: 2,
    },
    rowicon:{
      marginTop:"3%",
      width:180,
      flexDirection:"row",
      flexWrap: "wrap",
      justifyContent: "center",
      padding: 2,
    },
    input: {
      backgroundColor:"white",
      width:"70%",
      marginBottom:10,
    },
  });

