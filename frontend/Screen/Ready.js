//react-native
import { StyleSheet, Text, View, TextInput,KeyboardAvoidingView,TouchableOpacity, ScrollView, Platform} from 'react-native';
import { useState, useEffect } from 'react';
import { Header } from 'react-native-elements';
import Ionicons from '@expo/vector-icons/Ionicons';
import axios from 'axios';
import HistoryList from './historylist';
import gun from '../lib/gun';
import common, { colors } from '../lib/styles';

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
        // Main already logged in; a second auth while one is running makes GUN answer
        // "User is already being created or authenticated!"
        if(gun.user().is) {
          setCurrentAlias(alias);
        } else {
          authUser()
        }
        history()
        console.log(roomenterinfo)
    }, [])

    // rooms this user has entered: every room on the ledger, then the history of each one
    const history=()=>{
      axios.get(`http://localhost:1206/api/queryallrecords`).then((res) => {
        return Promise.all(res.data.map((room) => axios.get(`http://localhost:1206/api/history/${room.Key}`)))
      }).then((histories) => {
          const Roomhistory=[]
          histories.forEach((res) => {
            res.data.map((records) => {
              if(records.Value.postid === alias && records.Value.function==="enter") {
                Roomhistory.push([records.Value.postid,records.Value.roomnumber])
              }
            })
          })
          setRoomenterInfo(Roomhistory)
        }).catch((err) => {
          console.log("history: "+err.message)
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
        backgroundColor={colors.background}
        leftComponent={{text:"Chat Search",style:{width:400,fontSize:35,color:"black"}}}
        />
        <View style={common.home} >
          <View style={[common.row, styles.row]}>
          <TextInput  style={[common.input, styles.input]} type="text" placeholder="Room Number" value={roomState} name="Roomnumber" onChangeText={(e) => onChangeRoomHandler("RoomState", e)}/>
          <TouchableOpacity onPress={() => EntranceBtn()}>
              <Ionicons name="search-outline" size={35} color={"black"}/>
          </TouchableOpacity>
          </View>
          <View style={{marginTop:"12%",width:"90%"}}>
            <Text style={[common.boldText, styles.Textsize3]}>History </Text>
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
    Textsize3:{
      marginTop:"10%",
      marginBottom:"5%",
      fontSize:20,
    },
    input: {
      backgroundColor:"white",
      borderBottomWidth: 2,
      borderStyle: 'solid',
      width:"80%",
      marginBottom:10,
    },
    row:{
      position:"absolute",
      top:"5%",
      width:"80%",
      justifyContent: "center",
    },
  });