import React, {useState,useEffect,useReducer} from 'react';
import CryptoJS from "crypto-js";
import axios from 'axios';
import Ionicons from '@expo/vector-icons/Ionicons';
import {Modal, View, Text,TextInput,StyleSheet,ScrollView, KeyboardAvoidingView, ActivityIndicator, Platform} from 'react-native';
import { Header, withTheme } from 'react-native-elements';
import { TouchableOpacity } from 'react-native';

import Message from '../Components/Message';
import gun, { SEA, rooms, entered } from '../lib/gun';
import common, { colors, fonts } from '../lib/styles';

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
    // { hash, records } while the Check Hash sheet is open: the current hash and the room's ledger history
    const [ledger, setLedger] = useState(null);


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
    registerRoom();
  }

  // Adds the room to the room list and to this user's entered rooms.
  // The first user to register a room is its host.
  function registerRoom() {
    const room = rooms.get(roomState.RoomState);
    entered.get(alias).get(roomState.RoomState).put(true);
    room.once((info) => {
      if(!info || !info.host) {
        room.put({ name: roomState.RoomState, host: alias, createdAt: Date.now() });
      }
    });
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
          // the ledger already knows this room's host, so the room list follows it
          rooms.get(roomState.RoomState).put({ name: roomState.RoomState, host: res.data.HostID });
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
        // every record of the room, not only the latest one
        axios.get(`http://localhost:1206/api/history/${roomState.RoomState}`).then((res) => {
          setIsModalVisible(false)
          setLedger({hash: hash, records: res.data})
        }).catch((err) => {
          alert("Check Hash: "+err.message)
        })
    }

    // Says which ledger record the current chat matches. Invitations carry no hash, so they are skipped.
    function ledgerSummary(){
      const hashed = ledger.records.filter((record) => record.Value.hash)
      if(hashed.length === 0) { return "No hash has been recorded for this room yet." }
      if(hashed[hashed.length-1].Value.hash === ledger.hash) { return "The current chat matches the latest recorded hash." }
      const match = ledger.records.findIndex((record) => record.Value.hash === ledger.hash)
      if(match !== -1) { return "The current chat matches record #"+(match+1)+", but newer hashes were recorded after it." }
      return "The current chat matches none of the recorded hashes."
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
          style = {{ flex: 1, width: "100%" }}
          behavior={Platform.OS === "ios" ? "padding" : null}>
        <Modal
          useNativeDriver={true}
          transparent={true}
          visible={isModalVisible}
        >
          <View style={styles.modalview}>
            <TouchableOpacity style={{marginBottom:20}} onPress={() => modalopen()}>
              <Ionicons name="close-outline" size={28} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.rowicon} onPress={() => onHashMessage()}>
              <Ionicons name="save-outline" size={24} color={colors.accent}/><Text style={[common.boldText, styles.Textsize]}>Record Hash</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.rowicon} onPress={() => onQueryHash()}>
              <Ionicons name="checkbox-outline" size={24} color={colors.accent} /><Text style={[common.boldText, styles.Textsize]}>Check Hash</Text>
            </TouchableOpacity>
            <View style={styles.inviteRow}>
              <TextInput  style={[common.input, styles.input]} type="text" value={invitationuser} placeholder="Invitation" placeholderTextColor={colors.subtext} name="Invitation" onChangeText={invitationuser => setInvitationuser(invitationuser)}/>
              <TouchableOpacity onPress={() => Invitation(invitationuser)}>
                <Ionicons name="mail-outline" size={30} color={colors.primary}/>
              </TouchableOpacity>
          </View>
          <Text style={styles.sectionTitle}>User</Text>
            {userList.map(user => <View style={[common.row, styles.row]}><Ionicons name={alias==user?"person-circle":"person-circle-outline"} size={25} color={alias==user?colors.primary:colors.subtext} /><Text style={{color:colors.text}}> {user}</Text></View>)}
          </View>
        </Modal>


          <Header
          backgroundColor={colors.surface}
          containerStyle={{borderBottomColor:colors.border}}
          leftComponent={<TouchableOpacity onPress={Back}><Ionicons name="chevron-back-outline" size={30} color={colors.text} /></TouchableOpacity>}
          centerComponent={{ text:roomState.RoomState,style:{width:220,textAlign:'center',fontSize:20,fontWeight:'bold',fontFamily:fonts.serif,color:colors.text}}}
          rightComponent={<TouchableOpacity onPress={() => modalopen()}>
                            <Ionicons name="list-outline" size={26} color={colors.text} />
                          </TouchableOpacity>}
          />
          <View style={styles.main}>
              <View style={styles.recordBar}>
                <Text style={common.label}>LEDGER</Text>
                <View style={{flexDirection:"row"}}>
                  <TouchableOpacity style={styles.recordBtn} onPress={() => onHashMessage()}>
                    <Ionicons name="save-outline" size={14} color={colors.accent}/><Text style={styles.recordText}>RECORD</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.recordBtn} onPress={() => onQueryHash()}>
                    <Ionicons name="checkbox-outline" size={14} color={colors.accent}/><Text style={styles.recordText}>CHECK</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <ScrollView removeClippedSubviews={true} overScrollMode="never" contentContainerStyle={styles.messages}>
                  {state.messages.map((message, createdAt) => (
                      <View  key={createdAt}>
                          <Message message={message} name={alias}/>
                      </View>
                  ))}
              </ScrollView>
              <View style={styles.inputBar}>
                  <TextInput style={styles.Chatinput} type="text" placeholder="My message" placeholderTextColor={colors.subtext} value={messageState} onChangeText={(e) => onChange("messageState",e)}/>
                  <TouchableOpacity style={styles.sendBtn} onPress={()=> saveMessage()}>
                    <Ionicons name="send" size={20} color={colors.background}></Ionicons>
                  </TouchableOpacity>
              </View>
          </View>
          </KeyboardAvoidingView>
          {ledger &&
          <View style={styles.ledger}>
            <View style={styles.ledgerHead}>
              <Text style={styles.ledgerTitle}>Ledger records</Text>
              <TouchableOpacity onPress={() => setLedger(null)}>
                <Ionicons name="close-outline" size={30} color={colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={common.label}>CURRENT HASH</Text>
            <Text style={styles.hash}>{ledger.hash}</Text>
            <Text style={styles.summary}>{ledgerSummary()}</Text>
            <Text style={[common.label, styles.ledgerCount]}>{ledger.records.length} RECORDS · NEWEST FIRST</Text>
            <ScrollView>
              {ledger.records.map((record, idx) => {
                const matches = record.Value.hash !== "" && record.Value.hash === ledger.hash;
                return (
                  <View key={record.TxId} style={[common.card, styles.ledgerCard, !matches && styles.ledgerCardOther]}>
                    <Text style={common.label}>#{idx+1} · {String(record.Value.function).toUpperCase()} · {record.Value.postid}</Text>
                    <Text style={styles.time}>{new Date(record.Timestamp).toLocaleString()}</Text>
                    <Text style={styles.hash}>{record.Value.hash || "(no hash)"}</Text>
                    {matches && <Text style={styles.match}>✓ MATCHES THE CURRENT CHAT</Text>}
                  </View>
                );
              }).reverse()}
            </ScrollView>
          </View>}
      </View>

    )
}

export default Chat;


const styles = StyleSheet.create({
  modalview:{
    borderTopLeftRadius:20,
    borderBottomLeftRadius:20,
    position:"absolute",
    right:0,
    width:"70%",
    height:"100%",
    backgroundColor:colors.panel,
    borderLeftWidth:1,
    borderColor:colors.border,
    paddingHorizontal:20,
    paddingTop:50,
    shadowColor:"#000",
    shadowOpacity:0.15,
    shadowRadius:12,
    shadowOffset:{width:-4,height:0},
    elevation:12,
  },
  main:{
    flex:1,
    width:"100%",
  },
  messages:{
    paddingHorizontal:14,
    paddingTop:14,
  },
  // the Check Hash sheet, drawn over the whole chat screen
  ledger:{
    position:"absolute",
    top:0,
    bottom:0,
    left:0,
    right:0,
    backgroundColor:colors.background,
    paddingHorizontal:16,
    paddingTop:50,
  },
  ledgerHead:{
    flexDirection:"row",
    alignItems:"center",
    justifyContent:"space-between",
    marginBottom:16,
  },
  ledgerTitle:{
    fontSize:26,
    fontWeight:'bold',
    fontFamily:fonts.serif,
    color:colors.text,
  },
  ledgerCount:{
    marginBottom:10,
    paddingBottom:8,
    borderBottomWidth:1,
    borderColor:colors.border,
  },
  ledgerCard:{
    flexDirection:"column",
    alignItems:"stretch",
  },
  ledgerCardOther:{
    borderLeftColor:colors.border,
  },
  hash:{
    fontFamily:fonts.mono,
    fontSize:12,
    color:colors.text,
    marginTop:4,
  },
  time:{
    fontSize:14,
    fontWeight:'600',
    color:colors.text,
    marginTop:6,
  },
  summary:{
    fontSize:15,
    fontWeight:'600',
    color:colors.accent,
    marginTop:14,
    marginBottom:22,
  },
  match:{
    fontFamily:fonts.mono,
    fontSize:11,
    letterSpacing:1,
    color:colors.accent,
    marginTop:8,
  },
  // the two ledger actions, always visible above the conversation
  recordBar:{
    flexDirection:"row",
    alignItems:"center",
    justifyContent:"space-between",
    paddingHorizontal:14,
    paddingVertical:8,
    backgroundColor:colors.primarySoft,
    borderBottomWidth:1,
    borderColor:colors.border,
  },
  recordBtn:{
    flexDirection:"row",
    alignItems:"center",
    marginLeft:8,
    paddingHorizontal:10,
    paddingVertical:5,
    borderRadius:4,
    borderWidth:1,
    borderColor:colors.accent,
    backgroundColor:colors.surface,
  },
  recordText:{
    fontFamily:fonts.mono,
    fontSize:11,
    letterSpacing:1,
    marginLeft:5,
    color:colors.accent,
  },
  Textsize:{
    fontSize:18,
    marginLeft:12,
  },
  sectionTitle:{
    fontSize:14,
    fontWeight:'600',
    color:colors.subtext,
    marginTop:24,
    marginBottom:10,
  },
  inputBar:{
    flexDirection:"row",
    alignItems:"center",
    paddingHorizontal:12,
    paddingTop:8,
    // keeps the bar above the ios home indicator
    paddingBottom:Platform.OS === "ios" ? 24 : 8,
    backgroundColor:colors.surface,
    borderTopWidth:1,
    borderColor:colors.border,
  },
  Chatinput:{
    flex:1,
    height:44,
    marginRight:10,
    borderRadius:22,
    paddingHorizontal:16,
    fontSize:15,
    color:colors.text,
    backgroundColor:colors.background,
    },
  sendBtn:{
    width:44,
    height:44,
    borderRadius:22,
    backgroundColor:colors.primary,
    alignItems:"center",
    justifyContent:"center",
  },
    row:{
      marginBottom:8,
    },
    rowicon:{
      flexDirection:"row",
      alignItems:"center",
      paddingVertical:12,
    },
    inviteRow:{
      flexDirection:"row",
      alignItems:"center",
      marginTop:12,
    },
    input: {
      flex:1,
      marginRight:10,
    },
  });

