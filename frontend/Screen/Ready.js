//react-native
import { StyleSheet, Text, View, TextInput,KeyboardAvoidingView,TouchableOpacity, ScrollView, Platform} from 'react-native';
import { useState, useEffect } from 'react';
import { Header } from 'react-native-elements';
import Ionicons from '@expo/vector-icons/Ionicons';
import HistoryList from './historylist';
import DesignButton from '../Components/DesignButton';
import axios from 'axios';
import { rooms, entered } from '../lib/gun';
import { API_URL } from '../lib/config';
import { readRoom, makeSecretRoom, saveRoomKey } from '../lib/secretRoom';
import common, { colors } from '../lib/styles';

function Ready({alias,pair,navigation}){
    const [roomState, setRoom] = useState("");
    // name of a room that does not exist yet, while the user picks its type
    const [newRoom, setNewRoom] = useState(null);
    const [secret, setSecret] = useState(false);
    const [roomPassword, setRoomPassword] = useState("");

    // rooms this user has entered, by room name: { name, host }
    const [roomenterinfo, setRoomenterInfo] = useState({});

    useEffect(() => {
        const subscriptions = history()
        return () => subscriptions.forEach((subscription) => subscription.off())
    }, [])

    // rooms this user has entered, read from GUN: the names from the user's entered rooms,
    // the host from the room list. Stays subscribed, so a room appears as soon as it is entered.
    const history=()=>{
      const subscriptions = []
      const watching = {}
      subscriptions.push(entered.get(alias).map().on((isEntered, name) => {
        if(!isEntered || watching[name]) { return }
        watching[name] = true
        setRoomenterInfo((current) => ({...current, [name]: {name: name, host: (current[name] || {}).host}}))
        subscriptions.push(rooms.get(name).on((room) => {
          if(!room) { return }
          setRoomenterInfo((current) => ({...current, [name]: {name: name, host: room.host}}))
        }))
      }))
      return subscriptions
    }

    const enterRoom=(name)=>{
      setRoom("")
      setNewRoom(null)
      navigation.navigate("Chat", { room: name });
    }

    // An existing room opens right away (Chat asks for the password of an encrypted one);
    // a new room first asks whether it is free or encrypted.
    // a room GUN has not synced yet can look new here; createRoom checks the ledger before writing
    const EntranceBtn=async()=>{
      const name = roomState.trim()
      if(!name) { return }
      const info = await readRoom(name)
      if(info && info.host) {
        enterRoom(name)
      } else {
        setNewRoom(name)
        setSecret(false)
        setRoomPassword("")
      }
    }

    const createRoom=async()=>{
      // GUN may not have synced an existing room yet; the ledger has every opened room, so ask it before writing
      let recorded
      try {
        recorded = (await axios.get(`${API_URL}/api/query/${encodeURIComponent(newRoom)}`)).data
      } catch (e) {
        alert("Could not check whether this room exists.\nTry again later.")
        return
      }
      if(recorded !== "None") {
        alert(newRoom + " already exists. Opening it.")
        enterRoom(newRoom)
        return
      }
      let info = { name: newRoom, host: alias, createdAt: Date.now(), secret: false }
      if(secret) {
        if(!roomPassword) { alert("Set a password for the encrypted room."); return }
        const made = await makeSecretRoom(roomPassword)
        info = { ...info, ...made.info }
        await saveRoomKey(newRoom, made.key, pair)
      }
      rooms.get(newRoom).put(info)
      enterRoom(newRoom)
    }

  
  return(
    <KeyboardAvoidingView 
    style = {{ flex: 1 }}
    behavior={Platform.OS === "ios" ? "padding" : null}>

    <Header
        backgroundColor={colors.background}
        containerStyle={common.header}
        leftComponent={{text:"Chat Search",style:common.headerTitle}}
        />
        <View style={[common.screen, styles.screen]} >
          <View style={styles.row}>
          <TextInput  style={[common.input, styles.input]} type="text" placeholder="Room Number" placeholderTextColor={colors.subtext} value={roomState} name="Roomnumber" onChangeText={(text) => { setRoom(text); setNewRoom(null) }}/>
          <TouchableOpacity style={styles.searchBtn} onPress={() => EntranceBtn()}>
              <Ionicons name="search-outline" size={24} color={"white"}/>
          </TouchableOpacity>
          </View>
          {newRoom &&
          <View style={styles.newRoom}>
            <Text style={common.label}>NEW ROOM · {newRoom}</Text>
            <View style={styles.typeRow}>
              {[[false, "chatbubbles-outline", "Free room"], [true, "lock-closed-outline", "Encrypted room"]].map(([value, icon, label]) => (
                <TouchableOpacity key={label} style={[styles.typeBtn, secret === value && styles.typeBtnOn]} onPress={() => setSecret(value)}>
                  <Ionicons name={icon} size={18} color={secret === value ? colors.background : colors.text}/>
                  <Text style={[styles.typeText, secret === value && styles.typeTextOn]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.hint}>{secret
              ? "Messages are encrypted with this password. People join with the password or an invitation. A lost password cannot be recovered."
              : "Anyone who knows the room name can enter."}</Text>
            {secret && <TextInput style={[common.input, styles.password]} secureTextEntry={true} placeholder="Room password" placeholderTextColor={colors.subtext} value={roomPassword} onChangeText={setRoomPassword}/>}
            <View style={styles.typeRow}>
              <DesignButton text="Cancel" buttonFunction={() => setNewRoom(null)} width={110} height={40} bgcolor={colors.primary} color={colors.primary} fontSize={14} outline={true}/>
              <View style={{width:8}}/>
              <DesignButton text="Create room" buttonFunction={() => createRoom()} width={130} height={40} bgcolor={colors.primary} color={colors.background} fontSize={14} outline={false}/>
            </View>
          </View>}
          <View style={{flex:1}}>
            <Text style={[common.label, styles.Textsize3]}>HISTORY · ROOMS YOU ENTERED</Text>
            <ScrollView>
              {Object.keys(roomenterinfo).length === 0 ?
                <Text style={styles.empty}>No rooms yet. Enter a room number above.</Text> :
                Object.values(roomenterinfo).map((room) => (<HistoryList key={room.name} room={room} navigation={navigation} />))
              }
            </ScrollView>
          </View>
        </View>
        </KeyboardAvoidingView>
      )
  }
export default Ready;


const styles = StyleSheet.create({
    screen:{
      paddingHorizontal:20,
      paddingTop:8,
    },
    Textsize3:{
      marginTop:28,
      marginBottom:12,
      paddingBottom:8,
      borderBottomWidth:1,
      borderColor:colors.border,
    },
    empty:{
      color:colors.subtext,
      marginTop:8,
    },
    input: {
      flex:1,
      marginRight:10,
    },
    // the new-room panel under the search bar
    newRoom:{
      marginTop:12,
      padding:14,
      borderRadius:8,
      borderWidth:1,
      borderColor:colors.border,
      backgroundColor:colors.surface,
    },
    typeRow:{
      flexDirection:"row",
      marginTop:10,
    },
    typeBtn:{
      flexDirection:"row",
      alignItems:"center",
      paddingHorizontal:12,
      paddingVertical:8,
      marginRight:8,
      borderRadius:6,
      borderWidth:1,
      borderColor:colors.primary,
    },
    typeBtnOn:{
      backgroundColor:colors.primary,
    },
    typeText:{
      marginLeft:6,
      color:colors.text,
      fontWeight:'600',
    },
    typeTextOn:{
      color:colors.background,
    },
    hint:{
      marginTop:10,
      fontSize:13,
      color:colors.subtext,
    },
    password:{
      marginTop:10,
    },
    searchBtn:{
      width:48,
      height:48,
      borderRadius:8,
      backgroundColor:colors.primary,
      alignItems:"center",
      justifyContent:"center",
    },
    row:{
      flexDirection:"row",
      alignItems:"center",
    },
  });