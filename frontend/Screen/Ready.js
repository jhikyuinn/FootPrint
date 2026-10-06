//react-native
import { StyleSheet, Text, View, TextInput,KeyboardAvoidingView,TouchableOpacity, ScrollView, Platform} from 'react-native';
import { useState, useEffect } from 'react';
import { Header } from 'react-native-elements';
import Ionicons from '@expo/vector-icons/Ionicons';
import HistoryList from './historylist';
import gun, { rooms, entered } from '../lib/gun';
import common, { colors } from '../lib/styles';

function Ready({alias,password,pair,navigation}){
    const [roomState, setRoom] = useState("");
    const [currentalias, setCurrentAlias] = useState("");

    // rooms this user has entered, by room name: { name, host }
    const [roomenterinfo, setRoomenterInfo] = useState({});

    const onChangeRoomHandler = (keyvalue,e) => {
        setRoom({
            [keyvalue]: e,
        })
    }

    useEffect(() => {
        // Main already logged in; a second auth while one is running makes GUN answer
        // "User is already being created or authenticated!"
        if(gun.user().is) {
          setCurrentAlias(alias);
        } else {
          authUser()
        }
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
        backgroundColor={colors.background}
        containerStyle={common.header}
        leftComponent={{text:"Chat Search",style:common.headerTitle}}
        />
        <View style={[common.screen, styles.screen]} >
          <View style={styles.row}>
          <TextInput  style={[common.input, styles.input]} type="text" placeholder="Room Number" placeholderTextColor={colors.subtext} value={roomState} name="Roomnumber" onChangeText={(e) => onChangeRoomHandler("RoomState", e)}/>
          <TouchableOpacity style={styles.searchBtn} onPress={() => EntranceBtn()}>
              <Ionicons name="search-outline" size={24} color={"white"}/>
          </TouchableOpacity>
          </View>
          <View style={{flex:1}}>
            <Text style={[common.label, styles.Textsize3]}>HISTORY · ROOMS YOU ENTERED</Text>
            <ScrollView>
              {Object.keys(roomenterinfo).length === 0 ?
                <Text style={styles.empty}>No rooms yet. Enter a room number above.</Text> :
                Object.values(roomenterinfo).map((room) => (<HistoryList key={room.name} room={room} navigation={navigation} alias={alias} pair={pair} />))
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