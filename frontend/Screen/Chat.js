import React, {useState,useEffect,useReducer,useRef} from 'react';
import axios from 'axios';
import { API_URL } from '../lib/config';
import Ionicons from '@expo/vector-icons/Ionicons';
import {Modal, View, Text,TextInput,StyleSheet,ScrollView, KeyboardAvoidingView, ActivityIndicator, Platform} from 'react-native';
import { Header } from 'react-native-elements';
import { TouchableOpacity } from 'react-native';

import Message from '../Components/Message';
import DesignButton from '../Components/DesignButton';
import gun, { GUN, SEA, entered, lastRead, WAIT, readOnce } from '../lib/gun';
import { insertByTime, hashMessages, showTime } from '../lib/messages';
import { readRoom, roomHistory, recordedPubs, unlockRoom, saveRoomKey, loadRoomKey, findUserEpub, sealKeyFor } from '../lib/secretRoom';
import common, { colors, fonts } from '../lib/styles';

const initialState = {
  messages: [],
};

// One entry per message key, kept in time order, so late-synced old messages land in place
const reducer = (state, message) => {
    if (state.messages.some((m) => m.key === message.key)) { return state; }
    return {
      messages: insertByTime(state.messages, message),
    };
  };

// alias and pair come from the session (withSession in App.js); the params carry only the room name
function Chat({route,navigation,alias,pair}){
    const {room}=route.params

    const [isModalVisible, setIsModalVisible] = useState(false);
    const [state, dispatch] = useReducer(reducer, initialState);
    const [messageState, setMessage] = useState("");
    // true while a message is being encrypted and stored; a ref, so a second tap in the same moment sees it
    const sending = useRef(false);
    // the message list, and whether the user is at its bottom: new messages scroll into view only then
    const messageList = useRef(null);
    const atBottom = useRef(true);
    const [userList, setUserList] = useState([]);
    const [invitationuser, setInvitationuser] = useState("");
    // { hash, records } while the Check Hash sheet is open: the current hash and the room's ledger history
    const [ledger, setLedger] = useState(null);
    // key of an encrypted room; null in a free room, where messages use the sender's epub as before
    const roomKey = useRef(null);
    // room info while an encrypted room waits for its password
    const [gate, setGate] = useState(null);
    const [gatePassword, setGatePassword] = useState("");
    // false until the room is known to be open (free, or its key found); nothing of the room is drawn before
    const [opened, setOpened] = useState(false);
    // every verified message of the room as stored (still encrypted), by key: what the room hash is made of
    const stored = useRef({});
    // GUN listeners of the open room, turned off when the room is left or changed
    const subscriptions = useRef([]);
    // bumped on leave: async work started for an earlier visit sees it changed and stops
    const visit = useRef(0);
    // the public keys the ledger has recorded in the room (a promise, set by getMessage)
    const ledgerPubs = useRef(Promise.resolve([]));

    useEffect(() => {
      prepare();
      return () => {
        // everything that arrived while the room was open has been seen
        lastRead().get(room).put(GUN.state());
        visit.current++;
        subscriptions.current.forEach((subscription) => subscription.off());
        subscriptions.current = [];
      };
    }, [room]);

    // keeps a listener so leaving the room turns it off
    // shortcut: GUN's off() does not detach map().once, so a left room's callback still runs once per new message and returns at the visit check; switch to on() with per-event off if that ever costs
    const listen = (chain) => { subscriptions.current.push(chain); return chain; };

  // An encrypted room starts once its key is known: from this user's saved keys, or from the password
  async function prepare() {
    const current = visit.current;
    roomKey.current = null;
    stored.current = {};
    setOpened(false);
    setGate(null);
    // both reads wait on peers, so run them together; null: the room info could not be read
    const [info, key] = await Promise.all([readRoom(room).catch(() => null), loadRoomKey(room, pair)]);
    if(current !== visit.current) { return; }
    // a saved key wins over the room info, so changed room info cannot turn an encrypted room into a free one (#28)
    if(key) { roomKey.current = key; start(); return; }
    // without the room info an encrypted room would open as free, and messages would go out readable by anyone
    if(info === null) { alert("Could not read the room info.\nTry again later."); Back(); return; }
    if(info && info.secret) { setGate(info); return; }
    start();
  }

  function start() {
    setOpened(true);
    lastRead().get(room).put(GUN.state());
    onInitHash();
    initRoom();
    getMessage();
  }

  async function unlock() {
    const key = await unlockRoom(gate, gatePassword);
    if(!key) { alert("Wrong password."); return; }
    await saveRoomKey(room, key, pair);
    roomKey.current = key;
    setGate(null);
    setGatePassword("");
    start();
  }

  // The room lists only its members' public keys; who they are and what they wrote is in each member's own space
  function initRoom() {
    setUserList([]);
    gun.get(room).get('members').get(pair.pub).put(true);
    registerRoom();
  }

  // Adds the room to this user's entered rooms. The room info itself is made where its type is chosen (Ready).
  function registerRoom() {
    entered.get(alias).get(room).put(true);
  }

  // Each member's messages are in their user space (~pub/msgs/room), where only their key can write,
  // so the sender is known: no signature check against every member, and the name is the signed account alias.
  // One subscription per member feeds the member list, the screen and the room hash.
  // Members come from the room's index in GUN (live, but anyone can remove an entry) and from the ledger
  // (its records cannot be removed), so a member taken off the index still shows.
  // shortcut: aliases are not unique in GUN, so another account can take the same alias; show part of the key if that is abused
  function getMessage() {
    const current = visit.current;
    const members = {};
    const addMember = async (pub) => {
      // only a real public key: SEA rejects unsigned writes under it, but a soul like ~x is writable by anyone
      if(current !== visit.current || members[pub] || SEA.opt.pub('~' + pub) !== pub) { return; }
      members[pub] = true;
      const user = await readOnce(gun.get('~' + pub));
      if(current !== visit.current || !user || !user.alias || !user.epub) { return; }
      // GUN answers one member at a time, after this returns: add each one through state so the list redraws
      setUserList((list) => list.includes(user.alias) ? list : [...list, user.alias]);
      const secret = roomKey.current || user.epub;
      listen(gun.get('~' + pub).get('msgs').get(room).map()).once(async (msg, key) => {
        if(current !== visit.current || !msg || msg.message === undefined) { return; }
        const at = GUN.state.is(msg, 'message');
        const [text, time] = await Promise.all([SEA.decrypt(msg.message, secret), SEA.decrypt(msg.createdAt, secret)]);
        if(current !== visit.current || text === undefined) { return; }
        // the sender's key is part of the hash, so the same text from another member hashes differently
        stored.current[key] = { key: key, at: at, name: pub, message: msg.message, createdAt: msg.createdAt };
        dispatch({
          key: key,
          at: at,
          name: user.alias,
          message: text,
          createdAt: showTime(time),
        });
      });
    };
    listen(gun.get(room).get('members').map()).once((isMember, pub) => { if(isMember) { addMember(pub); } });
    ledgerPubs.current = roomHistory(room).then(recordedPubs).catch(() => []);
    ledgerPubs.current.then((pubs) => pubs.forEach(addMember));
  }

  const roomHash = () => hashMessages(Object.values(stored.current));

  // A room first recorded from here (not from Ready) is a free room. Its info goes in this user's space,
  // where the create record (HostPub) points; otherwise the room could not be opened again.
  const saveFreeRoomInfo = () => gun.user().get('rooms').get(room).put({ name: room, host: alias, createdAt: Date.now(), secret: false });

  const onInitHash = async ()=>{
    // the room has just been opened: members, then their messages arrive and are decrypted one by one,
    // so hash once no message has been added for WAIT ms
    // shortcut: gives up waiting after 10 * WAIT in a room that never goes quiet; count pending reads if that hashes too early
    const current = visit.current;
    let count = -1;
    for(let i = 0; i < 10 && count !== Object.keys(stored.current).length; i++) {
      count = Object.keys(stored.current).length;
      await new Promise((resolve) => setTimeout(resolve, WAIT));
      if(current !== visit.current) { return; }
    }
    const hash = roomHash();
      //개설되어있는 방인지 확인
    axios.get(`${API_URL}/api/query/${encodeURIComponent(room)}`).then(async (res) => {
      console.log(res.data)
      console.log(hash)
      //처음 개설되는 방 저장(방 이름, 방 개설, 호스트 이름, 입장한 이름, 당시 해시값, 저장 시간)
        if(res.data=="None"){
          saveFreeRoomInfo();
          return axios.post(`${API_URL}/api/recordhash`, {
            "RoomNumber":room,
            "Function":"create",
            "HostID": alias,
            "HostPub": pair.pub,
            "PostID": alias,
            "PostPub": pair.pub,
            "Hash":hash,
            "DateTime":Date().toLocaleString()
          }).then((res) => {
            alert("Room create hash: \n"+res.data.Hash);
          })
        }
        //이미 개설되어있는 방 입장하면서 저장(방 이름, 방 입장, 호스트 이름, 입장한 이름, 당시 해시값, 저장 시간)
        else{
          // a member's first entry is always recorded, even with the hash unchanged: the ledger keeps them a member
          const recorded = (await ledgerPubs.current).includes(pair.pub);
          if(res.data.Hash!==hash || !recorded){
          return axios.post(`${API_URL}/api/recordhash`, {
            "RoomNumber":room,
            "Function":"enter",
            "HostID": res.data.HostID,
            "PostID": alias,
            "PostPub": pair.pub,
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
      }).catch((err) => {
        alert("Room hash: "+err.message)
      });
  }

  async function saveMessage() {
    const text = messageState.trim();
    if(!text || sending.current) { return; }
    sending.current = true;
    // your own message always comes into view
    atBottom.current = true;
    setMessage("");
    try {
      const createdAt = String(Date.now());
      const key = roomKey.current || pair.epub;
      const encryptMsg = await SEA.encrypt(text, key);
      const encryptTime = await SEA.encrypt(createdAt, key);
      // GUN signs every write to the user's own space, and peers reject unsigned ones
      gun.user().get('msgs').get(room).set({
        message: encryptMsg,
        createdAt: encryptTime,
      });
    } catch (e) {
      // give the text back so it is not lost
      setMessage(text);
      alert("Could not send the message: " + e.message);
    } finally {
      sending.current = false;
    }
  }

    //블록체인에 총 메세지의 해쉬값 전달 완성
    const onHashMessage = async () => {
    const hash = roomHash();
      //그 전의 메세지들의 해쉬값(블록체인에 저장되어있는 해쉬값)
      //그전의 메세지와 현대 메세지가 동일할경우, 그전의 메세지의 값이 존재하지 않는 경우 트랜잭션 발생
      axios.get(`${API_URL}/api/query/${encodeURIComponent(room)}`).then((res) => {
        // the ledger has no record of this room yet (its create failed): create it now, as onInitHash does
        const created = res.data=="None";
        if(!created && res.data.Hash==hash){
          alert("Same Hash is already recorded");
        }else{
          if(created) { saveFreeRoomInfo(); }
          return axios.post(`${API_URL}/api/recordhash`, {
                "RoomNumber":room,
                "Function":created ? "create" : "record",
                "HostID": created ? alias : res.data.HostID,
                "HostPub": created ? pair.pub : "",
                "PostID": alias,
                "PostPub": pair.pub,
                "Hash":hash,
                "DateTime":Date().toLocaleString()
          }).then((res) => {
            alert("Hash Recorded: \n"+res.data.Hash);
          })
        }
    }).catch((err) => {
      alert("Record Hash: "+err.message)
    })
  }

    //블록체인에 저장되어있는 해쉬값 호출
    async function onQueryHash(){
    const hash = roomHash();
        // every record of the room, not only the latest one
        axios.get(`${API_URL}/api/history/${encodeURIComponent(room)}`).then((res) => {
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

    // back to the tab the room was opened from; 'Ready' is nested in Menu, so navigate('Ready') is not handled here
    function Back(){
      navigation.goBack()
    }

    // In an encrypted room the invitation carries the room key, sealed so only the invited user can open it
    const Invitation=async(invitationuser)=>{
      const to = invitationuser.trim()
      if(!to) { return }
      const epub = await findUserEpub(to)
      if(!epub) { alert("There is no user named "+to+"."); return }
      const sealed = roomKey.current ? await sealKeyFor(roomKey.current, epub, pair) : ""
      axios.post(`${API_URL}/api/invite`, {
        "RoomNumber":room,
        "From": alias,
        "FromEpub": pair.epub,
        "To": to,
        "DateTime": new Date().toISOString(),
        "Key": sealed,
      }).then(() => {
        alert("Sent an invitation to "+to+".")
      }).catch((err) => {
        alert("Invitation: "+err.message)
      })
      setInvitationuser("")
    }

    function modalopen(){
      setIsModalVisible(!isModalVisible)
    }

    const onChange = (keyvalue, e) => {
      setMessage(e)
    }  

    // Before the room is open: a spinner while its type is read, or the password screen of an encrypted room
    if(!opened) {
      return(
        <View style={styles.ledger}>
          <View style={styles.ledgerHead}>
            <Text style={styles.ledgerTitle}>{gate ? "Encrypted room" : room}</Text>
            <TouchableOpacity onPress={Back}>
              <Ionicons name="close-outline" size={30} color={colors.text} />
            </TouchableOpacity>
          </View>
          {gate ? <>
            <Text style={styles.summary}>{room} is encrypted. Enter its password, or ask a member to invite you.</Text>
            <TextInput style={common.input} secureTextEntry={true} placeholder="Room password" placeholderTextColor={colors.subtext} value={gatePassword} onChangeText={setGatePassword} onSubmitEditing={() => unlock()}/>
            <DesignButton text="Enter" buttonFunction={() => unlock()} height={44} bgcolor={colors.primary} color={colors.background} outline={false}/>
          </> : <ActivityIndicator color={colors.primary}/>}
        </View>
      )
    }

    return(

      <View style={common.home}>
        <KeyboardAvoidingView 
          style = {{ flex: 1, width: "100%" }}
          behavior={Platform.OS === "ios" ? "padding" : null}>
        <Modal
          transparent={true}
          visible={isModalVisible}
          onRequestClose={() => setIsModalVisible(false)}
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
            {userList.map(user => <View key={user} style={[common.row, styles.row]}><Ionicons name={alias==user?"person-circle":"person-circle-outline"} size={25} color={alias==user?colors.primary:colors.subtext} /><Text style={{color:colors.text}}> {user}</Text></View>)}
          </View>
        </Modal>


          <Header
          backgroundColor={colors.surface}
          containerStyle={{borderBottomColor:colors.border}}
          leftComponent={<TouchableOpacity onPress={Back}><Ionicons name="chevron-back-outline" size={30} color={colors.text} /></TouchableOpacity>}
          centerComponent={{ text:room,style:{width:220,textAlign:'center',fontSize:20,fontWeight:'bold',fontFamily:fonts.serif,color:colors.text}}}
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
              <ScrollView
                  ref={messageList}
                  overScrollMode="never"
                  contentContainerStyle={styles.messages}
                  onScroll={({nativeEvent: {contentOffset, layoutMeasurement, contentSize}}) => {
                    atBottom.current = contentOffset.y + layoutMeasurement.height >= contentSize.height - 40;
                  }}
                  scrollEventThrottle={100}
                  onContentSizeChange={() => { if(atBottom.current) { messageList.current.scrollToEnd({animated: true}); } }}>
                  {state.messages.map((message) => (
                      <View key={message.key}>
                          <Message message={message} name={alias}/>
                      </View>
                  ))}
              </ScrollView>
              <View style={styles.inputBar}>
                  <TextInput style={styles.Chatinput} type="text" placeholder="My message" placeholderTextColor={colors.subtext} value={messageState} onChangeText={(e) => onChange("messageState",e)} onSubmitEditing={() => saveMessage()} blurOnSubmit={false} returnKeyType="send"/>
                  <TouchableOpacity style={[styles.sendBtn, !messageState.trim() && {opacity:0.5}]} disabled={!messageState.trim()} onPress={()=> saveMessage()}>
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

