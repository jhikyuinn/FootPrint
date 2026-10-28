import {useState,useEffect,useReducer,useRef} from 'react';
import axios from 'axios';
import { API_URL } from '../lib/config';
import Ionicons from '@expo/vector-icons/Ionicons';
import {Modal, View, Text,TextInput,StyleSheet,ScrollView, KeyboardAvoidingView, ActivityIndicator, Platform, TouchableOpacity, Share} from 'react-native';
import { Header } from 'react-native-elements';

import Message from '../Components/Message';
import DesignButton from '../Components/DesignButton';
import LedgerSheet from '../Components/LedgerSheet';
import gun, { GUN, SEA, entered, lastRead, readOnce, WAIT, ROOM_NAME } from '../lib/gun';
import { insertByTime, hashMessages, hashFirst, nextRecord, showTime } from '../lib/messages';
import { buildMinutes, minuteMessage, minuteSender } from '../lib/minutes';
import { queryRoom, roomHistory, recordedPubs, recordHash } from '../lib/ledger';
import { readRoom, unlockRoom, saveRoomKey, loadRoomKey, aliasAccounts, findUserEpub, sealKeyFor } from '../lib/secretRoom';
import common, { colors, fonts } from '../lib/styles';

// Automatic records (#21): after AUTO_EVERY new messages, once no message arrived for AUTO_QUIET
// (a hash taken while messages still sync would cover only part of them), and when the room is left.
const AUTO_EVERY = 10;
const AUTO_QUIET = WAIT * 3;

// The web downloads the file. A phone opens the share sheet with the minutes as text.
// shortcut: no file module is installed, so on a phone the user saves the shared text as a .json file
// themselves; expo-file-system and expo-sharing would hand over a real file.
const saveFile = (name, text) => {
  if(Platform.OS !== "web") { return Share.share({ title: name, message: text }); }
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
};

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
    // the pending automatic record, restarted by every message that arrives
    const autoTimer = useRef(null);

    useEffect(() => {
      prepare();
      return () => {
        visit.current++;
        subscriptions.current.forEach((subscription) => subscription.off());
        subscriptions.current = [];
      };
    }, [room]);

    // everything that arrived while the room was open has been seen; a room left at its password screen
    // (or sent back before opening) was not, so its unread count stays
    useEffect(() => {
      if(!opened) { return; }
      return () => {
        lastRead().get(room).put(GUN.state());
        clearTimeout(autoTimer.current);
        // shortcut: leaving right after opening may record a chat that is still syncing, if its missing
        // messages come after the last hash; waiting for AUTO_QUIET first would need the screen to stay
        autoRecord(Object.values(stored.current), 1);
      };
    }, [opened, room]);

    // keeps a listener so leaving the room turns it off. Lists use map().on, not once: once stops firing for items added later (#56)
    const listen = (chain) => { subscriptions.current.push(chain); return chain; };

  // An encrypted room starts once its key is known: from this user's saved keys, or from the password
  async function prepare() {
    // invitations come from the API, which anyone can call (#20), so the name is checked here, where every way in meets
    if(!ROOM_NAME.test(room)) { alert("This room name is not allowed."); Back(); return; }
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
    // the ledger does not know the room yet (its creation is still being recorded): opening it now would
    // treat it as free, even if it is going to be encrypted
    if(info === undefined) { alert("This room is still being created.\nTry again in a moment."); Back(); return; }
    if(info && info.secret) { setGate(info); return; }
    start();
  }

  function start() {
    setOpened(true);
    lastRead().get(room).put(GUN.state());
    initRoom();
    getMessage();
    recordEntry();
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
  function getMessage() {
    const current = visit.current;
    const members = {};
    const addMember = async (pub) => {
      // only a real public key: SEA rejects unsigned writes under it, but a soul like ~x is writable by anyone
      if(current !== visit.current || members[pub] || SEA.opt.pub('~' + pub) !== pub) { return; }
      members[pub] = true;
      const user = await readOnce(gun.get('~' + pub));
      if(current !== visit.current || !user || !user.alias || !user.epub) { return; }
      // GUN lets several accounts take one alias: then the start of the key tells them apart
      const name = (await aliasAccounts(user.alias)).length > 1 ? user.alias + " #" + pub.slice(0, 6) : user.alias;
      if(current !== visit.current) { return; }
      // GUN answers one member at a time, after this returns: add each one through state so the list redraws
      setUserList((list) => [...list, { pub: pub, name: name }]);
      const secret = roomKey.current || user.epub;
      listen(gun.get('~' + pub).get('msgs').get(room).map()).on(async (msg, key) => {
        if(current !== visit.current || !msg || msg.message === undefined) { return; }
        const at = GUN.state.is(msg, 'message');
        const [text, time] = await Promise.all([SEA.decrypt(msg.message, secret), SEA.decrypt(msg.createdAt, secret)]);
        if(current !== visit.current || text === undefined) { return; }
        // the sender's key is part of the hash, so the same text from another member hashes differently
        // text, time, alias and secret are for the minutes; the hash only reads name, message and createdAt
        stored.current[key] = { key: key, at: at, name: pub, message: msg.message, createdAt: msg.createdAt, text: text, time: time, alias: name, secret: secret };
        clearTimeout(autoTimer.current);
        autoTimer.current = setTimeout(() => {
          if(current === visit.current) { autoRecord(Object.values(stored.current), AUTO_EVERY); }
        }, AUTO_QUIET);
        dispatch({
          key: key,
          at: at,
          name: name,
          pub: pub,
          message: text,
          createdAt: showTime(time),
        });
      });
    };
    listen(gun.get(room).get('members').map()).on((isMember, pub) => { if(isMember) { addMember(pub); } });
    ledgerPubs.current = roomHistory(room).then(recordedPubs).catch(() => []);
    ledgerPubs.current.then((pubs) => pubs.forEach(addMember));
  }

  const roomHash = () => hashMessages(Object.values(stored.current));

  // Writes a record of this room by this user; latest is the room's latest ledger record.
  // chain is { PrevHash, Count } for a hashed record: the last hash it builds on and how many messages it covers.
  // A room the ledger does not know yet (its create from Ready failed) is recorded here as a free room:
  // its info goes in this user's space, where the create record (HostPub) points, or it could not be opened again.
  const record = (fn, latest, hash, chain = {}) => {
    const by = { RoomNumber: room, PostID: alias, PostPub: pair.pub, Hash: hash, ...chain };
    if(latest !== "None") { return recordHash({ ...by, Function: fn, HostID: latest.HostID }); }
    gun.user().get('rooms').get(room).put({ name: room, host: alias, createdAt: Date.now(), secret: false });
    return recordHash({ ...by, Function: "create", HostID: alias, HostPub: pair.pub });
  };

  // Records the room's creation, or this user's first entry (the ledger keeps them a member), without a hash:
  // right after opening, messages are still syncing, and a hash of only part of them would become the
  // room's latest ledger hash. Hashes are recorded with Record Hash, once the chat has loaded.
  const recordEntry = async () => {
    try {
      const latest = await queryRoom(room);
      if(latest === "None" || !(await ledgerPubs.current).includes(pair.pub)) { await record("enter", latest, ""); }
    } catch(err) {
      alert("Room record: " + err.message);
    }
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

  // Records the chat without a tap when nextRecord says so (min: how many new messages it needs).
  // A failure is left alone: another member recorded first, or the ledger is down and the next trigger tries again.
  const autoRecord = async (list, min) => {
    try {
      const latest = await queryRoom(room);
      const next = nextRecord(list, latest, min);
      if(next) { await record("record", latest, next.Hash, next); }
    } catch(err) {}
  };

  // Records the current room hash, unless it is already the latest one on the ledger,
  // or the chat no longer starts with the messages the last hash covers (then it was changed, and is not recorded)
  const onHashMessage = async () => {
    const list = Object.values(stored.current);
    const hash = hashMessages(list);
    try {
      const latest = await queryRoom(room);
      const last = latest === "None" ? { LastHash: "", LastCount: 0 } : latest;
      if(last.LastHash === hash) { alert("Same Hash is already recorded"); return; }
      if(last.LastHash && hashFirst(list, last.LastCount) !== last.LastHash) {
        alert("Earlier messages differ from the last recorded hash, so the chat was not recorded.");
        return;
      }
      await record("record", latest, hash, { PrevHash: last.LastHash, Count: list.length });
      alert("Hash Recorded: \n" + hash);
    } catch(err) {
      alert("Record Hash: " + err.message);
    }
  }

  // Exports the minutes: every message with its sender's signatures and its own AES keys, and the room's
  // ledger records, so anyone can check them with scripts/verify-minutes.mjs (lib/minutes)
  async function onExportMinutes() {
    try {
      const records = await roomHistory(room);
      const messages = Object.values(stored.current).map((m) => minuteMessage({
        soul: m.key, pub: m.name, alias: m.alias, text: m.text, time: m.time,
        // the raw node keeps the signed values that the message listener gets unpacked
        node: gun._.graph[m.key], secret: m.secret, Buffer: SEA.Buffer,
      }));
      const senders = Object.fromEntries([...new Set(messages.map((m) => m.sender))].map((pub) => [pub, minuteSender(gun._.graph['~' + pub])]));
      const minutes = buildMinutes({ room, by: { alias, pub: pair.pub }, messages, senders, records, exportedAt: new Date().toISOString() });
      setIsModalVisible(false);
      await saveFile(room + "-minutes.json", JSON.stringify(minutes, null, 2));
    } catch(err) {
      alert("Export Minutes: " + err.message);
    }
  }

  // Opens the Check Hash sheet: the current hash next to every record of the room, not only the latest one
  async function onQueryHash() {
    const hash = roomHash();
    try {
      const records = await roomHistory(room);
      setIsModalVisible(false);
      setLedger({ hash, records, messages: Object.values(stored.current) });
    } catch(err) {
      alert("Check Hash: " + err.message);
    }
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
      if(epub === null) { alert("Several accounts are named "+to+", so the invitation was not sent."); return }
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

    // Before the room is open: a spinner while its type is read, or the password screen of an encrypted room
    if(!opened) {
      return(
        <View style={common.sheet}>
          <View style={common.sheetHead}>
            <Text style={common.sheetTitle}>{gate ? "Encrypted room" : room}</Text>
            <TouchableOpacity onPress={Back}>
              <Ionicons name="close-outline" size={30} color={colors.text} />
            </TouchableOpacity>
          </View>
          {gate ? <>
            <Text style={common.sheetSummary}>{room} is encrypted. Enter its password, or ask a member to invite you.</Text>
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
            <TouchableOpacity style={styles.rowicon} onPress={() => onExportMinutes()}>
              <Ionicons name="document-text-outline" size={24} color={colors.accent} /><Text style={[common.boldText, styles.Textsize]}>Export Minutes</Text>
            </TouchableOpacity>
            <View style={styles.inviteRow}>
              <TextInput  style={[common.input, styles.input]} type="text" value={invitationuser} placeholder="Invitation" placeholderTextColor={colors.subtext} name="Invitation" onChangeText={invitationuser => setInvitationuser(invitationuser)}/>
              <TouchableOpacity onPress={() => Invitation(invitationuser)}>
                <Ionicons name="mail-outline" size={30} color={colors.primary}/>
              </TouchableOpacity>
          </View>
          <Text style={styles.sectionTitle}>User</Text>
            {userList.map(user => <View key={user.pub} style={[common.row, styles.row]}><Ionicons name={user.pub==pair.pub?"person-circle":"person-circle-outline"} size={25} color={user.pub==pair.pub?colors.primary:colors.subtext} /><Text style={{color:colors.text}}> {user.name}</Text></View>)}
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
                          <Message message={message} mine={message.pub === pair.pub}/>
                      </View>
                  ))}
              </ScrollView>
              <View style={styles.inputBar}>
                  <TextInput style={styles.Chatinput} type="text" placeholder="My message" placeholderTextColor={colors.subtext} value={messageState} onChangeText={setMessage} onSubmitEditing={() => saveMessage()} blurOnSubmit={false} returnKeyType="send"/>
                  <TouchableOpacity style={[styles.sendBtn, !messageState.trim() && {opacity:0.5}]} disabled={!messageState.trim()} onPress={()=> saveMessage()}>
                    <Ionicons name="send" size={20} color={colors.background}></Ionicons>
                  </TouchableOpacity>
              </View>
          </View>
          </KeyboardAvoidingView>
          {ledger && <LedgerSheet hash={ledger.hash} records={ledger.records} messages={ledger.messages} onClose={() => setLedger(null)}/>}
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

